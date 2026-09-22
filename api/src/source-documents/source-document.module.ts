import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access/access-control.module';
import { ObjectStorageModule } from './object-storage.module';
import { SourceDocumentUploadController } from './source-document-upload.controller';
import { SourceDocumentUploadService } from './source-document-upload.service';

@Module({
  imports: [AccessControlModule, ObjectStorageModule],
  controllers: [SourceDocumentUploadController],
  providers: [SourceDocumentUploadService],
  exports: [SourceDocumentUploadService],
})
export class SourceDocumentModule {}
