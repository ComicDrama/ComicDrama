import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChapterEntityExtractionStatus,
  Prisma,
  SourceSegmentType,
  SourceVersionStatus,
  TaskAttemptStatus,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { type ExtractedEntityCandidate } from './chapter-entity-extractor.interface';
import { BuiltinChapterEntityExtractor } from './builtin-chapter-entity-extractor.service';

const TASK_TYPE = 'CHAPTER_ENTITY_EXTRACTION';
const RESOURCE_TYPE = 'SourceSegment';
const WORKER_ID = 'api-chapter-entity-extraction';
const DEFAULT_MAX_ATTEMPTS = 3;

export interface ChapterEntityExtractionTaskView {
  id: string;
  type: string;
  projectId: string;
  resourceType: string | null;
  resourceId: string | null;
  inputVersion: string | null;
  idempotencyKey: string;
  status: TaskStatus;
  attempt: number;
  maxAttempts: number;
  traceId: string | null;
  result: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
  attempts: Array<{
    id: string;
    attempt: number;
    status: TaskAttemptStatus;
    retryable: boolean;
    errorCode: string | null;
    errorMessage: string | null;
    startedAt: Date;
    finishedAt: Date | null;
  }>;
}

export interface ChapterEntityExtractionView {
  id: string;
  projectId: string;
  sourceDocumentId: string;
  sourceVersionId: string;
  chapter: {
    id: string;
    title: string | null;
    ordinal: number;
    startOffset: number;
    endOffset: number;
    startLine: number | null;
    endLine: number | null;
  };
  extractor: { name: string; version: string; method: 'deterministic-rule' };
  status: ChapterEntityExtractionStatus;
  errorMessage: string | null;
  extractedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  summary: { entityCount: number; mentionCount: number; byType: Record<string, number> };
  entities: Array<{
    id: string;
    type: string;
    name: string;
    normalizedName: string;
    description: string | null;
    attributes: unknown;
    confidence: number | null;
    ordinal: number;
    mentions: Array<{
      id: string;
      sourceSegmentId: string;
      text: string;
      startOffset: number;
      endOffset: number;
      startLine: number | null;
      endLine: number | null;
      evidence: string | null;
      confidence: number | null;
      ordinal: number;
    }>;
  }>;
}

@Injectable()
export class ChapterEntityExtractionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: BuiltinChapterEntityExtractor,
  ) {}

  async request(
    projectId: string,
    documentId: string,
    versionId: string,
    chapterSegmentId: string,
    traceId?: string,
  ): Promise<ChapterEntityExtractionTaskView> {
    const context = await this.findChapter(projectId, documentId, versionId, chapterSegmentId);
    const idempotencyKey = `${TASK_TYPE}:${versionId}:${chapterSegmentId}:${this.extractor.version}`;
    let task = await this.prisma.task.findUnique({ where: { idempotencyKey } });

    await this.prisma.chapterEntityExtraction.upsert({
      where: {
        sourceVersionId_chapterSegmentId_extractorName_extractorVersion: {
          sourceVersionId: versionId,
          chapterSegmentId,
          extractorName: this.extractor.name,
          extractorVersion: this.extractor.version,
        },
      },
      create: {
        projectId,
        sourceDocumentId: documentId,
        sourceVersionId: versionId,
        chapterSegmentId,
        extractorName: this.extractor.name,
        extractorVersion: this.extractor.version,
      },
      update: {},
    });

    if (!task) {
      try {
        task = await this.prisma.task.create({
          data: {
            projectId,
            type: TASK_TYPE,
            resourceType: RESOURCE_TYPE,
            resourceId: chapterSegmentId,
            inputVersion: String(context.version.version),
            idempotencyKey,
            maxAttempts: DEFAULT_MAX_ATTEMPTS,
            traceId,
            payload: {
              documentId,
              versionId,
              chapterSegmentId,
              extractorName: this.extractor.name,
              extractorVersion: this.extractor.version,
            },
          },
        });
      } catch (error) {
        if (!this.isUniqueViolation(error)) throw error;
        task = await this.prisma.task.findUnique({ where: { idempotencyKey } });
      }
    }
    if (!task) throw new NotFoundException('章节实体提取任务创建后无法读取');
    if (task.status === TaskStatus.PENDING) {
      await this.execute(task.id, projectId, documentId, versionId, chapterSegmentId, traceId);
    }
    return this.getTask(projectId, task.id);
  }

  async getTask(projectId: string, taskId: string): Promise<ChapterEntityExtractionTaskView> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, type: TASK_TYPE },
      include: { attempts: { orderBy: { attempt: 'desc' } } },
    });
    if (!task) throw new NotFoundException('章节实体提取任务不存在或不属于当前项目');
    return this.toTaskView(task);
  }

  async retry(
    projectId: string,
    taskId: string,
    traceId?: string,
  ): Promise<ChapterEntityExtractionTaskView> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, type: TASK_TYPE },
      include: { attempts: { orderBy: { attempt: 'desc' }, take: 1 } },
    });
    if (!task) throw new NotFoundException('章节实体提取任务不存在或不属于当前项目');
    if (task.status === TaskStatus.SUCCEEDED || task.status === TaskStatus.RUNNING) {
      return this.getTask(projectId, task.id);
    }
    if (!isRetryable(task.status)) {
      throw new BadRequestException(`当前任务状态 ${task.status} 不允许重试`);
    }
    if (task.attempt >= task.maxAttempts) throw new BadRequestException('任务已达到最大重试次数');
    if (task.attempts[0] && !task.attempts[0].retryable) {
      throw new BadRequestException('上一次失败不可重试，请检查任务错误信息');
    }

    const payload = readPayload(task.payload);
    if (
      !task.resourceId ||
      !payload.documentId ||
      !payload.versionId ||
      !payload.chapterSegmentId
    ) {
      throw new BadRequestException('任务缺少章节实体提取所需资源');
    }
    const reset = await this.prisma.task.updateMany({
      where: { id: task.id, status: task.status, attempt: task.attempt },
      data: { status: TaskStatus.RETRYING, errorCode: null, errorMessage: null, traceId },
    });
    if (reset.count > 0) {
      await this.execute(
        task.id,
        projectId,
        payload.documentId,
        payload.versionId,
        payload.chapterSegmentId,
        traceId,
      );
    }
    return this.getTask(projectId, task.id);
  }

  async getExtraction(
    projectId: string,
    documentId: string,
    versionId: string,
    chapterSegmentId: string,
  ): Promise<ChapterEntityExtractionView> {
    await this.findChapter(projectId, documentId, versionId, chapterSegmentId);
    const extraction = await this.prisma.chapterEntityExtraction.findFirst({
      where: {
        projectId,
        sourceDocumentId: documentId,
        sourceVersionId: versionId,
        chapterSegmentId,
        extractorName: this.extractor.name,
        extractorVersion: this.extractor.version,
      },
      include: {
        chapterSegment: true,
        entities: {
          orderBy: { ordinal: 'asc' },
          include: { mentions: { orderBy: { ordinal: 'asc' } } },
        },
      },
    });
    if (!extraction) throw new NotFoundException('该章节尚未创建实体提取结果');
    const byType: Record<string, number> = {};
    let mentionCount = 0;
    for (const entity of extraction.entities) {
      byType[entity.type] = (byType[entity.type] ?? 0) + 1;
      mentionCount += entity.mentions.length;
    }
    return {
      id: extraction.id,
      projectId: extraction.projectId,
      sourceDocumentId: extraction.sourceDocumentId,
      sourceVersionId: extraction.sourceVersionId,
      chapter: pickChapter(extraction.chapterSegment),
      extractor: {
        name: extraction.extractorName,
        version: extraction.extractorVersion,
        method: 'deterministic-rule',
      },
      status: extraction.status,
      errorMessage: extraction.errorMessage,
      extractedAt: extraction.extractedAt,
      createdAt: extraction.createdAt,
      updatedAt: extraction.updatedAt,
      summary: { entityCount: extraction.entities.length, mentionCount, byType },
      entities: extraction.entities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        name: entity.name,
        normalizedName: entity.normalizedName,
        description: entity.description,
        attributes: entity.attributes,
        confidence: entity.confidence,
        ordinal: entity.ordinal,
        mentions: entity.mentions.map((mention) => ({
          id: mention.id,
          sourceSegmentId: mention.sourceSegmentId,
          text: mention.text,
          startOffset: mention.startOffset,
          endOffset: mention.endOffset,
          startLine: mention.startLine,
          endLine: mention.endLine,
          evidence: mention.evidence,
          confidence: mention.confidence,
          ordinal: mention.ordinal,
        })),
      })),
    };
  }

  private async execute(
    taskId: string,
    projectId: string,
    documentId: string,
    versionId: string,
    chapterSegmentId: string,
    traceId?: string,
  ): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, type: TASK_TYPE },
    });
    if (!task || !isRunnable(task.status)) return;
    const nextAttempt = task.attempt + 1;
    const claimed = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.updateMany({
        where: { id: task.id, status: task.status, attempt: task.attempt },
        data: {
          status: TaskStatus.RUNNING,
          attempt: nextAttempt,
          startedAt: new Date(),
          completedAt: null,
          lockedBy: WORKER_ID,
          lockedAt: new Date(),
          heartbeatAt: new Date(),
          traceId,
        },
      });
      if (updated.count === 0) return false;
      await tx.taskAttempt.create({
        data: {
          taskId: task.id,
          attempt: nextAttempt,
          workerId: WORKER_ID,
          traceId,
          input: {
            projectId,
            documentId,
            versionId,
            chapterSegmentId,
            extractorVersion: this.extractor.version,
          },
        },
      });
      await tx.chapterEntityExtraction.updateMany({
        where: {
          projectId,
          sourceDocumentId: documentId,
          sourceVersionId: versionId,
          chapterSegmentId,
          extractorName: this.extractor.name,
          extractorVersion: this.extractor.version,
        },
        data: { status: ChapterEntityExtractionStatus.RUNNING, errorMessage: null },
      });
      return true;
    });
    if (!claimed) return;

    try {
      const context = await this.findChapter(projectId, documentId, versionId, chapterSegmentId);
      const candidates = this.extractor.extract(context.paragraphs);
      const result = await this.replaceExtraction(context, candidates);
      await this.prisma.$transaction(async (tx) => {
        await tx.taskAttempt.update({
          where: { taskId_attempt: { taskId, attempt: nextAttempt } },
          data: {
            status: TaskAttemptStatus.SUCCEEDED,
            output: result as Prisma.InputJsonValue,
            finishedAt: new Date(),
            heartbeatAt: new Date(),
          },
        });
        await tx.task.update({
          where: { id: taskId },
          data: {
            status: TaskStatus.SUCCEEDED,
            result: result as Prisma.InputJsonValue,
            errorCode: null,
            errorMessage: null,
            completedAt: new Date(),
            lockedBy: null,
            lockedAt: null,
            heartbeatAt: null,
          },
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      const retryable = !(error instanceof HttpException);
      const errorCode =
        error instanceof HttpException
          ? `HTTP_${error.getStatus()}`
          : 'CHAPTER_ENTITY_EXTRACTION_FAILED';
      const status =
        retryable && nextAttempt < task.maxAttempts ? TaskStatus.RETRYING : TaskStatus.FAILED;
      await this.prisma.$transaction(async (tx) => {
        await tx.chapterEntityExtraction.updateMany({
          where: {
            projectId,
            sourceDocumentId: documentId,
            sourceVersionId: versionId,
            chapterSegmentId,
            extractorName: this.extractor.name,
            extractorVersion: this.extractor.version,
          },
          data: { status: ChapterEntityExtractionStatus.FAILED, errorMessage: message },
        });
        await tx.taskAttempt.update({
          where: { taskId_attempt: { taskId, attempt: nextAttempt } },
          data: {
            status: TaskAttemptStatus.FAILED,
            errorCode,
            errorMessage: message,
            retryable,
            finishedAt: new Date(),
            heartbeatAt: new Date(),
          },
        });
        await tx.task.update({
          where: { id: taskId },
          data: {
            status,
            errorCode,
            errorMessage: message,
            completedAt: status === TaskStatus.FAILED ? new Date() : null,
            lockedBy: null,
            lockedAt: null,
            heartbeatAt: null,
          },
        });
      });
    }
  }

  private async replaceExtraction(
    context: Awaited<ReturnType<ChapterEntityExtractionService['findChapter']>>,
    candidates: ExtractedEntityCandidate[],
  ): Promise<{
    extractionId: string;
    entityCount: number;
    mentionCount: number;
    extractor: string;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const extraction = await tx.chapterEntityExtraction.findFirst({
        where: {
          sourceVersionId: context.version.id,
          chapterSegmentId: context.chapter.id,
          extractorName: this.extractor.name,
          extractorVersion: this.extractor.version,
        },
      });
      if (!extraction) throw new NotFoundException('章节实体提取结果不存在');
      await tx.extractedEntity.deleteMany({ where: { extractionId: extraction.id } });
      let mentionCount = 0;
      for (const [entityOrdinal, candidate] of candidates.entries()) {
        const entity = await tx.extractedEntity.create({
          data: {
            extractionId: extraction.id,
            type: candidate.type,
            name: candidate.name,
            normalizedName: candidate.normalizedName,
            attributes: candidate.attributes as Prisma.InputJsonValue,
            confidence: candidate.confidence,
            ordinal: entityOrdinal + 1,
          },
        });
        await tx.extractedEntityMention.createMany({
          data: candidate.mentions.map((mention, mentionOrdinal) => ({
            extractedEntityId: entity.id,
            sourceSegmentId: mention.sourceSegmentId,
            text: mention.text,
            startOffset: mention.startOffset,
            endOffset: mention.endOffset,
            startLine: mention.startLine,
            endLine: mention.endLine,
            evidence: mention.evidence,
            confidence: mention.confidence,
            ordinal: mentionOrdinal + 1,
          })),
        });
        mentionCount += candidate.mentions.length;
      }
      await tx.chapterEntityExtraction.update({
        where: { id: extraction.id },
        data: {
          status: ChapterEntityExtractionStatus.SUCCEEDED,
          errorMessage: null,
          extractedAt: new Date(),
        },
      });
      return {
        extractionId: extraction.id,
        entityCount: candidates.length,
        mentionCount,
        extractor: `${this.extractor.name}@${this.extractor.version}`,
      };
    });
  }

  private async findChapter(
    projectId: string,
    documentId: string,
    versionId: string,
    chapterSegmentId: string,
  ) {
    const version = await this.prisma.sourceDocumentVersion.findFirst({
      where: { id: versionId, documentId, document: { projectId } },
      select: { id: true, documentId: true, version: true, status: true },
    });
    if (!version) throw new NotFoundException('原文版本不存在或不属于当前项目');
    if (version.status !== SourceVersionStatus.READY) {
      throw new BadRequestException(`原文尚未完成解析，当前状态为 ${version.status}`);
    }
    const segments = await this.prisma.sourceSegment.findMany({
      where: { versionId },
      select: {
        id: true,
        parentId: true,
        type: true,
        ordinal: true,
        title: true,
        content: true,
        startOffset: true,
        endOffset: true,
        startLine: true,
        endLine: true,
      },
      orderBy: { ordinal: 'asc' },
    });
    const chapter = segments.find((segment) => segment.id === chapterSegmentId);
    if (!chapter) throw new NotFoundException('章节不存在或不属于当前原文版本');
    if (chapter.type !== SourceSegmentType.CHAPTER)
      throw new BadRequestException('entity-extractions 仅支持 CHAPTER 类型来源节点');
    const byId = new Map(segments.map((segment) => [segment.id, segment]));
    const paragraphs = segments
      .filter(
        (segment) =>
          segment.type === SourceSegmentType.PARAGRAPH &&
          isDescendant(segment.id, chapter.id, byId),
      )
      .map((segment) => ({
        id: segment.id,
        content: segment.content,
        startOffset: segment.startOffset,
        startLine: segment.startLine,
      }));
    if (paragraphs.length === 0) throw new BadRequestException('章节没有可提取的段落');
    return { version, chapter, paragraphs };
  }

  private toTaskView(
    task: Prisma.TaskGetPayload<{ include: { attempts: true } }>,
  ): ChapterEntityExtractionTaskView {
    return {
      id: task.id,
      type: task.type,
      projectId: task.projectId,
      resourceType: task.resourceType,
      resourceId: task.resourceId,
      inputVersion: task.inputVersion,
      idempotencyKey: task.idempotencyKey,
      status: task.status,
      attempt: task.attempt,
      maxAttempts: task.maxAttempts,
      traceId: task.traceId,
      result: task.result,
      errorCode: task.errorCode,
      errorMessage: task.errorMessage,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      updatedAt: task.updatedAt,
      attempts: task.attempts.map((attempt) => ({
        id: attempt.id,
        attempt: attempt.attempt,
        status: attempt.status,
        retryable: attempt.retryable,
        errorCode: attempt.errorCode,
        errorMessage: attempt.errorMessage,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
      })),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}

function isDescendant(
  segmentId: string,
  chapterId: string,
  byId: Map<string, { parentId: string | null }>,
): boolean {
  let current = byId.get(segmentId);
  while (current?.parentId) {
    if (current.parentId === chapterId) return true;
    current = byId.get(current.parentId);
  }
  return false;
}

function pickChapter(chapter: {
  id: string;
  title: string | null;
  ordinal: number;
  startOffset: number;
  endOffset: number;
  startLine: number | null;
  endLine: number | null;
}) {
  return {
    id: chapter.id,
    title: chapter.title,
    ordinal: chapter.ordinal,
    startOffset: chapter.startOffset,
    endOffset: chapter.endOffset,
    startLine: chapter.startLine,
    endLine: chapter.endLine,
  };
}

function readPayload(payload: Prisma.JsonValue | null): {
  documentId?: string;
  versionId?: string;
  chapterSegmentId?: string;
} {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const value = payload as Record<string, unknown>;
  return {
    documentId: typeof value.documentId === 'string' ? value.documentId : undefined,
    versionId: typeof value.versionId === 'string' ? value.versionId : undefined,
    chapterSegmentId:
      typeof value.chapterSegmentId === 'string' ? value.chapterSegmentId : undefined,
  };
}

function isRetryable(status: TaskStatus): status is 'FAILED' | 'RETRYING' {
  return status === TaskStatus.FAILED || status === TaskStatus.RETRYING;
}

function isRunnable(status: TaskStatus): status is 'PENDING' | 'RETRYING' {
  return status === TaskStatus.PENDING || status === TaskStatus.RETRYING;
}
