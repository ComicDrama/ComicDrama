-- P3-08: chapter-scoped, source-traceable entity extraction results.

CREATE TYPE "ChapterEntityExtractionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "ExtractedEntityType" AS ENUM ('CHARACTER', 'LOCATION', 'PROP', 'ORGANIZATION', 'TIME', 'EVENT');

CREATE TABLE "chapter_entity_extractions" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "sourceDocumentId" UUID NOT NULL,
  "sourceVersionId" UUID NOT NULL,
  "chapterSegmentId" UUID NOT NULL,
  "extractorName" VARCHAR(120) NOT NULL,
  "extractorVersion" VARCHAR(50) NOT NULL,
  "status" "ChapterEntityExtractionStatus" NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "extractedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "chapter_entity_extractions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "extracted_entities" (
  "id" UUID NOT NULL,
  "extractionId" UUID NOT NULL,
  "type" "ExtractedEntityType" NOT NULL,
  "name" VARCHAR(300) NOT NULL,
  "normalizedName" VARCHAR(300) NOT NULL,
  "description" TEXT,
  "attributes" JSONB,
  "confidence" DOUBLE PRECISION,
  "ordinal" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "extracted_entities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "extracted_entity_mentions" (
  "id" UUID NOT NULL,
  "extractedEntityId" UUID NOT NULL,
  "sourceSegmentId" UUID NOT NULL,
  "text" TEXT NOT NULL,
  "startOffset" INTEGER NOT NULL,
  "endOffset" INTEGER NOT NULL,
  "startLine" INTEGER,
  "endLine" INTEGER,
  "evidence" TEXT,
  "confidence" DOUBLE PRECISION,
  "ordinal" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "extracted_entity_mentions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chapter_entity_extractions_sourceVersionId_chapterSegmentId_extractorName_extractorVersion_key" ON "chapter_entity_extractions"("sourceVersionId", "chapterSegmentId", "extractorName", "extractorVersion");
CREATE INDEX "chapter_entity_extractions_projectId_status_idx" ON "chapter_entity_extractions"("projectId", "status");
CREATE INDEX "chapter_entity_extractions_sourceDocumentId_idx" ON "chapter_entity_extractions"("sourceDocumentId");
CREATE INDEX "chapter_entity_extractions_chapterSegmentId_idx" ON "chapter_entity_extractions"("chapterSegmentId");
CREATE UNIQUE INDEX "extracted_entities_extractionId_ordinal_key" ON "extracted_entities"("extractionId", "ordinal");
CREATE INDEX "extracted_entities_extractionId_type_idx" ON "extracted_entities"("extractionId", "type");
CREATE INDEX "extracted_entities_type_normalizedName_idx" ON "extracted_entities"("type", "normalizedName");
CREATE UNIQUE INDEX "extracted_entity_mentions_extractedEntityId_ordinal_key" ON "extracted_entity_mentions"("extractedEntityId", "ordinal");
CREATE INDEX "extracted_entity_mentions_sourceSegmentId_startOffset_idx" ON "extracted_entity_mentions"("sourceSegmentId", "startOffset");

ALTER TABLE "chapter_entity_extractions" ADD CONSTRAINT "chapter_entity_extractions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chapter_entity_extractions" ADD CONSTRAINT "chapter_entity_extractions_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "source_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chapter_entity_extractions" ADD CONSTRAINT "chapter_entity_extractions_sourceVersionId_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "source_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chapter_entity_extractions" ADD CONSTRAINT "chapter_entity_extractions_chapterSegmentId_fkey" FOREIGN KEY ("chapterSegmentId") REFERENCES "source_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extracted_entities" ADD CONSTRAINT "extracted_entities_extractionId_fkey" FOREIGN KEY ("extractionId") REFERENCES "chapter_entity_extractions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extracted_entity_mentions" ADD CONSTRAINT "extracted_entity_mentions_extractedEntityId_fkey" FOREIGN KEY ("extractedEntityId") REFERENCES "extracted_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extracted_entity_mentions" ADD CONSTRAINT "extracted_entity_mentions_sourceSegmentId_fkey" FOREIGN KEY ("sourceSegmentId") REFERENCES "source_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
