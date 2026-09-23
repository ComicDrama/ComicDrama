import { Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectAccessLevel } from '@prisma/client';
import { ProjectAccess } from '../access/project-access.decorator';
import { ProjectAccessGuard } from '../access/project-access.guard';
import { AuditAction } from '../audit/audit-action.decorator';
import {
  SourceDocumentSegmentationService,
  type SegmentationTaskView,
} from './source-document-segmentation.service';

@Controller('projects/:projectId/source-document-tasks')
@UseGuards(ProjectAccessGuard)
export class SourceDocumentSegmentationController {
  constructor(private readonly tasks: SourceDocumentSegmentationService) {}

  @Get(':taskId')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async get(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<{ data: SegmentationTaskView; meta: { projectId: string } }> {
    return {
      data: await this.tasks.get(projectId, taskId),
      meta: { projectId },
    };
  }

  @Post(':taskId/retry')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'IMPORT',
    entityType: 'SourceDocumentSegmentationTask',
    entityIdParam: 'taskId',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  async retry(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Headers('x-trace-id') traceId?: string,
  ): Promise<{ data: SegmentationTaskView; meta: { projectId: string } }> {
    return {
      data: await this.tasks.retry(projectId, taskId, traceId),
      meta: { projectId },
    };
  }
}
