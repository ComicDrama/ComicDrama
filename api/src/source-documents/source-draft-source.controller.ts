import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ProjectAccessLevel } from '@prisma/client';
import { ProjectAccess } from '../access/project-access.decorator';
import { ProjectAccessGuard } from '../access/project-access.guard';
import {
  SourceDraftSourceService,
  type SourceDraftCitationSource,
} from './source-draft-source.service';

@Controller('projects/:projectId/source-documents/:documentId/versions/:versionId/source-drafts')
@UseGuards(ProjectAccessGuard)
export class SourceDraftSourceController {
  constructor(private readonly sources: SourceDraftSourceService) {}

  @Get(':draftEntityId/sources')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async getSources(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Param('draftEntityId') draftEntityId: string,
    @Query('contextBefore') contextBefore?: string,
    @Query('contextAfter') contextAfter?: string,
  ): Promise<{
    data: { draftEntity: unknown; generation: unknown; sources: SourceDraftCitationSource[] };
    meta: { projectId: string; documentId: string; versionId: string };
  }> {
    return {
      data: await this.sources.getSources(projectId, documentId, versionId, draftEntityId, {
        contextBefore,
        contextAfter,
      }),
      meta: { projectId, documentId, versionId },
    };
  }
}
