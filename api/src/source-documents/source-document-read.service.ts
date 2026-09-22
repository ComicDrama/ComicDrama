import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SourceSegmentType, SourceVersionStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

const DEFAULT_PREVIEW_LENGTH = 2_000;
const MAX_PREVIEW_LENGTH = 10_000;

export interface SourceSegmentSummary {
  id: string;
  type: SourceSegmentType;
  ordinal: number;
  title: string | null;
  content: string;
  startOffset: number;
  endOffset: number;
  startLine: number | null;
  endLine: number | null;
  parentId: string | null;
}

export interface SourceDocumentPreview {
  documentId: string;
  versionId: string;
  version: number;
  status: SourceVersionStatus;
  textLength: number;
  startOffset: number;
  endOffset: number;
  content: string;
  segment: SourceSegmentSummary | null;
}

export interface SourceSegmentLocation extends SourceSegmentSummary {
  ancestors: SourceSegmentSummary[];
  children: SourceSegmentSummary[];
}

@Injectable()
export class SourceDocumentReadService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreview(
    projectId: string,
    documentId: string,
    versionId: string,
    options: { segmentId?: string; startOffset?: string; endOffset?: string },
  ): Promise<SourceDocumentPreview> {
    const version = await this.getVersion(projectId, documentId, versionId);
    this.assertReady(version.status);

    const text = version.textContent ?? '';
    const selectedSegment = options.segmentId
      ? await this.getSegmentForVersion(versionId, options.segmentId)
      : null;
    const startOffset = selectedSegment
      ? selectedSegment.startOffset
      : parseOffset(options.startOffset, 0, text.length, 'startOffset');
    const requestedEndOffset = selectedSegment
      ? selectedSegment.endOffset
      : parseOffset(
          options.endOffset,
          Math.min(startOffset + DEFAULT_PREVIEW_LENGTH, text.length),
          text.length,
          'endOffset',
        );
    const endOffset = Math.max(startOffset, requestedEndOffset);

    if (endOffset - startOffset > MAX_PREVIEW_LENGTH) {
      throw new BadRequestException(`预览范围不能超过 ${MAX_PREVIEW_LENGTH} 个 UTF-16 code unit`);
    }

    return {
      documentId,
      versionId,
      version: version.version,
      status: version.status,
      textLength: text.length,
      startOffset,
      endOffset,
      content: text.slice(startOffset, endOffset),
      segment: selectedSegment ? this.toSummary(selectedSegment) : null,
    };
  }

  async listSegments(
    projectId: string,
    documentId: string,
    versionId: string,
    options: { type?: string; parentId?: string; offset?: string },
  ): Promise<{ documentId: string; versionId: string; segments: SourceSegmentSummary[] }> {
    const version = await this.getVersion(projectId, documentId, versionId);
    this.assertReady(version.status);
    const type = parseSegmentType(options.type);
    const offset =
      options.offset === undefined
        ? undefined
        : parseOffset(options.offset, 0, (version.textContent ?? '').length, 'offset');
    const segments = await this.prisma.sourceSegment.findMany({
      where: {
        versionId,
        ...(type ? { type } : {}),
        ...(options.parentId ? { parentId: options.parentId } : {}),
        ...(offset === undefined
          ? {}
          : { startOffset: { lte: offset }, endOffset: { gt: offset } }),
      },
      orderBy: { ordinal: 'asc' },
    });
    const ordered =
      offset === undefined
        ? segments
        : [...segments].sort((a, b) => {
            const aSize = a.endOffset - a.startOffset;
            const bSize = b.endOffset - b.startOffset;
            return aSize - bSize || a.ordinal - b.ordinal;
          });
    return {
      documentId,
      versionId,
      segments: ordered.map((segment) => this.toSummary(segment)),
    };
  }

  async getSegment(
    projectId: string,
    documentId: string,
    versionId: string,
    segmentId: string,
  ): Promise<SourceSegmentLocation> {
    const version = await this.getVersion(projectId, documentId, versionId);
    this.assertReady(version.status);
    const segment = await this.getSegmentForVersion(versionId, segmentId);
    const allSegments = await this.prisma.sourceSegment.findMany({
      where: { versionId },
      orderBy: { ordinal: 'asc' },
    });
    const byId = new Map(allSegments.map((item) => [item.id, item]));
    const ancestors: SourceSegmentSummary[] = [];
    let parentId = segment.parentId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) break;
      ancestors.unshift(this.toSummary(parent));
      parentId = parent.parentId;
    }
    return {
      ...this.toSummary(segment),
      ancestors,
      children: allSegments
        .filter((item) => item.parentId === segment.id)
        .map((item) => this.toSummary(item)),
    };
  }

  private async getVersion(projectId: string, documentId: string, versionId: string) {
    const version = await this.prisma.sourceDocumentVersion.findFirst({
      where: { id: versionId, documentId, document: { projectId } },
      select: {
        id: true,
        documentId: true,
        version: true,
        status: true,
        textContent: true,
      },
    });
    if (!version) {
      throw new NotFoundException('原文版本不存在或不属于当前项目');
    }
    return version;
  }

  private async getSegmentForVersion(versionId: string, segmentId: string) {
    const segment = await this.prisma.sourceSegment.findFirst({
      where: { id: segmentId, versionId },
    });
    if (!segment) {
      throw new NotFoundException('来源段落不存在或不属于当前原文版本');
    }
    return segment;
  }

  private assertReady(status: SourceVersionStatus): void {
    if (status !== SourceVersionStatus.READY) {
      throw new BadRequestException(`原文尚未完成解析，当前状态为 ${status}`);
    }
  }

  private toSummary(segment: {
    id: string;
    type: SourceSegmentType;
    ordinal: number;
    title: string | null;
    content: string;
    startOffset: number;
    endOffset: number;
    startLine: number | null;
    endLine: number | null;
    parentId: string | null;
  }): SourceSegmentSummary {
    return {
      id: segment.id,
      type: segment.type,
      ordinal: segment.ordinal,
      title: segment.title,
      content: segment.content,
      startOffset: segment.startOffset,
      endOffset: segment.endOffset,
      startLine: segment.startLine,
      endLine: segment.endLine,
      parentId: segment.parentId,
    };
  }
}

function parseOffset(
  value: string | undefined,
  fallback: number,
  textLength: number,
  fieldName: string,
): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new BadRequestException(`${fieldName} 必须是非负整数`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > textLength) {
    throw new BadRequestException(`${fieldName} 必须位于 0 到 ${textLength} 之间`);
  }
  return parsed;
}

function parseSegmentType(value: string | undefined): SourceSegmentType | undefined {
  if (value === undefined) return undefined;
  if (!Object.values(SourceSegmentType).includes(value as SourceSegmentType)) {
    throw new BadRequestException(
      `type 必须是 ${Object.values(SourceSegmentType).join('、')} 之一`,
    );
  }
  return value as SourceSegmentType;
}
