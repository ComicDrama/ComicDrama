import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../common/prisma.service';
import { AUTH_USER_ID_HEADER, type AuthenticatedRequest } from '../access/auth-context';

export interface AuditLogRecordInput {
  projectId?: string;
  actorId?: string;
  actorType?: string;
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  traceId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogRecordInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        projectId: input.projectId,
        actorId: input.actorId,
        actorType: input.actorType,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        requestId: input.requestId,
        traceId: input.traceId,
        before: input.before,
        after: input.after,
        metadata: input.metadata,
      },
    });
  }

  async recordRequestAction(
    request: AuthenticatedRequest,
    response: { locals?: Record<string, unknown> },
    input: Omit<AuditLogRecordInput, 'actorId' | 'actorType' | 'requestId' | 'traceId'>,
  ): Promise<void> {
    const actorId = request.user?.id ?? request.header(AUTH_USER_ID_HEADER) ?? undefined;
    const requestId = this.readHeader(request, 'x-request-id');
    const traceId = this.readLocal(response, 'traceId') ?? this.readHeader(request, 'x-trace-id');

    await this.record({
      ...input,
      actorId,
      actorType: actorId ? 'USER' : 'SYSTEM',
      requestId,
      traceId,
    });
  }

  private readHeader(request: Request, name: string): string | undefined {
    const value = request.header(name);
    return value && value.length <= 120 ? value : undefined;
  }

  private readLocal(
    response: { locals?: Record<string, unknown> },
    name: string,
  ): string | undefined {
    const value = response.locals?.[name];
    return typeof value === 'string' && value.length <= 120 ? value : undefined;
  }
}
