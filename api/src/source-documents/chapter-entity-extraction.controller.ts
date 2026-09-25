import { Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectAccessLevel } from '@prisma/client';
import { ProjectAccess } from '../access/project-access.decorator';
import { ProjectAccessGuard } from '../access/project-access.guard';
import { AuditAction } from '../audit/audit-action.decorator';
import {
  ChapterEntityExtractionService,
  type ChapterEntityExtractionTaskView,
  type ChapterEntityExtractionView,
} from './chapter-entity-extraction.service';

@Controller('projects/:projectId/source-documents/:documentId/versions/:versionId/chapters')
@UseGuards(ProjectAccessGuard)
export class ChapterEntityExtractionController {
  constructor(private readonly extractions: ChapterEntityExtractionService) {}

  @Post(':chapterSegmentId/entity-extractions')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'GENERATE',
    entityType: 'ChapterEntityExtractionTask',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  async request(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Param('chapterSegmentId') chapterSegmentId: string,
    @Headers('x-trace-id') traceId?: string,
  ): Promise<{ data: ChapterEntityExtractionTaskView; meta: { projectId: string } }> {
    return {
      data: await this.extractions.request(
        projectId,
        documentId,
        versionId,
        chapterSegmentId,
        traceId,
      ),
      meta: { projectId },
    };
  }

  @Get(':chapterSegmentId/entity-extractions')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async get(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Param('chapterSegmentId') chapterSegmentId: string,
  ): Promise<{ data: ChapterEntityExtractionView; meta: { projectId: string } }> {
    return {
      data: await this.extractions.getExtraction(
        projectId,
        documentId,
        versionId,
        chapterSegmentId,
      ),
      meta: { projectId },
    };
  }
}

@Controller('projects/:projectId/chapter-entity-extraction-tasks')
@UseGuards(ProjectAccessGuard)
export class ChapterEntityExtractionTaskController {
  constructor(private readonly extractions: ChapterEntityExtractionService) {}

  @Get(':taskId')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async getTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<{ data: ChapterEntityExtractionTaskView; meta: { projectId: string } }> {
    return { data: await this.extractions.getTask(projectId, taskId), meta: { projectId } };
  }

  @Post(':taskId/retry')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'GENERATE',
    entityType: 'ChapterEntityExtractionTask',
    entityIdParam: 'taskId',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  async retry(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Headers('x-trace-id') traceId?: string,
  ): Promise<{ data: ChapterEntityExtractionTaskView; meta: { projectId: string } }> {
    return { data: await this.extractions.retry(projectId, taskId, traceId), meta: { projectId } };
  }
}
