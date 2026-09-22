import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SourceDocumentStatus, SourceDocumentType, SourceVersionStatus } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { VersioningService } from '../versioning/versioning.service';
import { ObjectStorageService } from './object-storage.service';

export type UploadDocumentType = 'TXT' | 'MARKDOWN' | 'DOCX';

export interface SourceUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
}

export interface AcceptedSourceUpload {
  uploadId: string;
  fileName: string;
  documentType: UploadDocumentType;
  mimeType: string;
  byteSize: number;
  sha256: string;
  storageKey: string;
  storageStatus: 'STORED';
  parserStatus: 'PENDING_PARSER';
  documentId: string;
  versionId: string;
  version: number;
}

const FILE_RULES: Record<UploadDocumentType, { extensions: string[]; mimeTypes: string[] }> = {
  TXT: {
    extensions: ['.txt'],
    mimeTypes: ['text/plain', 'application/octet-stream'],
  },
  MARKDOWN: {
    extensions: ['.md', '.markdown'],
    mimeTypes: ['text/markdown', 'text/plain', 'application/octet-stream'],
  },
  DOCX: {
    extensions: ['.docx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
    ],
  },
};

@Injectable()
export class SourceDocumentUploadService {
  constructor(
    private readonly objectStorage: ObjectStorageService,
    private readonly versioning: VersioningService,
  ) {}

  async accept(projectId: string, file: SourceUploadFile): Promise<AcceptedSourceUpload> {
    const documentType = this.validateFile(file);
    const buffer = file.buffer as Buffer;
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const uploadId = randomUUID();
    const extension = extname(file.originalname).toLowerCase();
    const storageKey = `projects/${projectId}/source/uploads/${uploadId}/original${extension}`;

    try {
      await this.objectStorage.putObject({
        key: storageKey,
        body: buffer,
        contentType: file.mimetype,
        contentLength: file.size,
        sha256,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `原始文件写入对象存储失败: ${this.describeError(error)}`,
      );
    }

    let documentVersion: Awaited<ReturnType<VersioningService['createSourceDocumentWithVersion']>>;
    try {
      documentVersion = await this.versioning.createSourceDocumentWithVersion({
        projectId,
        document: {
          name: file.originalname,
          documentType: documentType as SourceDocumentType,
          status: SourceDocumentStatus.IMPORTING,
        },
        version: {
          fileName: file.originalname,
          fileExtension: extension,
          mimeType: file.mimetype,
          byteSize: BigInt(file.size),
          sha256,
          storageKey,
          status: SourceVersionStatus.IMPORTING,
        },
      });
    } catch (error) {
      await this.objectStorage.deleteObject(storageKey);
      throw new InternalServerErrorException(`原文版本登记失败: ${this.describeError(error)}`);
    }

    return {
      uploadId,
      fileName: file.originalname,
      documentType,
      mimeType: file.mimetype,
      byteSize: file.size,
      sha256,
      storageKey,
      storageStatus: 'STORED',
      parserStatus: 'PENDING_PARSER',
      documentId: documentVersion.document.id,
      versionId: documentVersion.version.id,
      version: documentVersion.version.version,
    };
  }

  private validateFile(file: SourceUploadFile): UploadDocumentType {
    if (!file?.originalname || !file.buffer) {
      throw new BadRequestException('必须上传名为 file 的文件字段');
    }
    if (file.size <= 0) {
      throw new BadRequestException('上传文件不能为空');
    }

    const extension = extname(file.originalname).toLowerCase();
    const documentType = this.resolveDocumentType(extension);
    const rule = FILE_RULES[documentType];
    const mimeType = file.mimetype.toLowerCase();
    if (!rule.mimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `文件扩展名与 MIME 类型不匹配，仅支持 ${rule.mimeTypes.join('、')}`,
      );
    }
    return documentType;
  }

  private resolveDocumentType(extension: string): UploadDocumentType {
    for (const [documentType, rule] of Object.entries(FILE_RULES) as [
      UploadDocumentType,
      (typeof FILE_RULES)[UploadDocumentType],
    ][]) {
      if (rule.extensions.includes(extension)) {
        return documentType;
      }
    }
    throw new BadRequestException('仅支持 TXT、DOCX 和 Markdown 文件');
  }

  private describeError(error: unknown): string {
    return error instanceof Error ? error.message : '未知错误';
  }
}
