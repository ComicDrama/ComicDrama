import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NarrativeRelationshipKind,
  Prisma,
  SourceVersionNarrativeStructureStatus,
  SourceVersionStatus,
  TaskAttemptStatus,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import {
  ENTITY_NORMALIZER_NAME,
  ENTITY_NORMALIZER_VERSION,
} from './builtin-entity-normalizer.service';
import type { EntityResolutionTaskView } from './cross-chapter-entity-resolution.service';

export const NARRATIVE_STRUCTURE_ANALYZER_NAME = 'builtin-chapter-cooccurrence-narrative-analyzer';
export const NARRATIVE_STRUCTURE_ANALYZER_VERSION = '1.0.0';
const TASK_TYPE = 'SOURCE_VERSION_NARRATIVE_STRUCTURE';
const RESOURCE_TYPE = 'SourceDocumentVersion';
const WORKER_ID = 'api-narrative-structure';
const MAX_ATTEMPTS = 3;

type TaskWithAttempts = Prisma.TaskGetPayload<{ include: { attempts: true } }>;

export type NarrativeStructureTaskView = EntityResolutionTaskView;

export interface NarrativeStructureView {
  id: string;
  projectId: string;
  sourceDocumentId: string;
  sourceVersionId: string;
  analyzer: { name: string; version: string; method: 'chapter-cooccurrence' };
  status: SourceVersionNarrativeStructureStatus;
  errorMessage: string | null;
  analyzedAt: Date | null;
  summary: { relationshipCount: number; eventCount: number; timelineEntryCount: number };
  relationships: Array<{
    id: string;
    kind: NarrativeRelationshipKind;
    source: { id: string; name: string };
    target: { id: string; name: string };
    confidence: number | null;
    occurrenceCount: number;
    chapterSegmentIds: string[];
  }>;
  timeline: Array<{
    id: string;
    title: string;
    canonicalEventId: string;
    chapterSegmentId: string;
    chapterOrdinal: number;
    sourceOrdinal: number;
    timelineOrder: number;
    confidence: number | null;
    temporalAnchorIds: string[];
    locationAnchorIds: string[];
    participants: Array<{ id: string; name: string; confidence: number | null }>;
  }>;
}

export interface NarrativeEntityInput {
  id: string;
  type: 'CHARACTER' | 'LOCATION' | 'PROP' | 'ORGANIZATION' | 'TIME' | 'EVENT';
  canonicalName: string;
  confidence: number | null;
  members: Array<{
    id: string;
    chapterSegmentId: string;
    chapterOrdinal: number;
    sourceOrdinal: number;
    confidence: number | null;
  }>;
}

export interface BuiltNarrativeStructure {
  relationships: Array<{
    sourceCanonicalEntityId: string;
    targetCanonicalEntityId: string;
    occurrenceCount: number;
    confidence: number | null;
    chapterSegmentIds: string[];
  }>;
  events: Array<{
    canonicalEntityId: string;
    sourceMemberId: string;
    chapterSegmentId: string;
    chapterOrdinal: number;
    sourceOrdinal: number;
    timelineOrder: number;
    title: string;
    confidence: number | null;
    temporalAnchorIds: string[];
    locationAnchorIds: string[];
    participantIds: string[];
  }>;
}

@Injectable()
export class NarrativeStructureBuilder {
  build(entities: NarrativeEntityInput[]): BuiltNarrativeStructure {
    const chapters = new Map<
      string,
      Array<NarrativeEntityInput & { member: NarrativeEntityInput['members'][number] }>
    >();
    for (const entity of entities) {
      for (const member of entity.members) {
        const chapter = chapters.get(member.chapterSegmentId) ?? [];
        chapter.push({ ...entity, member });
        chapters.set(member.chapterSegmentId, chapter);
      }
    }

    const relationships = new Map<string, BuiltNarrativeStructure['relationships'][number]>();
    const events: BuiltNarrativeStructure['events'] = [];
    for (const chapter of chapters.values()) {
      const characters = uniqueById(chapter.filter((entry) => entry.type === 'CHARACTER'));
      for (let left = 0; left < characters.length; left += 1) {
        for (let right = left + 1; right < characters.length; right += 1) {
          const [source, target] = [characters[left], characters[right]].sort((a, b) =>
            a.id.localeCompare(b.id),
          );
          const key = `${source.id}:${target.id}`;
          const current = relationships.get(key);
          const chapterId = source.member.chapterSegmentId;
          relationships.set(key, {
            sourceCanonicalEntityId: source.id,
            targetCanonicalEntityId: target.id,
            occurrenceCount: (current?.occurrenceCount ?? 0) + 1,
            confidence: average([
              current?.confidence ?? null,
              source.confidence,
              target.confidence,
            ]),
            chapterSegmentIds: [...new Set([...(current?.chapterSegmentIds ?? []), chapterId])],
          });
        }
      }
      const temporalAnchorIds = uniqueById(chapter.filter((entry) => entry.type === 'TIME')).map(
        (entry) => entry.id,
      );
      const locationAnchorIds = uniqueById(
        chapter.filter((entry) => entry.type === 'LOCATION'),
      ).map((entry) => entry.id);
      const participantIds = characters.map((entry) => entry.id);
      for (const event of chapter.filter((entry) => entry.type === 'EVENT')) {
        events.push({
          canonicalEntityId: event.id,
          sourceMemberId: event.member.id,
          chapterSegmentId: event.member.chapterSegmentId,
          chapterOrdinal: event.member.chapterOrdinal,
          sourceOrdinal: event.member.sourceOrdinal,
          timelineOrder: 0,
          title: event.canonicalName,
          confidence: event.confidence ?? event.member.confidence,
          temporalAnchorIds,
          locationAnchorIds,
          participantIds,
        });
      }
    }
    events.sort(
      (a, b) =>
        a.chapterOrdinal - b.chapterOrdinal ||
        a.sourceOrdinal - b.sourceOrdinal ||
        a.title.localeCompare(b.title),
    );
    events.forEach((event, index) => {
      event.timelineOrder = index + 1;
    });
    return { relationships: [...relationships.values()], events };
  }
}

@Injectable()
export class NarrativeStructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly builder: NarrativeStructureBuilder,
  ) {}

  async request(
    projectId: string,
    documentId: string,
    versionId: string,
    traceId?: string,
  ): Promise<NarrativeStructureTaskView> {
    const version = await this.findVersion(projectId, documentId, versionId);
    const resolution = await this.findEntityResolution(projectId, documentId, versionId);
    const idempotencyKey = `${TASK_TYPE}:${versionId}:${NARRATIVE_STRUCTURE_ANALYZER_VERSION}`;
    let task = await this.prisma.task.findUnique({ where: { idempotencyKey } });
    await this.prisma.narrativeStructure.upsert({
      where: {
        sourceVersionId_analyzerName_analyzerVersion: {
          sourceVersionId: versionId,
          analyzerName: NARRATIVE_STRUCTURE_ANALYZER_NAME,
          analyzerVersion: NARRATIVE_STRUCTURE_ANALYZER_VERSION,
        },
      },
      create: {
        projectId,
        sourceDocumentId: documentId,
        sourceVersionId: versionId,
        entityResolutionId: resolution.id,
        analyzerName: NARRATIVE_STRUCTURE_ANALYZER_NAME,
        analyzerVersion: NARRATIVE_STRUCTURE_ANALYZER_VERSION,
      },
      update: { entityResolutionId: resolution.id },
    });
    if (!task)
      task = await this.prisma.task.create({
        data: {
          projectId,
          type: TASK_TYPE,
          resourceType: RESOURCE_TYPE,
          resourceId: versionId,
          inputVersion: String(version.version),
          idempotencyKey,
          maxAttempts: MAX_ATTEMPTS,
          traceId,
          payload: {
            documentId,
            versionId,
            entityResolutionId: resolution.id,
            analyzerVersion: NARRATIVE_STRUCTURE_ANALYZER_VERSION,
          },
        },
      });
    if (task.status === TaskStatus.PENDING)
      await this.execute(task.id, projectId, documentId, versionId, traceId);
    return this.getTask(projectId, task.id);
  }

  async getTask(projectId: string, taskId: string): Promise<NarrativeStructureTaskView> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, type: TASK_TYPE },
      include: { attempts: { orderBy: { attempt: 'desc' } } },
    });
    if (!task) throw new NotFoundException('叙事结构任务不存在或不属于当前项目');
    return toTaskView(task);
  }

  async retry(
    projectId: string,
    taskId: string,
    traceId?: string,
  ): Promise<NarrativeStructureTaskView> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, type: TASK_TYPE },
      include: { attempts: { orderBy: { attempt: 'desc' }, take: 1 } },
    });
    if (!task) throw new NotFoundException('叙事结构任务不存在或不属于当前项目');
    if (task.status === TaskStatus.SUCCEEDED || task.status === TaskStatus.RUNNING)
      return this.getTask(projectId, task.id);
    if (task.status !== TaskStatus.FAILED && task.status !== TaskStatus.RETRYING)
      throw new BadRequestException(`当前任务状态 ${task.status} 不允许重试`);
    if (task.attempt >= task.maxAttempts || (task.attempts[0] && !task.attempts[0].retryable))
      throw new BadRequestException('任务不可重试或已达到最大次数');
    const payload = readPayload(task.payload);
    if (!payload.documentId || !payload.versionId)
      throw new BadRequestException('任务缺少叙事结构所需资源');
    const reset = await this.prisma.task.updateMany({
      where: { id: task.id, status: task.status, attempt: task.attempt },
      data: { status: TaskStatus.RETRYING, errorCode: null, errorMessage: null, traceId },
    });
    if (reset.count)
      await this.execute(task.id, projectId, payload.documentId, payload.versionId, traceId);
    return this.getTask(projectId, task.id);
  }

  async getStructure(
    projectId: string,
    documentId: string,
    versionId: string,
  ): Promise<NarrativeStructureView> {
    await this.findVersion(projectId, documentId, versionId);
    const structure = await this.prisma.narrativeStructure.findFirst({
      where: {
        projectId,
        sourceDocumentId: documentId,
        sourceVersionId: versionId,
        analyzerName: NARRATIVE_STRUCTURE_ANALYZER_NAME,
        analyzerVersion: NARRATIVE_STRUCTURE_ANALYZER_VERSION,
      },
      include: {
        relationships: {
          orderBy: [{ occurrenceCount: 'desc' }, { createdAt: 'asc' }],
          include: { sourceEntity: true, targetEntity: true, evidence: true },
        },
        events: {
          orderBy: { timelineOrder: 'asc' },
          include: { participants: { include: { canonicalEntity: true } } },
        },
      },
    });
    if (!structure) throw new NotFoundException('该原文版本尚未创建叙事结构结果');
    return {
      id: structure.id,
      projectId: structure.projectId,
      sourceDocumentId: structure.sourceDocumentId,
      sourceVersionId: structure.sourceVersionId,
      analyzer: {
        name: structure.analyzerName,
        version: structure.analyzerVersion,
        method: 'chapter-cooccurrence',
      },
      status: structure.status,
      errorMessage: structure.errorMessage,
      analyzedAt: structure.analyzedAt,
      summary: {
        relationshipCount: structure.relationships.length,
        eventCount: structure.events.length,
        timelineEntryCount: structure.events.length,
      },
      relationships: structure.relationships.map((relationship) => ({
        id: relationship.id,
        kind: relationship.kind,
        source: { id: relationship.sourceEntity.id, name: relationship.sourceEntity.canonicalName },
        target: { id: relationship.targetEntity.id, name: relationship.targetEntity.canonicalName },
        confidence: relationship.confidence,
        occurrenceCount: relationship.occurrenceCount,
        chapterSegmentIds: relationship.evidence.map((evidence) => evidence.chapterSegmentId),
      })),
      timeline: structure.events.map((event) => {
        const metadata = readEventMetadata(event.metadata);
        return {
          id: event.id,
          title: event.title,
          canonicalEventId: event.canonicalEntityId,
          chapterSegmentId: event.chapterSegmentId,
          chapterOrdinal: event.chapterOrdinal,
          sourceOrdinal: event.sourceOrdinal,
          timelineOrder: event.timelineOrder,
          confidence: event.confidence,
          temporalAnchorIds: metadata.temporalAnchorIds,
          locationAnchorIds: metadata.locationAnchorIds,
          participants: event.participants.map((participant) => ({
            id: participant.canonicalEntityId,
            name: participant.canonicalEntity.canonicalName,
            confidence: participant.confidence,
          })),
        };
      }),
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
    if (!task || (task.status !== TaskStatus.PENDING && task.status !== TaskStatus.RETRYING))
      return;
    const attempt = task.attempt + 1;
    const claimed = await this.prisma.$transaction(async (tx) => {
      const update = await tx.task.updateMany({
        where: { id: task.id, status: task.status, attempt: task.attempt },
        data: {
          status: TaskStatus.RUNNING,
          attempt,
          startedAt: new Date(),
          completedAt: null,
          lockedBy: WORKER_ID,
          lockedAt: new Date(),
          heartbeatAt: new Date(),
          traceId,
        },
      });
      if (!update.count) return false;
      await tx.taskAttempt.create({
        data: {
          taskId,
          attempt,
          workerId: WORKER_ID,
          traceId,
          input: {
            projectId,
            documentId,
            versionId,
            analyzerVersion: NARRATIVE_STRUCTURE_ANALYZER_VERSION,
          },
        },
      });
      await tx.narrativeStructure.updateMany({
        where: {
          projectId,
          sourceDocumentId: documentId,
          sourceVersionId: versionId,
          analyzerName: NARRATIVE_STRUCTURE_ANALYZER_NAME,
          analyzerVersion: NARRATIVE_STRUCTURE_ANALYZER_VERSION,
        },
        data: { status: SourceVersionNarrativeStructureStatus.RUNNING, errorMessage: null },
      });
      return true;
    });
    if (!claimed) return;
    try {
      const resolution = await this.findEntityResolution(projectId, documentId, versionId);
      const input = await this.loadEntities(resolution.id);
      const built = this.builder.build(input);
      const result = await this.replaceStructure(projectId, documentId, versionId, built);
      await this.prisma.$transaction(async (tx) => {
        await tx.taskAttempt.update({
          where: { taskId_attempt: { taskId, attempt } },
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
      const status =
        retryable && attempt < task.maxAttempts ? TaskStatus.RETRYING : TaskStatus.FAILED;
      await this.prisma.$transaction(async (tx) => {
        await tx.narrativeStructure.updateMany({
          where: {
            projectId,
            sourceDocumentId: documentId,
            sourceVersionId: versionId,
            analyzerName: NARRATIVE_STRUCTURE_ANALYZER_NAME,
            analyzerVersion: NARRATIVE_STRUCTURE_ANALYZER_VERSION,
          },
          data: { status: SourceVersionNarrativeStructureStatus.FAILED, errorMessage: message },
        });
        await tx.taskAttempt.update({
          where: { taskId_attempt: { taskId, attempt } },
          data: {
            status: TaskAttemptStatus.FAILED,
            errorCode: retryable
              ? 'NARRATIVE_STRUCTURE_FAILED'
              : `HTTP_${error instanceof HttpException ? error.getStatus() : 500}`,
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
            errorCode: retryable
              ? 'NARRATIVE_STRUCTURE_FAILED'
              : `HTTP_${error instanceof HttpException ? error.getStatus() : 500}`,
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

  private async replaceStructure(
    projectId: string,
    documentId: string,
    versionId: string,
    built: BuiltNarrativeStructure,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const structure = await tx.narrativeStructure.findFirstOrThrow({
        where: {
          projectId,
          sourceDocumentId: documentId,
          sourceVersionId: versionId,
          analyzerName: NARRATIVE_STRUCTURE_ANALYZER_NAME,
          analyzerVersion: NARRATIVE_STRUCTURE_ANALYZER_VERSION,
        },
      });
      await tx.narrativeRelationshipCandidate.deleteMany({ where: { structureId: structure.id } });
      await tx.narrativeEventCandidate.deleteMany({ where: { structureId: structure.id } });
      for (const relationship of built.relationships) {
        const created = await tx.narrativeRelationshipCandidate.create({
          data: {
            structureId: structure.id,
            sourceCanonicalEntityId: relationship.sourceCanonicalEntityId,
            targetCanonicalEntityId: relationship.targetCanonicalEntityId,
            kind: NarrativeRelationshipKind.CO_OCCURRENCE,
            confidence: relationship.confidence,
            occurrenceCount: relationship.occurrenceCount,
            metadata: { inference: 'same-chapter-cooccurrence' },
            evidence: {
              create: relationship.chapterSegmentIds.map((chapterSegmentId) => ({
                chapterSegmentId,
              })),
            },
          },
        });
        void created;
      }
      for (const event of built.events) {
        await tx.narrativeEventCandidate.create({
          data: {
            structureId: structure.id,
            canonicalEntityId: event.canonicalEntityId,
            sourceMemberId: event.sourceMemberId,
            chapterSegmentId: event.chapterSegmentId,
            chapterOrdinal: event.chapterOrdinal,
            sourceOrdinal: event.sourceOrdinal,
            timelineOrder: event.timelineOrder,
            title: event.title,
            confidence: event.confidence,
            metadata: {
              temporalAnchorIds: event.temporalAnchorIds,
              locationAnchorIds: event.locationAnchorIds,
              inference: 'chapter-level-cooccurrence',
            },
            participants: {
              create: event.participantIds.map((canonicalEntityId) => ({
                canonicalEntityId,
                confidence: null,
              })),
            },
          },
        });
      }
      await tx.narrativeStructure.update({
        where: { id: structure.id },
        data: {
          status: SourceVersionNarrativeStructureStatus.SUCCEEDED,
          errorMessage: null,
          analyzedAt: new Date(),
        },
      });
      return {
        structureId: structure.id,
        relationshipCount: built.relationships.length,
        eventCount: built.events.length,
        timelineEntryCount: built.events.length,
        analyzer: `${NARRATIVE_STRUCTURE_ANALYZER_NAME}@${NARRATIVE_STRUCTURE_ANALYZER_VERSION}`,
      };
    });
  }

  private async findVersion(projectId: string, documentId: string, versionId: string) {
    const version = await this.prisma.sourceDocumentVersion.findFirst({
      where: { id: versionId, documentId, document: { projectId } },
      select: { id: true, version: true, status: true },
    });
    if (!version) throw new NotFoundException('原文版本不存在或不属于当前项目');
    if (version.status !== SourceVersionStatus.READY)
      throw new BadRequestException(`原文尚未完成解析，当前状态为 ${version.status}`);
    return version;
  }

  private async findEntityResolution(projectId: string, documentId: string, versionId: string) {
    const resolution = await this.prisma.sourceVersionEntityResolution.findFirst({
      where: {
        projectId,
        sourceDocumentId: documentId,
        sourceVersionId: versionId,
        normalizerName: ENTITY_NORMALIZER_NAME,
        normalizerVersion: ENTITY_NORMALIZER_VERSION,
        status: 'SUCCEEDED',
      },
    });
    if (!resolution) throw new BadRequestException('当前原文版本尚未完成 P3-09 跨章节实体归并');
    return resolution;
  }

  private async loadEntities(resolutionId: string): Promise<NarrativeEntityInput[]> {
    const entities = await this.prisma.canonicalEntity.findMany({
      where: { resolutionId },
      include: {
        members: {
          include: {
            extractedEntity: { include: { extraction: { include: { chapterSegment: true } } } },
          },
        },
      },
    });
    return entities.map((entity) => ({
      id: entity.id,
      type: entity.type,
      canonicalName: entity.canonicalName,
      confidence: entity.confidence,
      members: entity.members.map((member) => ({
        id: member.id,
        chapterSegmentId: member.extractedEntity.extraction.chapterSegmentId,
        chapterOrdinal: member.extractedEntity.extraction.chapterSegment.ordinal,
        sourceOrdinal: member.extractedEntity.ordinal,
        confidence: member.confidence,
      })),
    }));
  }
}

function uniqueById<T extends { id: string }>(entries: T[]): T[] {
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()];
}
function average(values: Array<number | null>): number | null {
  const defined = values.filter((value): value is number => value !== null);
  return defined.length ? defined.reduce((sum, value) => sum + value, 0) / defined.length : null;
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
function readEventMetadata(metadata: Prisma.JsonValue | null): {
  temporalAnchorIds: string[];
  locationAnchorIds: string[];
} {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return { temporalAnchorIds: [], locationAnchorIds: [] };
  const value = metadata as Record<string, unknown>;
  return {
    temporalAnchorIds: stringList(value.temporalAnchorIds),
    locationAnchorIds: stringList(value.locationAnchorIds),
  };
}
function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
function toTaskView(task: TaskWithAttempts): NarrativeStructureTaskView {
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
