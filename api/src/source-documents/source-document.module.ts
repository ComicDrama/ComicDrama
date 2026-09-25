import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access/access-control.module';
import { VersioningModule } from '../versioning/versioning.module';
import { BuiltinChapterEntityExtractor } from './builtin-chapter-entity-extractor.service';
import { BuiltinEntityNormalizer } from './builtin-entity-normalizer.service';
import {
  ChapterEntityExtractionController,
  ChapterEntityExtractionTaskController,
} from './chapter-entity-extraction.controller';
import { ChapterEntityExtractionService } from './chapter-entity-extraction.service';
import {
  CrossChapterEntityResolutionController,
  CrossChapterEntityResolutionTaskController,
} from './cross-chapter-entity-resolution.controller';
import { CrossChapterEntityResolutionService } from './cross-chapter-entity-resolution.service';
import {
  NarrativeStructureController,
  NarrativeStructureTaskController,
} from './narrative-structure.controller';
import {
  NarrativeStructureBuilder,
  NarrativeStructureService,
} from './narrative-structure.service';
import { ObjectStorageModule } from './object-storage.module';
import { SourceDraftGenerationController } from './source-draft-generation.controller';
import { SourceDraftSourceController } from './source-draft-source.controller';
import { SourceDraftGenerationService } from './source-draft-generation.service';
import { SourceDraftSourceService } from './source-draft-source.service';
import { SourceDocumentParseService } from './source-document-parse.service';
import { SourceDocumentReadController } from './source-document-read.controller';
import { SourceDocumentReadService } from './source-document-read.service';
import { SourceDocumentSegmentationController } from './source-document-segmentation.controller';
import { SourceDocumentSegmentationService } from './source-document-segmentation.service';
import { SourceDocumentParserRegistryService } from './source-document-parser-registry.service';
import { SourceDocumentParserService } from './source-document-parser.service';
import { SourceDocumentUploadController } from './source-document-upload.controller';
import { SourceDocumentUploadService } from './source-document-upload.service';

@Module({
  imports: [AccessControlModule, ObjectStorageModule, VersioningModule],
  controllers: [
    SourceDocumentUploadController,
    SourceDocumentReadController,
    SourceDocumentSegmentationController,
    ChapterEntityExtractionController,
    ChapterEntityExtractionTaskController,
    CrossChapterEntityResolutionController,
    CrossChapterEntityResolutionTaskController,
    NarrativeStructureController,
    NarrativeStructureTaskController,
    SourceDraftGenerationController,
    SourceDraftSourceController,
  ],
  providers: [
    SourceDocumentParseService,
    SourceDocumentParserService,
    SourceDocumentParserRegistryService,
    SourceDocumentReadService,
    SourceDocumentSegmentationService,
    BuiltinChapterEntityExtractor,
    BuiltinEntityNormalizer,
    ChapterEntityExtractionService,
    CrossChapterEntityResolutionService,
    NarrativeStructureBuilder,
    NarrativeStructureService,
    SourceDraftGenerationService,
    SourceDraftSourceService,
    SourceDocumentUploadService,
  ],
  exports: [
    SourceDocumentParseService,
    SourceDocumentParserService,
    SourceDocumentParserRegistryService,
    SourceDocumentReadService,
    SourceDocumentSegmentationService,
    BuiltinChapterEntityExtractor,
    BuiltinEntityNormalizer,
    ChapterEntityExtractionService,
    CrossChapterEntityResolutionService,
    NarrativeStructureBuilder,
    NarrativeStructureService,
    SourceDraftGenerationService,
    SourceDraftSourceService,
    SourceDocumentUploadService,
  ],
})
export class SourceDocumentModule {}
