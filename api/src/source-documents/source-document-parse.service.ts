import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SourceDocumentStatus, SourceSegmentType, SourceVersionStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { ObjectStorageService } from './object-storage.service';
import { SourceDocumentParserRegistryService } from './source-document-parser-registry.service';
import { type ParsedSourceSegment } from './source-document-parser.interface';

export interface ParsedSourceVersionResult {
  documentId: string;
  versionId: string;
  version: number;
  status: SourceVersionStatus;
  parserName: string;
  parserVersion: string;
  textLength: number;
  segmentCount: number;
  segmentsByType: Record<SourceSegmentType, number>;
}

@Injectable()
export class SourceDocumentParseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService,
    private readonly parserRegistry: SourceDocumentParserRegistryService,
  ) {}

  async parseVersion(
    projectId: string,
    documentId: string,
    versionId: string,
  ): Promise<ParsedSourceVersionResult> {
    const version = await this.prisma.sourceDocumentVersion.findFirst({
      where: {
        id: versionId,
        documentId,
        document: { projectId },
      },
      include: { document: true },
    });
    if (!version) {
      throw new NotFoundException('原文版本不存在或不属于当前项目');
    }

    await this.markParsing(projectId, version.documentId, version.id);

    try {
      const parser = this.parserRegistry.getParser(version.document.documentType);
      const object = await this.objectStorage.getObject(version.storageKey);
      const text = object.toString('utf8');
      const parsed = parser.parse(text);
      return await this.persistParsedVersion({
        projectId,
        documentId,
        versionId,
        version: version.version,
        parserName: parser.name,
        parserVersion: parser.version,
        ...parsed,
      });
    } catch (error) {
      await this.markFailed(version.documentId, version.id, this.describeError(error));
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(`原文解析失败: ${this.describeError(error)}`);
    }
  }

  private async markParsing(
    projectId: string,
    documentId: string,
    versionId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const segmentIds = await tx.sourceSegment.findMany({
        where: { versionId },
        select: { id: true },
      });
      const staleSegmentIds = segmentIds.map((segment) => segment.id);

      // A re-parse invalidates all P3-08 through P3-11 results tied to the old segments.
      // Keep the restrictive source-segment foreign keys as a safety net and clear dependents first.
      await tx.task.deleteMany({
        where: {
          projectId,
          type: 'CHAPTER_ENTITY_EXTRACTION',
          resourceType: 'SourceSegment',
          resourceId: { in: staleSegmentIds },
        },
      });
      await tx.task.deleteMany({
        where: {
          projectId,
          type: { in: ['CROSS_CHAPTER_ENTITY_RESOLUTION', 'SOURCE_VERSION_NARRATIVE_STRUCTURE'] },
          resourceType: 'SourceDocumentVersion',
          resourceId: versionId,
        },
      });
      await tx.sourceDraftGeneration.deleteMany({ where: { sourceVersionId: versionId } });
      await tx.narrativeStructure.deleteMany({ where: { sourceVersionId: versionId } });
      await tx.sourceVersionEntityResolution.deleteMany({ where: { sourceVersionId: versionId } });
      await tx.chapterEntityExtraction.deleteMany({ where: { sourceVersionId: versionId } });
      await tx.sourceSegment.deleteMany({ where: { versionId } });
      await tx.sourceDocumentVersion.update({
        where: { id: versionId },
        data: {
          status: SourceVersionStatus.PARSING,
          textContent: null,
          parserName: null,
          parserVersion: null,
          parsedAt: null,
          errorMessage: null,
        },
      });
      await tx.sourceDocument.update({
        where: { id: documentId },
        data: { status: SourceDocumentStatus.IMPORTING },
      });
    });
  }

  private async persistParsedVersion(input: {
    projectId: string;
    documentId: string;
    versionId: string;
    version: number;
    parserName: string;
    parserVersion: string;
    textContent: string;
    segments: ParsedSourceSegment[];
  }): Promise<ParsedSourceVersionResult> {
    return this.prisma.$transaction(async (tx) => {
      const createdIds: string[] = [];
      const counts: Record<SourceSegmentType, number> = {
        [SourceSegmentType.DOCUMENT]: 0,
        [SourceSegmentType.CHAPTER]: 0,
        [SourceSegmentType.SECTION]: 0,
        [SourceSegmentType.PARAGRAPH]: 0,
      };

      for (const segment of input.segments) {
        const created = await tx.sourceSegment.create({
          data: {
            versionId: input.versionId,
            parentId:
              segment.parentIndex === undefined ? undefined : createdIds[segment.parentIndex],
            type: segment.type,
            ordinal: createdIds.length,
            title: segment.title,
            content: segment.content,
            startOffset: segment.startOffset,
            endOffset: segment.endOffset,
            startLine: segment.startLine,
            endLine: segment.endLine,
            metadata: segment.metadata,
          },
        });
        createdIds.push(created.id);
        counts[segment.type] += 1;
      }

      await tx.sourceDocumentVersion.update({
        where: { id: input.versionId },
        data: {
          textContent: input.textContent,
          parserName: input.parserName,
          parserVersion: input.parserVersion,
          status: SourceVersionStatus.READY,
          errorMessage: null,
          parsedAt: new Date(),
        },
      });
      await tx.sourceDocument.update({
        where: { id: input.documentId },
        data: { status: SourceDocumentStatus.READY },
      });

      return {
        documentId: input.documentId,
        versionId: input.versionId,
        version: input.version,
        status: SourceVersionStatus.READY,
        parserName: input.parserName,
        parserVersion: input.parserVersion,
        textLength: input.textContent.length,
        segmentCount: createdIds.length,
        segmentsByType: counts,
      };
    });
  }

  private async markFailed(documentId: string, versionId: string, message: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.sourceDocumentVersion.update({
          where: { id: versionId },
          data: { status: SourceVersionStatus.FAILED, errorMessage: message, parsedAt: null },
        });
        await tx.sourceDocument.update({
          where: { id: documentId },
          data: { status: SourceDocumentStatus.FAILED },
        });
      });
    } catch {
      // Preserve the original parse error when the failure status itself cannot be persisted.
    }
  }

  private describeError(error: unknown): string {
    return error instanceof Error ? error.message : '未知错误';
  }
}
