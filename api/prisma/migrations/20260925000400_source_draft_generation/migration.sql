CREATE TYPE "SourceDraftGenerationStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "SourceDraftKind" AS ENUM ('WORLD', 'CHARACTER', 'LOCATION', 'PROP');

CREATE TABLE "source_draft_generations" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "sourceDocumentId" UUID NOT NULL,
    "sourceVersionId" UUID NOT NULL,
    "entityResolutionId" UUID NOT NULL,
    "generatorName" VARCHAR(120) NOT NULL,
    "generatorVersion" VARCHAR(50) NOT NULL,
    "status" "SourceDraftGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "source_draft_generations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "source_draft_entities" (
    "id" UUID NOT NULL,
    "generationId" UUID NOT NULL,
    "canonicalEntityId" UUID,
    "kind" "SourceDraftKind" NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "source_draft_entities_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "source_draft_citations" (
    "id" UUID NOT NULL,
    "draftEntityId" UUID NOT NULL,
    "sourceSegmentId" UUID NOT NULL,
    "canonicalMemberId" UUID,
    "quote" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "startLine" INTEGER,
    "endLine" INTEGER,
    "evidenceType" VARCHAR(80) NOT NULL DEFAULT 'DIRECT_MENTION',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "source_draft_citations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "source_draft_generations_sourceVersionId_generatorName_gener_key" ON "source_draft_generations"("sourceVersionId", "generatorName", "generatorVersion");
CREATE INDEX "source_draft_generations_projectId_status_idx" ON "source_draft_generations"("projectId", "status");
CREATE INDEX "source_draft_generations_sourceDocumentId_idx" ON "source_draft_generations"("sourceDocumentId");
CREATE UNIQUE INDEX "source_draft_entities_generationId_kind_ordinal_key" ON "source_draft_entities"("generationId", "kind", "ordinal");
CREATE INDEX "source_draft_entities_generationId_kind_idx" ON "source_draft_entities"("generationId", "kind");
CREATE INDEX "source_draft_entities_canonicalEntityId_idx" ON "source_draft_entities"("canonicalEntityId");
CREATE UNIQUE INDEX "source_draft_citations_draftEntityId_sourceSegmentId_startO_key" ON "source_draft_citations"("draftEntityId", "sourceSegmentId", "startOffset", "endOffset");
CREATE INDEX "source_draft_citations_sourceSegmentId_idx" ON "source_draft_citations"("sourceSegmentId");
CREATE INDEX "source_draft_citations_canonicalMemberId_idx" ON "source_draft_citations"("canonicalMemberId");
ALTER TABLE "source_draft_generations" ADD CONSTRAINT "source_draft_generations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "source_draft_generations" ADD CONSTRAINT "source_draft_generations_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "source_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "source_draft_generations" ADD CONSTRAINT "source_draft_generations_sourceVersionId_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "source_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "source_draft_generations" ADD CONSTRAINT "source_draft_generations_entityResolutionId_fkey" FOREIGN KEY ("entityResolutionId") REFERENCES "source_version_entity_resolutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "source_draft_entities" ADD CONSTRAINT "source_draft_entities_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "source_draft_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "source_draft_entities" ADD CONSTRAINT "source_draft_entities_canonicalEntityId_fkey" FOREIGN KEY ("canonicalEntityId") REFERENCES "canonical_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "source_draft_citations" ADD CONSTRAINT "source_draft_citations_draftEntityId_fkey" FOREIGN KEY ("draftEntityId") REFERENCES "source_draft_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "source_draft_citations" ADD CONSTRAINT "source_draft_citations_sourceSegmentId_fkey" FOREIGN KEY ("sourceSegmentId") REFERENCES "source_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "source_draft_citations" ADD CONSTRAINT "source_draft_citations_canonicalMemberId_fkey" FOREIGN KEY ("canonicalMemberId") REFERENCES "canonical_entity_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
