import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { from, Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import type { Response } from 'express';
import { AuditLogService } from './audit-log.service';
import { AUDIT_ACTION_METADATA, type AuditActionOptions } from './audit-action.decorator';
import type { AuthenticatedRequest } from '../access/auth-context';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLog: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.getAllAndOverride<AuditActionOptions>(AUDIT_ACTION_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      concatMap((result: unknown) =>
        from(
          this.auditLog.recordRequestAction(request, response, {
            action: options.action,
            entityType: options.entityType,
            entityId: this.resolveValue(request, options.entityIdParam ?? 'entityId'),
            projectId: this.resolveProjectId(request, options.projectIdParam),
            after: options.captureResponseSnapshot ? this.toJsonValue(result) : undefined,
            metadata: {
              httpMethod: request.method,
              path: request.originalUrl,
            },
          }),
        ).pipe(concatMap(() => [result])),
      ),
    );
  }

  private resolveProjectId(
    request: AuthenticatedRequest,
    parameterName?: string,
  ): string | undefined {
    const value = this.resolveValue(request, parameterName ?? 'projectId');
    return this.isUuid(value) ? value : undefined;
  }

  private resolveValue(request: AuthenticatedRequest, parameterName: string): string | undefined {
    const routeValue = request.params?.[parameterName];
    const queryValue = request.query?.[parameterName];
    const bodyValue = request.body?.[parameterName];
    for (const value of [routeValue, queryValue, bodyValue]) {
      if (typeof value === 'string' && value.length <= 120) {
        return value;
      }
    }
    return undefined;
  }

  private isUuid(value: string | undefined): value is string {
    return (
      value !== undefined &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    );
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
      return value as Prisma.InputJsonValue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.toJsonValue(item));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this.toJsonValue(item)]),
      );
    }
    return String(value);
  }
}
