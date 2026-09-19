-- CreateEnum
CREATE TYPE "ReviewTargetType" AS ENUM ('SCRIPT_VERSION', 'SHOT_VERSION', 'ASSET_VERSION', 'TIMELINE_VERSION', 'RENDER_JOB', 'MEDIA_OBJECT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewCommentStatus" AS ENUM ('OPEN', 'RESOLVED', 'WONT_FIX');

-- CreateEnum
CREATE TYPE "ApprovalRole" AS ENUM ('REVIEWER', 'DIRECTOR', 'PRODUCER', 'EDITOR', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "RenderJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RenderSegmentStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'CACHED', 'FAILED', 'CANCELLED');



-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "targetType" "ReviewTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "title" VARCHAR(240),
    "summary" TEXT,
    "metadata" JSONB,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_comments" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "authorId" VARCHAR(120),
    "body" TEXT NOT NULL,
    "timecodeFrame" INTEGER,
    "targetPath" VARCHAR(300),
    "status" "ReviewCommentStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" VARCHAR(120),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_approvals" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "reviewerId" VARCHAR(120) NOT NULL,
    "role" "ApprovalRole" NOT NULL,
    "decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_jobs" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "timelineVersionId" UUID NOT NULL,
    "exportPresetId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(240),
    "status" "RenderJobStatus" NOT NULL DEFAULT 'QUEUED',
    "outputStorageKey" VARCHAR(500),
    "outputFileName" VARCHAR(255),
    "mimeType" VARCHAR(120),
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "errorCode" VARCHAR(80),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "render_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_segments" (
    "id" UUID NOT NULL,
    "renderJobId" UUID NOT NULL,
    "segmentIndex" INTEGER NOT NULL,
    "startFrame" INTEGER NOT NULL,
    "endFrame" INTEGER NOT NULL,
    "status" "RenderSegmentStatus" NOT NULL DEFAULT 'PENDING',
    "cacheKey" VARCHAR(500),
    "storageKey" VARCHAR(500),
    "durationMs" INTEGER,
    "errorCode" VARCHAR(80),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "render_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_presets" (
    "id" UUID NOT NULL,
    "projectId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "container" VARCHAR(40) NOT NULL,
    "videoCodec" VARCHAR(80),
    "audioCodec" VARCHAR(80),
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fps" DOUBLE PRECISION NOT NULL,
    "bitrate" INTEGER,
    "audioSampleRate" INTEGER,
    "aspectRatio" VARCHAR(20),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_projectId_status_idx" ON "reviews"("projectId", "status");

-- CreateIndex
CREATE INDEX "reviews_targetType_targetId_revision_idx" ON "reviews"("targetType", "targetId", "revision");

-- CreateIndex
CREATE INDEX "review_comments_reviewId_status_createdAt_idx" ON "review_comments"("reviewId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "review_comments_authorId_idx" ON "review_comments"("authorId");

-- CreateIndex
CREATE INDEX "review_approvals_reviewId_decision_idx" ON "review_approvals"("reviewId", "decision");

-- CreateIndex
CREATE INDEX "review_approvals_reviewerId_createdAt_idx" ON "review_approvals"("reviewerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "render_jobs_idempotencyKey_key" ON "render_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "render_jobs_projectId_status_createdAt_idx" ON "render_jobs"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "render_jobs_timelineVersionId_createdAt_idx" ON "render_jobs"("timelineVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "render_jobs_exportPresetId_idx" ON "render_jobs"("exportPresetId");

-- CreateIndex
CREATE INDEX "render_segments_renderJobId_status_segmentIndex_idx" ON "render_segments"("renderJobId", "status", "segmentIndex");

-- CreateIndex
CREATE INDEX "render_segments_cacheKey_idx" ON "render_segments"("cacheKey");

-- CreateIndex
CREATE UNIQUE INDEX "render_segments_renderJobId_segmentIndex_key" ON "render_segments"("renderJobId", "segmentIndex");

-- CreateIndex
CREATE INDEX "export_presets_projectId_isDefault_idx" ON "export_presets"("projectId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "export_presets_projectId_slug_key" ON "export_presets"("projectId", "slug");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_approvals" ADD CONSTRAINT "review_approvals_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_jobs" ADD CONSTRAINT "render_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_jobs" ADD CONSTRAINT "render_jobs_timelineVersionId_fkey" FOREIGN KEY ("timelineVersionId") REFERENCES "timeline_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_jobs" ADD CONSTRAINT "render_jobs_exportPresetId_fkey" FOREIGN KEY ("exportPresetId") REFERENCES "export_presets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_segments" ADD CONSTRAINT "render_segments_renderJobId_fkey" FOREIGN KEY ("renderJobId") REFERENCES "render_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_presets" ADD CONSTRAINT "export_presets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
