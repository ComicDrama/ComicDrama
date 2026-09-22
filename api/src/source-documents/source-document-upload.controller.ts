import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectAccessLevel } from '@prisma/client';
import { ProjectAccess } from '../access/project-access.decorator';
import { ProjectAccessGuard } from '../access/project-access.guard';
import { AuditAction } from '../audit/audit-action.decorator';
import {
  SourceDocumentParseService,
  type ParsedSourceVersionResult,
} from './source-document-parse.service';
import {
  SourceDocumentUploadService,
  type SourceUploadFile,
} from './source-document-upload.service';

@Controller('projects/:projectId/source-documents')
@UseGuards(ProjectAccessGuard)
export class SourceDocumentUploadController {
  constructor(
    private readonly uploads: SourceDocumentUploadService,
    private readonly parser: SourceDocumentParseService,
  ) {}

  @Post('upload')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'IMPORT',
    entityType: 'SourceDocumentUpload',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@Param('projectId') projectId: string, @UploadedFile() file?: SourceUploadFile) {
    if (!file) {
      throw new BadRequestException('必须上传名为 file 的文件字段');
    }

    return {
      data: await this.uploads.accept(projectId, file),
      meta: {
        projectId,
        message: '文件已写入对象存储；解析将在后续任务中完成',
      },
    };
  }

  @Post(':documentId/versions/:versionId/parse')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'IMPORT',
    entityType: 'SourceDocumentVersion',
    entityIdParam: 'versionId',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  async parse(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ): Promise<{ data: ParsedSourceVersionResult; meta: { projectId: string } }> {
    return {
      data: await this.parser.parseVersion(projectId, documentId, versionId),
      meta: { projectId },
    };
  }
}
