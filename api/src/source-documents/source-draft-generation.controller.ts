import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProjectAccessLevel } from '@prisma/client';
import { ProjectAccess } from '../access/project-access.decorator';
import { ProjectAccessGuard } from '../access/project-access.guard';
import { CurrentUserId } from '../access/auth-context';
import { AuditAction } from '../audit/audit-action.decorator';
import {
  SourceDraftGenerationService,
  type SourceDraftCorrectionInput,
} from './source-draft-generation.service';

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

  @Post('validate')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'REVIEW',
    entityType: 'SourceDraftGeneration',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  async validate(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ) {
    return {
      data: await this.drafts.validate(projectId, documentId, versionId),
      meta: { projectId },
    };
  }

  @Patch(':draftEntityId')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'UPDATE',
    entityType: 'SourceDraftEntity',
    entityIdParam: 'draftEntityId',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  async updateItem(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Param('draftEntityId') draftEntityId: string,
    @Body() input: SourceDraftCorrectionInput,
    @CurrentUserId() reviewerId?: string,
  ) {
    return {
      data: await this.drafts.updateItem(
        projectId,
        documentId,
        versionId,
        draftEntityId,
        input,
        reviewerId,
      ),
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
