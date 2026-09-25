import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SourceVersionStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

const DEFAULT_CONTEXT = 160;
const MAX_CONTEXT = 2000;

export interface SourceDraftCitationSource {
  id: string;
  sourceSegmentId: string;
  quote: string;
  startOffset: number;
  endOffset: number;
  startLine: number | null;
  endLine: number | null;
  evidenceType: string;
  confidence: number | null;
  quoteMatch: 'MATCH' | 'MISMATCH' | 'OUT_OF_RANGE';
  actualQuote: string | null;
  sourceSegment: {
    id: string;
    type: string;
    ordinal: number;
    title: string | null;
    startOffset: number;
    endOffset: number;
    startLine: number | null;
    endLine: number | null;
  };
  context: {
    text: string;
    startOffset: number;
    endOffset: number;
    citationStartOffset: number;
    citationEndOffset: number;
  };
}

@Injectable()
export class SourceDraftSourceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSources(
    projectId: string,
    documentId: string,
    versionId: string,
    draftEntityId: string,
    options: { contextBefore?: string; contextAfter?: string },
  ) {
    validateUuidParam(projectId, 'projectId');
    validateUuidParam(documentId, 'documentId');
    validateUuidParam(versionId, 'versionId');
    validateUuidParam(draftEntityId, 'draftEntityId');
    const contextBefore = parseContext(options.contextBefore, 'contextBefore');
    const contextAfter = parseContext(options.contextAfter, 'contextAfter');
    const entity = await this.prisma.sourceDraftEntity.findFirst({
      where: {
        id: draftEntityId,
        generation: { projectId, sourceDocumentId: documentId, sourceVersionId: versionId },
      },
      include: {
        generation: {
          select: { id: true, generatorName: true, generatorVersion: true, status: true },
        },
        citations: {
          orderBy: [{ sourceSegmentId: 'asc' }, { startOffset: 'asc' }],
          include: { sourceSegment: true },
        },
      },
    });
    if (!entity) throw new NotFoundException('初稿实体不存在或不属于当前原文版本');

    const version = await this.prisma.sourceDocumentVersion.findFirst({
      where: { id: versionId, documentId, document: { projectId } },
      select: { id: true, version: true, status: true, textContent: true },
    });
    if (!version) throw new NotFoundException('原文版本不存在或不属于当前项目');
    if (version.status !== SourceVersionStatus.READY) {
      throw new BadRequestException(`原文尚未完成解析，当前状态为 ${version.status}`);
    }
    const text = version.textContent ?? '';
    return {
      draftEntity: {
        id: entity.id,
        kind: entity.kind,
        name: entity.name,
        content: entity.content,
        validationStatus: entity.validationStatus,
      },
      generation: entity.generation,
      sources: entity.citations.map((citation) => {
        const valid =
          Number.isSafeInteger(citation.startOffset) &&
          Number.isSafeInteger(citation.endOffset) &&
          citation.startOffset >= 0 &&
          citation.endOffset >= citation.startOffset &&
          citation.endOffset <= text.length;
        const extracted = valid ? text.slice(citation.startOffset, citation.endOffset) : null;
        const expectedQuote = citation.quote.startsWith('词典命中：')
          ? citation.quote.slice('词典命中：'.length)
          : citation.quote;
        const quoteMatch = !valid
          ? 'OUT_OF_RANGE'
          : extracted === expectedQuote
            ? 'MATCH'
            : 'MISMATCH';
        const start = valid ? Math.max(0, citation.startOffset - contextBefore) : 0;
        const end = valid ? Math.min(text.length, citation.endOffset + contextAfter) : 0;
        return {
          id: citation.id,
          sourceSegmentId: citation.sourceSegmentId,
          quote: citation.quote,
          startOffset: citation.startOffset,
          endOffset: citation.endOffset,
          startLine: citation.startLine,
          endLine: citation.endLine,
          evidenceType: citation.evidenceType,
          confidence: citation.confidence,
          quoteMatch,
          actualQuote: extracted,
          sourceSegment: {
            id: citation.sourceSegment.id,
            type: citation.sourceSegment.type,
            ordinal: citation.sourceSegment.ordinal,
            title: citation.sourceSegment.title,
            startOffset: citation.sourceSegment.startOffset,
            endOffset: citation.sourceSegment.endOffset,
            startLine: citation.sourceSegment.startLine,
            endLine: citation.sourceSegment.endLine,
          },
          context: {
            text: valid ? text.slice(start, end) : '',
            startOffset: start,
            endOffset: end,
            citationStartOffset: citation.startOffset,
            citationEndOffset: citation.endOffset,
          },
        } satisfies SourceDraftCitationSource;
      }),
    };
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function validateUuidParam(value: string, fieldName: string): void {
  if (!isUuid(value)) throw new BadRequestException(`${fieldName} 必须是合法 UUID`);
}

function parseContext(value: string | undefined, fieldName: string): number {
  if (value === undefined) return DEFAULT_CONTEXT;
  if (!/^\d+$/.test(value)) throw new BadRequestException(`${fieldName} 必须是非负整数`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > MAX_CONTEXT) {
    throw new BadRequestException(`${fieldName} 必须位于 0 到 ${MAX_CONTEXT} 之间`);
  }
  return parsed;
}
