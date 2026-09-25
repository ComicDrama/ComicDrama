-- P3-09: cross-chapter entity consolidation and surface-form alias normalization.

CREATE TYPE "SourceVersionEntityResolutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "source_version_entity_resolutions" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "sourceDocumentId" UUID NOT NULL,
  "sourceVersionId" UUID NOT NULL,
  "normalizerName" VARCHAR(120) NOT NULL,
  "normalizerVersion" VARCHAR(50) NOT NULL,
  "status" "SourceVersionEntityResolutionStatus" NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "source_version_entity_resolutions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "canonical_entities" (
  "id" UUID NOT NULL,
  "resolutionId" UUID NOT NULL,
  "type" "ExtractedEntityType" NOT NULL,
  "canonicalName" VARCHAR(300) NOT NULL,
  "normalizedName" VARCHAR(300) NOT NULL,
  "confidence" DOUBLE PRECISION,
  "metadata" JSONB,
  "ordinal" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "canonical_entities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "canonical_entity_aliases" (
  "id" UUID NOT NULL,
  "canonicalEntityId" UUID NOT NULL,
  "name" VARCHAR(300) NOT NULL,
  "normalizedName" VARCHAR(300) NOT NULL,
  "isCanonical" BOOLEAN NOT NULL DEFAULT false,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "canonical_entity_aliases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "canonical_entity_members" (
  "id" UUID NOT NULL,
  "canonicalEntityId" UUID NOT NULL,
  "extractedEntityId" UUID NOT NULL,
  "matchMethod" VARCHAR(80) NOT NULL,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "canonical_entity_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "source_version_entity_resolutions_sourceVersionId_normalizerName_normalizerVersion_key" ON "source_version_entity_resolutions"("sourceVersionId", "normalizerName", "normalizerVersion");
CREATE INDEX "source_version_entity_resolutions_projectId_status_idx" ON "source_version_entity_resolutions"("projectId", "status");
CREATE INDEX "source_version_entity_resolutions_sourceDocumentId_idx" ON "source_version_entity_resolutions"("sourceDocumentId");
CREATE UNIQUE INDEX "canonical_entities_resolutionId_ordinal_key" ON "canonical_entities"("resolutionId", "ordinal");
CREATE UNIQUE INDEX "canonical_entities_resolutionId_type_normalizedName_key" ON "canonical_entities"("resolutionId", "type", "normalizedName");
CREATE INDEX "canonical_entities_resolutionId_type_idx" ON "canonical_entities"("resolutionId", "type");
CREATE UNIQUE INDEX "canonical_entity_aliases_canonicalEntityId_name_key" ON "canonical_entity_aliases"("canonicalEntityId", "name");
CREATE INDEX "canonical_entity_aliases_normalizedName_idx" ON "canonical_entity_aliases"("normalizedName");
CREATE UNIQUE INDEX "canonical_entity_members_extractedEntityId_key" ON "canonical_entity_members"("extractedEntityId");
CREATE INDEX "canonical_entity_members_canonicalEntityId_idx" ON "canonical_entity_members"("canonicalEntityId");

ALTER TABLE "source_version_entity_resolutions" ADD CONSTRAINT "source_version_entity_resolutions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "source_version_entity_resolutions" ADD CONSTRAINT "source_version_entity_resolutions_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "source_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "source_version_entity_resolutions" ADD CONSTRAINT "source_version_entity_resolutions_sourceVersionId_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "source_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "canonical_entities" ADD CONSTRAINT "canonical_entities_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "source_version_entity_resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "canonical_entity_aliases" ADD CONSTRAINT "canonical_entity_aliases_canonicalEntityId_fkey" FOREIGN KEY ("canonicalEntityId") REFERENCES "canonical_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "canonical_entity_members" ADD CONSTRAINT "canonical_entity_members_canonicalEntityId_fkey" FOREIGN KEY ("canonicalEntityId") REFERENCES "canonical_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "canonical_entity_members" ADD CONSTRAINT "canonical_entity_members_extractedEntityId_fkey" FOREIGN KEY ("extractedEntityId") REFERENCES "extracted_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
