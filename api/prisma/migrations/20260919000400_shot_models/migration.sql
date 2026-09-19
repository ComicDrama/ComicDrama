-- P2-04: versioned shot design, dependencies and storyboard panels.

-- CreateEnum
CREATE TYPE "ShotStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ShotVersionStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ShotDependencyType" AS ENUM ('CONTINUITY', 'MATCH_CUT', 'CARRY_OVER', 'REFERENCE', 'TIMELINE');

-- CreateEnum
CREATE TYPE "StoryboardPanelType" AS ENUM ('KEYFRAME', 'THUMBNAIL', 'CAMERA_BOARD', 'ANNOTATION');

-- CreateEnum
CREATE TYPE "GenerationStrategy" AS ENUM ('NONE', 'TEXT_TO_VIDEO', 'IMAGE_TO_VIDEO', 'KEYFRAME_TO_VIDEO');

-- CreateTable
CREATE TABLE "shots" (
    "id" UUID NOT NULL,
    "scriptVersionId" UUID NOT NULL,
    "beatId" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "title" VARCHAR(200),
    "status" "ShotStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "shots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shot_versions" (
    "id" UUID NOT NULL,
    "shotId" UUID NOT NULL,
    "scriptVersionId" UUID NOT NULL,
    "parentVersionId" UUID,
    "sourceSegmentId" UUID,
    "version" INTEGER NOT NULL,
    "durationFrames" INTEGER NOT NULL,
    "shotSize" VARCHAR(80),
    "cameraAngle" VARCHAR(100),
    "cameraMovement" VARCHAR(150),
    "lens" VARCHAR(80),
    "action" TEXT,
    "dialogueNotes" TEXT,
    "generationStrategy" "GenerationStrategy" NOT NULL DEFAULT 'NONE',
    "characterRefs" JSONB,
    "characterActions" JSONB,
    "lighting" JSONB,
    "composition" JSONB,
    "continuity" JSONB,
    "audio" JSONB,
    "promptNotes" TEXT,
    "status" "ShotVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shot_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shot_dependencies" (
    "id" UUID NOT NULL,
    "fromShotId" UUID NOT NULL,
    "toShotId" UUID NOT NULL,
    "type" "ShotDependencyType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shot_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storyboard_panels" (
    "id" UUID NOT NULL,
    "shotVersionId" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "type" "StoryboardPanelType" NOT NULL DEFAULT 'KEYFRAME',
    "storageKey" VARCHAR(500),
    "thumbnailKey" VARCHAR(500),
    "mimeType" VARCHAR(120),
    "sha256" CHAR(64),
    "width" INTEGER,
    "height" INTEGER,
    "caption" TEXT,
    "annotations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storyboard_panels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shots_currentVersionId_key" ON "shots"("currentVersionId");

-- CreateIndex
CREATE INDEX "shots_scriptVersionId_status_idx" ON "shots"("scriptVersionId", "status");

-- CreateIndex
CREATE INDEX "shots_status_idx" ON "shots"("status");

-- CreateIndex
CREATE INDEX "shots_archivedAt_idx" ON "shots"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "shots_beatId_ordinal_key" ON "shots"("beatId", "ordinal");

-- CreateIndex
CREATE INDEX "shot_versions_scriptVersionId_status_idx" ON "shot_versions"("scriptVersionId", "status");

-- CreateIndex
CREATE INDEX "shot_versions_parentVersionId_idx" ON "shot_versions"("parentVersionId");

-- CreateIndex
CREATE INDEX "shot_versions_sourceSegmentId_idx" ON "shot_versions"("sourceSegmentId");

-- CreateIndex
CREATE UNIQUE INDEX "shot_versions_shotId_version_key" ON "shot_versions"("shotId", "version");

-- CreateIndex
CREATE INDEX "shot_dependencies_toShotId_idx" ON "shot_dependencies"("toShotId");

-- CreateIndex
CREATE UNIQUE INDEX "shot_dependencies_fromShotId_toShotId_type_key" ON "shot_dependencies"("fromShotId", "toShotId", "type");

-- CreateIndex
CREATE INDEX "storyboard_panels_shotVersionId_type_idx" ON "storyboard_panels"("shotVersionId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "storyboard_panels_shotVersionId_ordinal_key" ON "storyboard_panels"("shotVersionId", "ordinal");

-- AddForeignKey
ALTER TABLE "shots" ADD CONSTRAINT "shots_scriptVersionId_fkey" FOREIGN KEY ("scriptVersionId") REFERENCES "script_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shots" ADD CONSTRAINT "shots_beatId_fkey" FOREIGN KEY ("beatId") REFERENCES "beats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shots" ADD CONSTRAINT "shots_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "shot_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_versions" ADD CONSTRAINT "shot_versions_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "shots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_versions" ADD CONSTRAINT "shot_versions_scriptVersionId_fkey" FOREIGN KEY ("scriptVersionId") REFERENCES "script_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_versions" ADD CONSTRAINT "shot_versions_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "shot_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_versions" ADD CONSTRAINT "shot_versions_sourceSegmentId_fkey" FOREIGN KEY ("sourceSegmentId") REFERENCES "source_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_dependencies" ADD CONSTRAINT "shot_dependencies_fromShotId_fkey" FOREIGN KEY ("fromShotId") REFERENCES "shots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_dependencies" ADD CONSTRAINT "shot_dependencies_toShotId_fkey" FOREIGN KEY ("toShotId") REFERENCES "shots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storyboard_panels" ADD CONSTRAINT "storyboard_panels_shotVersionId_fkey" FOREIGN KEY ("shotVersionId") REFERENCES "shot_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
