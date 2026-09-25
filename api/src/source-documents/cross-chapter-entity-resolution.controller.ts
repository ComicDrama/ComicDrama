import { Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectAccessLevel } from '@prisma/client';
import { ProjectAccess } from '../access/project-access.decorator';
import { ProjectAccessGuard } from '../access/project-access.guard';
import { AuditAction } from '../audit/audit-action.decorator';
import {
  CrossChapterEntityResolutionService,
  type EntityResolutionTaskView,
  type EntityResolutionView,
} from './cross-chapter-entity-resolution.service';

@Controller('projects/:projectId/source-documents/:documentId/versions/:versionId')
@UseGuards(ProjectAccessGuard)
export class CrossChapterEntityResolutionController {
  constructor(private readonly resolutions: CrossChapterEntityResolutionService) {}

  @Post('entity-resolution')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'GENERATE',
    entityType: 'CrossChapterEntityResolutionTask',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  async request(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Headers('x-trace-id') traceId?: string,
  ): Promise<{ data: EntityResolutionTaskView; meta: { projectId: string } }> {
    return {
      data: await this.resolutions.request(projectId, documentId, versionId, traceId),
      meta: { projectId },
    };
  }

  @Get('entity-resolution')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async get(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ): Promise<{ data: EntityResolutionView; meta: { projectId: string } }> {
    return {
      data: await this.resolutions.getResolution(projectId, documentId, versionId),
      meta: { projectId },
    };
  }
}

@Controller('projects/:projectId/cross-chapter-entity-resolution-tasks')
@UseGuards(ProjectAccessGuard)
export class CrossChapterEntityResolutionTaskController {
  constructor(private readonly resolutions: CrossChapterEntityResolutionService) {}

  @Get(':taskId')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async getTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<{ data: EntityResolutionTaskView; meta: { projectId: string } }> {
    return { data: await this.resolutions.getTask(projectId, taskId), meta: { projectId } };
  }

  @Post(':taskId/retry')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'GENERATE',
    entityType: 'CrossChapterEntityResolutionTask',
    entityIdParam: 'taskId',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  async retry(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Headers('x-trace-id') traceId?: string,
  ): Promise<{ data: EntityResolutionTaskView; meta: { projectId: string } }> {
    return {
      data: await this.resolutions.retry(projectId, taskId, traceId),
      meta: { projectId },
    };
  }
}
