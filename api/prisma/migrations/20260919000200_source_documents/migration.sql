-- P2-02: immutable source document versions and source segments.

CREATE TYPE "SourceDocumentType" AS ENUM ('TXT', 'MARKDOWN', 'DOCX', 'EPUB', 'PDF', 'FOUNTAIN', 'FINAL_DRAFT_XML', 'UNKNOWN');
CREATE TYPE "SourceDocumentStatus" AS ENUM ('DRAFT', 'IMPORTING', 'READY', 'FAILED', 'ARCHIVED');
CREATE TYPE "SourceVersionStatus" AS ENUM ('IMPORTING', 'PARSING', 'READY', 'FAILED');
CREATE TYPE "SourceSegmentType" AS ENUM ('DOCUMENT', 'CHAPTER', 'SECTION', 'PARAGRAPH');

CREATE TABLE "source_documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "projectId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "documentType" "SourceDocumentType" NOT NULL,
    "status" "SourceDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" UUID,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "source_document_versions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "documentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileExtension" VARCHAR(20),
    "mimeType" VARCHAR(120),
    "byteSize" BIGINT,
    "sha256" CHAR(64) NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "textContent" TEXT,
    "parserName" VARCHAR(100),
    "parserVersion" VARCHAR(50),
    "status" "SourceVersionStatus" NOT NULL DEFAULT 'IMPORTING',
    "errorMessage" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_document_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "source_segments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "versionId" UUID NOT NULL,
    "parentId" UUID,
    "type" "SourceSegmentType" NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "title" VARCHAR(300),
    "content" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "startLine" INTEGER,
    "endLine" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_segments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "source_documents_currentVersionId_key" ON "source_documents"("currentVersionId");
CREATE UNIQUE INDEX "source_document_versions_documentId_version_key" ON "source_document_versions"("documentId", "version");
CREATE INDEX "source_documents_projectId_status_idx" ON "source_documents"("projectId", "status");
CREATE INDEX "source_documents_archivedAt_idx" ON "source_documents"("archivedAt");
CREATE INDEX "source_document_versions_documentId_status_idx" ON "source_document_versions"("documentId", "status");
CREATE INDEX "source_document_versions_sha256_idx" ON "source_document_versions"("sha256");
CREATE UNIQUE INDEX "source_segments_versionId_ordinal_key" ON "source_segments"("versionId", "ordinal");
CREATE INDEX "source_segments_versionId_type_idx" ON "source_segments"("versionId", "type");
CREATE INDEX "source_segments_parentId_idx" ON "source_segments"("parentId");

ALTER TABLE "source_documents"
    ADD CONSTRAINT "source_documents_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "source_document_versions"
    ADD CONSTRAINT "source_document_versions_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "source_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "source_segments"
    ADD CONSTRAINT "source_segments_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "source_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "source_segments"
    ADD CONSTRAINT "source_segments_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "source_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "source_documents"
    ADD CONSTRAINT "source_documents_currentVersionId_fkey"
    FOREIGN KEY ("currentVersionId") REFERENCES "source_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
