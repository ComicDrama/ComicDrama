CREATE TYPE "SourceDraftReviewStatus" AS ENUM ('PENDING', 'NEEDS_REVIEW', 'VALIDATED', 'CORRECTED');
ALTER TABLE "source_draft_entities" ADD COLUMN "validationStatus" "SourceDraftReviewStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "source_draft_entities" ADD COLUMN "validationErrors" JSONB;
ALTER TABLE "source_draft_entities" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "source_draft_entities" ADD COLUMN "reviewedBy" UUID;