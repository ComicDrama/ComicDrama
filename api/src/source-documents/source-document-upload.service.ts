import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

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
  storageStatus: 'PENDING_STORAGE';
  parserStatus: 'PENDING_PARSER';
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
  accept(file: SourceUploadFile): AcceptedSourceUpload {
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

    return {
      uploadId: randomUUID(),
      fileName: file.originalname,
      documentType,
      mimeType: file.mimetype,
      byteSize: file.size,
      storageStatus: 'PENDING_STORAGE',
      parserStatus: 'PENDING_PARSER',
    };
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
}
