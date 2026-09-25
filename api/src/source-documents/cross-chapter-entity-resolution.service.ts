import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  SourceVersionEntityResolutionStatus,
  SourceVersionStatus,
  TaskAttemptStatus,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { BuiltinEntityNormalizer } from './builtin-entity-normalizer.service';

const TASK_TYPE = 'CROSS_CHAPTER_ENTITY_RESOLUTION';
const RESOURCE_TYPE = 'SourceDocumentVersion';
const WORKER_ID = 'api-cross-chapter-entity-resolution';
const DEFAULT_MAX_ATTEMPTS = 3;

type TaskWithAttempts = Prisma.TaskGetPayload<{ include: { attempts: true } }>;

export interface EntityResolutionTaskView {
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

export interface EntityResolutionView {
  id: string;
  projectId: string;
  sourceDocumentId: string;
  sourceVersionId: string;
  normalizer: { name: string; version: string; scope: 'surface-form-and-time-clock' };
  status: SourceVersionEntityResolutionStatus;
  errorMessage: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  summary: {
    canonicalEntityCount: number;
    candidateEntityCount: number;
    aliasCount: number;
    byType: Record<string, number>;
  };
  entities: Array<{
    id: string;
    type: string;
    canonicalName: string;
    normalizedName: string;
    confidence: number | null;
    metadata: unknown;
    ordinal: number;
    aliases: Array<{
      id: string;
      name: string;
      normalizedName: string;
      isCanonical: boolean;
      occurrenceCount: number;
    }>;
    members: Array<{
      id: string;
      extractedEntityId: string;
      extractedName: string;
      extractionId: string;
      chapterSegmentId: string;
      matchMethod: string;
      confidence: number | null;
    }>;
  }>;
}

interface ResolutionCandidate {
  id: string;
  type: Parameters<BuiltinEntityNormalizer['normalize']>[0];
  name: string;
  confidence: number | null;
  mentionCount: number;
  extractionId: string;
  chapterSegmentId: string;
}

interface CanonicalGroup {
  type: ResolutionCandidate['type'];
  normalizedName: string;
  canonicalName: string;
  methods: Set<string>;
  members: Array<ResolutionCandidate & { matchMethod: string }>;
}

@Injectable()
export class CrossChapterEntityResolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: BuiltinEntityNormalizer,
  ) {}

  async request(
    projectId: string,
    documentId: string,
    versionId: string,
    traceId?: string,
  ): Promise<EntityResolutionTaskView> {
    const version = await this.findVersion(projectId, documentId, versionId);
    await this.assertExtractedEntities(versionId);
    const idempotencyKey = `${TASK_TYPE}:${versionId}:${this.normalizer.version}`;
    let task = await this.prisma.task.findUnique({ where: { idempotencyKey } });
    await this.prisma.sourceVersionEntityResolution.upsert({
      where: {
        sourceVersionId_normalizerName_normalizerVersion: {
          sourceVersionId: versionId,
          normalizerName: this.normalizer.name,
          normalizerVersion: this.normalizer.version,
        },
      },
      create: {
        projectId,
        sourceDocumentId: documentId,
        sourceVersionId: versionId,
        normalizerName: this.normalizer.name,
        normalizerVersion: this.normalizer.version,
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
            resourceId: versionId,
            inputVersion: String(version.version),
            idempotencyKey,
            maxAttempts: DEFAULT_MAX_ATTEMPTS,
            traceId,
            payload: {
              documentId,
              versionId,
              normalizerName: this.normalizer.name,
              normalizerVersion: this.normalizer.version,
            },
          },
        });
      } catch (error) {
        if (!this.isUniqueViolation(error)) throw error;
        task = await this.prisma.task.findUnique({ where: { idempotencyKey } });
      }
    }
    if (!task) throw new NotFoundException('跨章节实体归并任务创建后无法读取');
    if (task.status === TaskStatus.PENDING)
      await this.execute(task.id, projectId, documentId, versionId, traceId);
    return this.getTask(projectId, task.id);
  }

  async getTask(projectId: string, taskId: string): Promise<EntityResolutionTaskView> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, type: TASK_TYPE },
      include: { attempts: { orderBy: { attempt: 'desc' } } },
    });
    if (!task) throw new NotFoundException('跨章节实体归并任务不存在或不属于当前项目');
    return this.toTaskView(task);
  }

  async retry(
    projectId: string,
    taskId: string,
    traceId?: string,
  ): Promise<EntityResolutionTaskView> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, type: TASK_TYPE },
      include: { attempts: { orderBy: { attempt: 'desc' }, take: 1 } },
    });
    if (!task) throw new NotFoundException('跨章节实体归并任务不存在或不属于当前项目');
    if (task.status === TaskStatus.SUCCEEDED || task.status === TaskStatus.RUNNING)
      return this.getTask(projectId, task.id);
    if (!isRetryable(task.status))
      throw new BadRequestException(`当前任务状态 ${task.status} 不允许重试`);
    if (task.attempt >= task.maxAttempts) throw new BadRequestException('任务已达到最大重试次数');
    if (task.attempts[0] && !task.attempts[0].retryable)
      throw new BadRequestException('上一次失败不可重试，请检查任务错误信息');
    const payload = readPayload(task.payload);
    if (!task.resourceId || !payload.documentId || !payload.versionId)
      throw new BadRequestException('任务缺少跨章节归并所需资源');
    const reset = await this.prisma.task.updateMany({
      where: { id: task.id, status: task.status, attempt: task.attempt },
      data: { status: TaskStatus.RETRYING, errorCode: null, errorMessage: null, traceId },
    });
    if (reset.count > 0)
      await this.execute(task.id, projectId, payload.documentId, payload.versionId, traceId);
    return this.getTask(projectId, task.id);
  }

  async getResolution(
    projectId: string,
    documentId: string,
    versionId: string,
  ): Promise<EntityResolutionView> {
    await this.findVersion(projectId, documentId, versionId);
    const resolution = await this.prisma.sourceVersionEntityResolution.findFirst({
      where: {
        projectId,
        sourceDocumentId: documentId,
        sourceVersionId: versionId,
        normalizerName: this.normalizer.name,
        normalizerVersion: this.normalizer.version,
      },
      include: {
        canonicalEntities: {
          orderBy: { ordinal: 'asc' },
          include: {
            aliases: { orderBy: { name: 'asc' } },
            members: {
              orderBy: { extractedEntity: { extraction: { chapterSegment: { ordinal: 'asc' } } } },
              include: {
                extractedEntity: { include: { extraction: { include: { chapterSegment: true } } } },
              },
            },
          },
        },
      },
    });
    if (!resolution) throw new NotFoundException('该原文版本尚未创建跨章节实体归并结果');
    const byType: Record<string, number> = {};
    let candidateEntityCount = 0;
    let aliasCount = 0;
    for (const entity of resolution.canonicalEntities) {
      byType[entity.type] = (byType[entity.type] ?? 0) + 1;
      candidateEntityCount += entity.members.length;
      aliasCount += entity.aliases.length;
    }
    return {
      id: resolution.id,
      projectId: resolution.projectId,
      sourceDocumentId: resolution.sourceDocumentId,
      sourceVersionId: resolution.sourceVersionId,
      normalizer: {
        name: resolution.normalizerName,
        version: resolution.normalizerVersion,
        scope: 'surface-form-and-time-clock',
      },
      status: resolution.status,
      errorMessage: resolution.errorMessage,
      resolvedAt: resolution.resolvedAt,
      createdAt: resolution.createdAt,
      updatedAt: resolution.updatedAt,
      summary: {
        canonicalEntityCount: resolution.canonicalEntities.length,
        candidateEntityCount,
        aliasCount,
        byType,
      },
      entities: resolution.canonicalEntities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        canonicalName: entity.canonicalName,
        normalizedName: entity.normalizedName,
        confidence: entity.confidence,
        metadata: entity.metadata,
        ordinal: entity.ordinal,
        aliases: entity.aliases.map((alias) => ({
          id: alias.id,
          name: alias.name,
          normalizedName: alias.normalizedName,
          isCanonical: alias.isCanonical,
          occurrenceCount: alias.occurrenceCount,
        })),
        members: entity.members.map((member) => ({
          id: member.id,
          extractedEntityId: member.extractedEntityId,
          extractedName: member.extractedEntity.name,
          extractionId: member.extractedEntity.extractionId,
          chapterSegmentId: member.extractedEntity.extraction.chapterSegmentId,
          matchMethod: member.matchMethod,
          confidence: member.confidence,
        })),
      })),
    };
  }

  private async execute(
    taskId: string,
    projectId: string,
    documentId: string,
    versionId: string,
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
          input: { projectId, documentId, versionId, normalizerVersion: this.normalizer.version },
        },
      });
      await tx.sourceVersionEntityResolution.updateMany({
        where: {
          projectId,
          sourceDocumentId: documentId,
          sourceVersionId: versionId,
          normalizerName: this.normalizer.name,
          normalizerVersion: this.normalizer.version,
        },
        data: { status: SourceVersionEntityResolutionStatus.RUNNING, errorMessage: null },
      });
      return true;
    });
    if (!claimed) return;
    try {
      await this.findVersion(projectId, documentId, versionId);
      const candidates = await this.loadCandidates(versionId);
      if (candidates.length === 0)
        throw new BadRequestException('当前原文版本没有成功的分章实体提取结果');
      const result = await this.replaceResolution(projectId, documentId, versionId, candidates);
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
          : 'CROSS_CHAPTER_ENTITY_RESOLUTION_FAILED';
      const status =
        retryable && nextAttempt < task.maxAttempts ? TaskStatus.RETRYING : TaskStatus.FAILED;
      await this.prisma.$transaction(async (tx) => {
        await tx.sourceVersionEntityResolution.updateMany({
          where: {
            projectId,
            sourceDocumentId: documentId,
            sourceVersionId: versionId,
            normalizerName: this.normalizer.name,
            normalizerVersion: this.normalizer.version,
          },
          data: { status: SourceVersionEntityResolutionStatus.FAILED, errorMessage: message },
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

  private async replaceResolution(
    projectId: string,
    documentId: string,
    versionId: string,
    candidates: ResolutionCandidate[],
  ) {
    const groups = this.groupCandidates(candidates);
    return this.prisma.$transaction(async (tx) => {
      const resolution = await tx.sourceVersionEntityResolution.findFirst({
        where: {
          projectId,
          sourceDocumentId: documentId,
          sourceVersionId: versionId,
          normalizerName: this.normalizer.name,
          normalizerVersion: this.normalizer.version,
        },
      });
      if (!resolution) throw new NotFoundException('跨章节实体归并结果不存在');
      await tx.canonicalEntity.deleteMany({ where: { resolutionId: resolution.id } });
      let aliasCount = 0;
      for (const [index, group] of groups.entries()) {
        const canonical = await tx.canonicalEntity.create({
          data: {
            resolutionId: resolution.id,
            type: group.type,
            canonicalName: group.canonicalName,
            normalizedName: group.normalizedName,
            confidence: average(group.members.map((member) => member.confidence)),
            metadata: {
              candidateCount: group.members.length,
              chapterCount: new Set(group.members.map((member) => member.chapterSegmentId)).size,
              matchMethods: [...group.methods].sort(),
            } as Prisma.InputJsonValue,
            ordinal: index + 1,
          },
        });
        const aliases = [
          ...group.members
            .reduce((map, member) => {
              const current = map.get(member.name) ?? 0;
              map.set(member.name, current + member.mentionCount);
              return map;
            }, new Map<string, number>())
            .entries(),
        ];
        await tx.canonicalEntityAlias.createMany({
          data: aliases.map(([name, occurrenceCount]) => ({
            canonicalEntityId: canonical.id,
            name,
            normalizedName: this.normalizer.normalize(group.type, name).normalizedName,
            isCanonical: name === group.canonicalName,
            occurrenceCount,
          })),
        });
        await tx.canonicalEntityMember.createMany({
          data: group.members.map((member) => ({
            canonicalEntityId: canonical.id,
            extractedEntityId: member.id,
            matchMethod: member.matchMethod,
            confidence: member.confidence,
          })),
        });
        aliasCount += aliases.length;
      }
      await tx.sourceVersionEntityResolution.update({
        where: { id: resolution.id },
        data: {
          status: SourceVersionEntityResolutionStatus.SUCCEEDED,
          errorMessage: null,
          resolvedAt: new Date(),
        },
      });
      return {
        resolutionId: resolution.id,
        canonicalEntityCount: groups.length,
        candidateEntityCount: candidates.length,
        aliasCount,
        normalizer: `${this.normalizer.name}@${this.normalizer.version}`,
      };
    });
  }

  private groupCandidates(candidates: ResolutionCandidate[]): CanonicalGroup[] {
    const groups = new Map<string, CanonicalGroup>();
    for (const candidate of candidates) {
      const normalized = this.normalizer.normalize(candidate.type, candidate.name);
      const key = `${candidate.type}:${normalized.normalizedName}`;
      const group = groups.get(key) ?? {
        type: candidate.type,
        normalizedName: normalized.normalizedName,
        canonicalName: normalized.canonicalName,
        methods: new Set<string>(),
        members: [],
      };
      group.methods.add(normalized.method);
      group.members.push({ ...candidate, matchMethod: normalized.method });
      groups.set(key, group);
    }
    return [...groups.values()]
      .map((group) => ({ ...group, canonicalName: chooseCanonicalName(group) }))
      .sort(
        (left, right) =>
          left.type.localeCompare(right.type) ||
          left.canonicalName.localeCompare(right.canonicalName),
      );
  }

  private async loadCandidates(versionId: string): Promise<ResolutionCandidate[]> {
    const entities = await this.prisma.extractedEntity.findMany({
      where: { extraction: { sourceVersionId: versionId, status: 'SUCCEEDED' } },
      include: { mentions: true, extraction: { select: { id: true, chapterSegmentId: true } } },
      orderBy: { ordinal: 'asc' },
    });
    return entities.map((entity) => ({
      id: entity.id,
      type: entity.type,
      name: entity.name,
      confidence: entity.confidence,
      mentionCount: entity.mentions.length,
      extractionId: entity.extractionId,
      chapterSegmentId: entity.extraction.chapterSegmentId,
    }));
  }

  private async assertExtractedEntities(versionId: string): Promise<void> {
    const count = await this.prisma.extractedEntity.count({
      where: { extraction: { sourceVersionId: versionId, status: 'SUCCEEDED' } },
    });
    if (count === 0) throw new BadRequestException('请先完成至少一个章节的实体提取');
  }

  private async findVersion(projectId: string, documentId: string, versionId: string) {
    const version = await this.prisma.sourceDocumentVersion.findFirst({
      where: { id: versionId, documentId, document: { projectId } },
      select: { id: true, documentId: true, version: true, status: true },
    });
    if (!version) throw new NotFoundException('原文版本不存在或不属于当前项目');
    if (version.status !== SourceVersionStatus.READY)
      throw new BadRequestException(`原文尚未完成解析，当前状态为 ${version.status}`);
    return version;
  }

  private toTaskView(task: TaskWithAttempts): EntityResolutionTaskView {
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

function chooseCanonicalName(group: CanonicalGroup): string {
  if (group.type === 'TIME' && /^\d{2}:\d{2}$/u.test(group.normalizedName))
    return group.normalizedName;
  const candidates = [...group.members].sort(
    (left, right) =>
      right.mentionCount - left.mentionCount ||
      (right.confidence ?? 0) - (left.confidence ?? 0) ||
      left.name.localeCompare(right.name),
  );
  return candidates[0]?.name ?? group.canonicalName;
}

function average(values: Array<number | null>): number | null {
  const numbers = values.filter((value): value is number => value !== null);
  return numbers.length === 0
    ? null
    : numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function readPayload(payload: Prisma.JsonValue | null): {
  documentId?: string;
  versionId?: string;
} {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const value = payload as Record<string, unknown>;
  return {
    documentId: typeof value.documentId === 'string' ? value.documentId : undefined,
    versionId: typeof value.versionId === 'string' ? value.versionId : undefined,
  };
}

function isRetryable(status: TaskStatus): status is 'FAILED' | 'RETRYING' {
  return status === TaskStatus.FAILED || status === TaskStatus.RETRYING;
}

function isRunnable(status: TaskStatus): status is 'PENDING' | 'RETRYING' {
  return status === TaskStatus.PENDING || status === TaskStatus.RETRYING;
}
