import { Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectAccessLevel } from '@prisma/client';
import { ProjectAccess } from '../access/project-access.decorator';
import { ProjectAccessGuard } from '../access/project-access.guard';
import { AuditAction } from '../audit/audit-action.decorator';
import {
  NarrativeStructureService,
  type NarrativeStructureTaskView,
  type NarrativeStructureView,
} from './narrative-structure.service';

@Controller('projects/:projectId/source-documents/:documentId/versions/:versionId')
@UseGuards(ProjectAccessGuard)
export class NarrativeStructureController {
  constructor(private readonly structures: NarrativeStructureService) {}

  @Post('narrative-structure')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'GENERATE',
    entityType: 'NarrativeStructureTask',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  async request(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Headers('x-trace-id') traceId?: string,
  ): Promise<{ data: NarrativeStructureTaskView; meta: { projectId: string } }> {
    return {
      data: await this.structures.request(projectId, documentId, versionId, traceId),
      meta: { projectId },
    };
  }

  @Get('narrative-structure')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async get(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ): Promise<{ data: NarrativeStructureView; meta: { projectId: string } }> {
    return {
      data: await this.structures.getStructure(projectId, documentId, versionId),
      meta: { projectId },
    };
  }
}

@Controller('projects/:projectId/narrative-structure-tasks')
@UseGuards(ProjectAccessGuard)
export class NarrativeStructureTaskController {
  constructor(private readonly structures: NarrativeStructureService) {}

  @Get(':taskId')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async getTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<{ data: NarrativeStructureTaskView; meta: { projectId: string } }> {
    return { data: await this.structures.getTask(projectId, taskId), meta: { projectId } };
  }

  @Post(':taskId/retry')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'GENERATE',
    entityType: 'NarrativeStructureTask',
    entityIdParam: 'taskId',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  async retry(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Headers('x-trace-id') traceId?: string,
  ): Promise<{ data: NarrativeStructureTaskView; meta: { projectId: string } }> {
    return { data: await this.structures.retry(projectId, taskId, traceId), meta: { projectId } };
  }
}
