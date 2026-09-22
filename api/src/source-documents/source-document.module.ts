import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access/access-control.module';
import { VersioningModule } from '../versioning/versioning.module';
import { ObjectStorageModule } from './object-storage.module';
import { SourceDocumentParseService } from './source-document-parse.service';
import { SourceDocumentReadController } from './source-document-read.controller';
import { SourceDocumentReadService } from './source-document-read.service';
import { SourceDocumentParserRegistryService } from './source-document-parser-registry.service';
import { SourceDocumentParserService } from './source-document-parser.service';
import { SourceDocumentUploadController } from './source-document-upload.controller';
import { SourceDocumentUploadService } from './source-document-upload.service';

@Module({
  imports: [AccessControlModule, ObjectStorageModule, VersioningModule],
  controllers: [SourceDocumentUploadController, SourceDocumentReadController],
  providers: [
    SourceDocumentParseService,
    SourceDocumentParserService,
    SourceDocumentParserRegistryService,
    SourceDocumentReadService,
    SourceDocumentUploadService,
  ],
  exports: [
    SourceDocumentParseService,
    SourceDocumentParserService,
    SourceDocumentParserRegistryService,
    SourceDocumentReadService,
    SourceDocumentUploadService,
  ],
})
export class SourceDocumentModule {}
