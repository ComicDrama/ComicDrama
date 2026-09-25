-- P3-10: deterministic narrative relationship, timeline, and event candidates.

CREATE TYPE "SourceVersionNarrativeStructureStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "NarrativeRelationshipKind" AS ENUM ('CO_OCCURRENCE');
CREATE TYPE "NarrativeEventParticipantRole" AS ENUM ('MENTIONED_IN_EVENT_CHAPTER');

CREATE TABLE "narrative_structures" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "sourceDocumentId" UUID NOT NULL,
  "sourceVersionId" UUID NOT NULL,
  "entityResolutionId" UUID NOT NULL,
  "analyzerName" VARCHAR(120) NOT NULL,
  "analyzerVersion" VARCHAR(50) NOT NULL,
  "status" "SourceVersionNarrativeStructureStatus" NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "analyzedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "narrative_structures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "narrative_relationship_candidates" (
  "id" UUID NOT NULL,
  "structureId" UUID NOT NULL,
  "sourceCanonicalEntityId" UUID NOT NULL,
  "targetCanonicalEntityId" UUID NOT NULL,
  "kind" "NarrativeRelationshipKind" NOT NULL DEFAULT 'CO_OCCURRENCE',
  "confidence" DOUBLE PRECISION,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "narrative_relationship_candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "narrative_relationship_evidence" (
  "id" UUID NOT NULL,
  "relationshipId" UUID NOT NULL,
  "chapterSegmentId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "narrative_relationship_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "narrative_event_candidates" (
  "id" UUID NOT NULL,
  "structureId" UUID NOT NULL,
  "canonicalEntityId" UUID NOT NULL,
  "sourceMemberId" UUID NOT NULL,
  "chapterSegmentId" UUID NOT NULL,
  "chapterOrdinal" INTEGER NOT NULL,
  "sourceOrdinal" INTEGER NOT NULL,
  "timelineOrder" INTEGER NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "confidence" DOUBLE PRECISION,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "narrative_event_candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "narrative_event_participants" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "canonicalEntityId" UUID NOT NULL,
  "role" "NarrativeEventParticipantRole" NOT NULL DEFAULT 'MENTIONED_IN_EVENT_CHAPTER',
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "narrative_event_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "narrative_structures_sourceVersionId_analyzerName_analyzerVersion_key" ON "narrative_structures"("sourceVersionId", "analyzerName", "analyzerVersion");
CREATE INDEX "narrative_structures_projectId_status_idx" ON "narrative_structures"("projectId", "status");
CREATE INDEX "narrative_structures_sourceDocumentId_idx" ON "narrative_structures"("sourceDocumentId");
CREATE UNIQUE INDEX "narrative_relationship_candidates_structureId_sourceCanonicalEntityId_targetCanonicalEntityId_kind_key" ON "narrative_relationship_candidates"("structureId", "sourceCanonicalEntityId", "targetCanonicalEntityId", "kind");
CREATE INDEX "narrative_relationship_candidates_structureId_kind_idx" ON "narrative_relationship_candidates"("structureId", "kind");
CREATE UNIQUE INDEX "narrative_relationship_evidence_relationshipId_chapterSegmentId_key" ON "narrative_relationship_evidence"("relationshipId", "chapterSegmentId");
CREATE INDEX "narrative_relationship_evidence_chapterSegmentId_idx" ON "narrative_relationship_evidence"("chapterSegmentId");
CREATE UNIQUE INDEX "narrative_event_candidates_structureId_sourceMemberId_key" ON "narrative_event_candidates"("structureId", "sourceMemberId");
CREATE INDEX "narrative_event_candidates_structureId_timelineOrder_idx" ON "narrative_event_candidates"("structureId", "timelineOrder");
CREATE INDEX "narrative_event_candidates_chapterSegmentId_idx" ON "narrative_event_candidates"("chapterSegmentId");
CREATE UNIQUE INDEX "narrative_event_participants_eventId_canonicalEntityId_role_key" ON "narrative_event_participants"("eventId", "canonicalEntityId", "role");
CREATE INDEX "narrative_event_participants_canonicalEntityId_idx" ON "narrative_event_participants"("canonicalEntityId");

ALTER TABLE "narrative_structures" ADD CONSTRAINT "narrative_structures_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "narrative_structures" ADD CONSTRAINT "narrative_structures_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "source_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "narrative_structures" ADD CONSTRAINT "narrative_structures_sourceVersionId_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "source_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "narrative_structures" ADD CONSTRAINT "narrative_structures_entityResolutionId_fkey" FOREIGN KEY ("entityResolutionId") REFERENCES "source_version_entity_resolutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "narrative_relationship_candidates" ADD CONSTRAINT "narrative_relationship_candidates_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "narrative_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "narrative_relationship_candidates" ADD CONSTRAINT "narrative_relationship_candidates_sourceCanonicalEntityId_fkey" FOREIGN KEY ("sourceCanonicalEntityId") REFERENCES "canonical_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "narrative_relationship_candidates" ADD CONSTRAINT "narrative_relationship_candidates_targetCanonicalEntityId_fkey" FOREIGN KEY ("targetCanonicalEntityId") REFERENCES "canonical_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "narrative_relationship_evidence" ADD CONSTRAINT "narrative_relationship_evidence_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "narrative_relationship_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "narrative_relationship_evidence" ADD CONSTRAINT "narrative_relationship_evidence_chapterSegmentId_fkey" FOREIGN KEY ("chapterSegmentId") REFERENCES "source_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "narrative_event_candidates" ADD CONSTRAINT "narrative_event_candidates_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "narrative_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "narrative_event_candidates" ADD CONSTRAINT "narrative_event_candidates_canonicalEntityId_fkey" FOREIGN KEY ("canonicalEntityId") REFERENCES "canonical_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "narrative_event_candidates" ADD CONSTRAINT "narrative_event_candidates_sourceMemberId_fkey" FOREIGN KEY ("sourceMemberId") REFERENCES "canonical_entity_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "narrative_event_candidates" ADD CONSTRAINT "narrative_event_candidates_chapterSegmentId_fkey" FOREIGN KEY ("chapterSegmentId") REFERENCES "source_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "narrative_event_participants" ADD CONSTRAINT "narrative_event_participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "narrative_event_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "narrative_event_participants" ADD CONSTRAINT "narrative_event_participants_canonicalEntityId_fkey" FOREIGN KEY ("canonicalEntityId") REFERENCES "canonical_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

