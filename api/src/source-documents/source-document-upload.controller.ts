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
import { AuditAction } from '../audit/audit-action.decorator';
import { ProjectAccess } from '../access/project-access.decorator';
import { ProjectAccessGuard } from '../access/project-access.guard';
import {
  SourceDocumentUploadService,
  type SourceUploadFile,
} from './source-document-upload.service';

@Controller('projects/:projectId/source-documents')
@UseGuards(ProjectAccessGuard)
export class SourceDocumentUploadController {
  constructor(private readonly uploads: SourceDocumentUploadService) {}

  @Post('upload')
  @ProjectAccess(ProjectAccessLevel.EDIT)
  @AuditAction({
    action: 'IMPORT',
    entityType: 'SourceDocumentUpload',
    projectIdParam: 'projectId',
    captureResponseSnapshot: true,
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Param('projectId') projectId: string, @UploadedFile() file?: SourceUploadFile) {
    if (!file) {
      throw new BadRequestException('必须上传名为 file 的文件字段');
    }

    return {
      data: this.uploads.accept(file),
      meta: {
        projectId,
        message: '文件已接收；持久化到对象存储和解析将在后续任务中完成',
      },
    };
  }
}
