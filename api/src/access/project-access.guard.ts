import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ProjectAccessRequirement } from './project-access.decorator';
import { PROJECT_ACCESS_METADATA } from './project-access.decorator';
import { AUTH_USER_ID_HEADER, type AuthenticatedRequest } from './auth-context';
import { AccessControlService } from './access-control.service';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<ProjectAccessRequirement>(
      PROJECT_ACCESS_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id ?? request.header(AUTH_USER_ID_HEADER) ?? undefined;
    const projectId = this.resolveProjectId(request);
    await this.accessControl.assertProjectAccess(
      userId,
      projectId,
      requirement.level,
      requirement.roles,
    );
    return true;
  }

  private resolveProjectId(request: AuthenticatedRequest): string | undefined {
    const routeProjectId =
      typeof request.params?.projectId === 'string' ? request.params.projectId : undefined;
    const queryProjectId =
      typeof request.query?.projectId === 'string' ? request.query.projectId : undefined;
    const bodyProjectId =
      typeof request.body?.projectId === 'string' ? request.body.projectId : undefined;
    return routeProjectId ?? queryProjectId ?? bodyProjectId;
  }
}
