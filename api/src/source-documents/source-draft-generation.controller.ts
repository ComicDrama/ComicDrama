import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectAccessLevel } from '@prisma/client';
import { ProjectAccess } from '../access/project-access.decorator';
import { ProjectAccessGuard } from '../access/project-access.guard';
import { AuditAction } from '../audit/audit-action.decorator';
import { SourceDraftGenerationService } from './source-draft-generation.service';

@Controller('projects/:projectId/source-documents/:documentId/versions/:versionId/source-drafts')
@UseGuards(ProjectAccessGuard)
export class SourceDraftGenerationController {
  constructor(private readonly drafts: SourceDraftGenerationService) {}

  @Post()
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'GENERATE',
    entityType: 'SourceDraftGeneration',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  async generate(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ) {
    return {
      data: await this.drafts.generate(projectId, documentId, versionId),
      meta: { projectId },
    };
  }

  @Get()
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async get(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ) {
    return { data: await this.drafts.get(projectId, documentId, versionId), meta: { projectId } };
  }
}
