import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SourceVersionStatus, TaskAttemptStatus, TaskStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { SourceDocumentParseService } from './source-document-parse.service';

const TASK_TYPE = 'SOURCE_DOCUMENT_SEGMENTATION';
const RESOURCE_TYPE = 'SourceDocumentVersion';
const WORKER_ID = 'api-source-document-segmentation';
const DEFAULT_MAX_ATTEMPTS = 3;

export interface SegmentationTaskAttemptView {
  id: string;
  attempt: number;
  status: TaskAttemptStatus;
  retryable: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface SegmentationTaskView {
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
  attempts: SegmentationTaskAttemptView[];
}

@Injectable()
export class SourceDocumentSegmentationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: SourceDocumentParseService,
  ) {}

  async request(
    projectId: string,
    documentId: string,
    versionId: string,
    traceId?: string,
  ): Promise<SegmentationTaskView> {
    const version = await this.findVersion(projectId, documentId, versionId);
    const idempotencyKey = `${TASK_TYPE}:${versionId}`;
    let task = await this.prisma.task.findUnique({ where: { idempotencyKey } });

    if (!task) {
      try {
        task = await this.prisma.task.create({
          data: {
            projectId,
            type: TASK_TYPE,
            resourceType: RESOURCE_TYPE,
            resourceId: version.id,
            inputVersion: String(version.version),
            idempotencyKey,
            maxAttempts: DEFAULT_MAX_ATTEMPTS,
            traceId,
            payload: {
              documentId,
              versionId,
              documentVersion: version.version,
            },
          },
        });
      } catch (error) {
        if (!this.isUniqueViolation(error)) throw error;
        task = await this.prisma.task.findUnique({ where: { idempotencyKey } });
      }
    }

    if (!task) {
      throw new NotFoundException('原文分段任务创建后无法读取');
    }

    if (task.status === TaskStatus.PENDING) {
      await this.execute(task.id, projectId, documentId, versionId, traceId);
    }
    return this.get(projectId, task.id);
  }

  async get(projectId: string, taskId: string): Promise<SegmentationTaskView> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, type: TASK_TYPE },
      include: { attempts: { orderBy: { attempt: 'desc' } } },
    });
    if (!task) throw new NotFoundException('原文分段任务不存在或不属于当前项目');
    return this.toView(task);
  }

  async retry(projectId: string, taskId: string, traceId?: string): Promise<SegmentationTaskView> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, type: TASK_TYPE },
      include: { attempts: { orderBy: { attempt: 'desc' }, take: 1 } },
    });
    if (!task) throw new NotFoundException('原文分段任务不存在或不属于当前项目');
    if (task.status === TaskStatus.SUCCEEDED) return this.get(projectId, task.id);
    if (task.status === TaskStatus.RUNNING) return this.get(projectId, task.id);
    if (!isRetryableTaskStatus(task.status)) {
      throw new BadRequestException(`当前任务状态 ${task.status} 不允许重试`);
    }
    if (task.attempt >= task.maxAttempts) {
      throw new BadRequestException('任务已达到最大重试次数');
    }
    if (task.attempts[0] && !task.attempts[0].retryable) {
      throw new BadRequestException('上一次失败不可重试，请检查任务错误信息');
    }

    const reset = await this.prisma.task.updateMany({
      where: { id: task.id, status: task.status, attempt: task.attempt },
      data: { status: TaskStatus.RETRYING, errorCode: null, errorMessage: null, traceId },
    });
    if (reset.count > 0) {
      const resourceId = task.resourceId;
      const documentId = readDocumentId(task.payload);
      if (!resourceId || !documentId) throw new BadRequestException('任务缺少原文版本资源');
      await this.execute(task.id, projectId, documentId, resourceId, traceId);
    }
    return this.get(projectId, task.id);
  }

  private async execute(
    taskId: string,
    projectId: string,
    documentId: string,
    versionId: string,
    traceId?: string,
  ): Promise<void> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.projectId !== projectId || task.type !== TASK_TYPE) return;
    if (!isRunnableTaskStatus(task.status)) return;

    const nextAttempt = task.attempt + 1;
    const claimed = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.updateMany({
        where: { id: task.id, status: task.status, attempt: task.attempt },
        data: {
          status: TaskStatus.RUNNING,
          attempt: nextAttempt,
          traceId,
          startedAt: new Date(),
          completedAt: null,
          lockedBy: WORKER_ID,
          lockedAt: new Date(),
          heartbeatAt: new Date(),
        },
      });
      if (updated.count === 0) return false;
      await tx.taskAttempt.create({
        data: {
          taskId: task.id,
          attempt: nextAttempt,
          workerId: WORKER_ID,
          traceId,
          input: { projectId, documentId, versionId },
        },
      });
      return true;
    });
    if (!claimed) return;

    try {
      const result = await this.parser.parseVersion(projectId, documentId, versionId);
      await this.prisma.$transaction(async (tx) => {
        await tx.taskAttempt.update({
          where: { taskId_attempt: { taskId: task.id, attempt: nextAttempt } },
          data: {
            status: TaskAttemptStatus.SUCCEEDED,
            output: result as unknown as Prisma.InputJsonValue,
            finishedAt: new Date(),
            heartbeatAt: new Date(),
          },
        });
        await tx.task.update({
          where: { id: task.id },
          data: {
            status: TaskStatus.SUCCEEDED,
            result: result as unknown as Prisma.InputJsonValue,
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
        error instanceof HttpException ? `HTTP_${error.getStatus()}` : 'SEGMENTATION_FAILED';
      const status =
        retryable && nextAttempt < task.maxAttempts ? TaskStatus.RETRYING : TaskStatus.FAILED;
      await this.prisma.$transaction(async (tx) => {
        await tx.taskAttempt.update({
          where: { taskId_attempt: { taskId: task.id, attempt: nextAttempt } },
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
          where: { id: task.id },
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

  private async findVersion(projectId: string, documentId: string, versionId: string) {
    const version = await this.prisma.sourceDocumentVersion.findFirst({
      where: { id: versionId, documentId, document: { projectId } },
      select: { id: true, documentId: true, version: true, status: true },
    });
    if (!version) throw new NotFoundException('原文版本不存在或不属于当前项目');
    if (version.status === SourceVersionStatus.PARSING) {
      throw new BadRequestException('原文版本正在解析，请稍后重试');
    }
    return version;
  }

  private toView(
    task: Prisma.TaskGetPayload<{ include: { attempts: true } }>,
  ): SegmentationTaskView {
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

function readDocumentId(payload: Prisma.JsonValue | null): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const value = (payload as Record<string, unknown>).documentId;
  return typeof value === 'string' ? value : undefined;
}

function isRetryableTaskStatus(status: TaskStatus): status is 'FAILED' | 'RETRYING' {
  return status === TaskStatus.FAILED || status === TaskStatus.RETRYING;
}

function isRunnableTaskStatus(status: TaskStatus): status is 'PENDING' | 'RETRYING' {
  return status === TaskStatus.PENDING || status === TaskStatus.RETRYING;
}
