import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ProjectAccessLevel } from '@prisma/client';
import { ProjectAccess } from '../access/project-access.decorator';
import { ProjectAccessGuard } from '../access/project-access.guard';
import {
  SourceDocumentReadService,
  type SourceDocumentPreview,
  type SourceSegmentLocation,
  type SourceSegmentSummary,
} from './source-document-read.service';

@Controller('projects/:projectId/source-documents')
@UseGuards(ProjectAccessGuard)
export class SourceDocumentReadController {
  constructor(private readonly reads: SourceDocumentReadService) {}

  @Get(':documentId/versions/:versionId/preview')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async preview(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Query('segmentId') segmentId?: string,
    @Query('startOffset') startOffset?: string,
    @Query('endOffset') endOffset?: string,
  ): Promise<{ data: SourceDocumentPreview; meta: { projectId: string } }> {
    if (segmentId && (startOffset !== undefined || endOffset !== undefined)) {
      throw new BadRequestException('segmentId 不能与 startOffset 或 endOffset 同时使用');
    }
    return {
      data: await this.reads.getPreview(projectId, documentId, versionId, {
        segmentId,
        startOffset,
        endOffset,
      }),
      meta: { projectId },
    };
  }

  @Get(':documentId/versions/:versionId/segments')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async segments(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Query('type') type?: string,
    @Query('parentId') parentId?: string,
    @Query('offset') offset?: string,
  ): Promise<{
    data: SourceSegmentSummary[];
    meta: { projectId: string; documentId: string; versionId: string };
  }> {
    const result = await this.reads.listSegments(projectId, documentId, versionId, {
      type,
      parentId,
      offset,
    });
    return {
      data: result.segments,
      meta: { projectId, documentId, versionId },
    };
  }

  @Get(':documentId/versions/:versionId/segments/:segmentId')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  async segment(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Param('segmentId') segmentId: string,
  ): Promise<{
    data: SourceSegmentLocation;
    meta: { projectId: string; documentId: string; versionId: string };
  }> {
    return {
      data: await this.reads.getSegment(projectId, documentId, versionId, segmentId),
      meta: { projectId, documentId, versionId },
    };
  }
}
