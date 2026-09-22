import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access/access-control.module';
import { VersioningModule } from '../versioning/versioning.module';
import { ObjectStorageModule } from './object-storage.module';
import { SourceDocumentParseService } from './source-document-parse.service';
import { SourceDocumentParserService } from './source-document-parser.service';
import { SourceDocumentUploadController } from './source-document-upload.controller';
import { SourceDocumentUploadService } from './source-document-upload.service';

@Module({
  imports: [AccessControlModule, ObjectStorageModule, VersioningModule],
  controllers: [SourceDocumentUploadController],
  providers: [SourceDocumentParseService, SourceDocumentParserService, SourceDocumentUploadService],
  exports: [SourceDocumentParseService, SourceDocumentParserService, SourceDocumentUploadService],
})
export class SourceDocumentModule {}
