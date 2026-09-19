-- CreateEnum
CREATE TYPE "TimelineStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TimelineVersionStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrackType" AS ENUM ('VIDEO', 'AUDIO', 'SUBTITLE');

-- CreateEnum
CREATE TYPE "ClipSourceType" AS ENUM ('ASSET_VERSION', 'GENERATION_CANDIDATE');

-- CreateEnum
CREATE TYPE "TransitionType" AS ENUM ('CUT', 'DISSOLVE', 'FADE_IN', 'FADE_OUT', 'WIPE', 'SLIDE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "KeyframeProperty" AS ENUM ('POSITION', 'SCALE', 'ROTATION', 'OPACITY', 'VOLUME', 'COLOR', 'BLUR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InterpolationType" AS ENUM ('STEP', 'LINEAR', 'BEZIER');

-- CreateTable
CREATE TABLE "timelines" (
    "id" UUID NOT NULL,
    "episodeId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "TimelineStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_versions" (
    "id" UUID NOT NULL,
    "timelineId" UUID NOT NULL,
    "parentVersionId" UUID,
    "version" INTEGER NOT NULL,
    "status" "TimelineVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "timebase" INTEGER NOT NULL DEFAULT 24,
    "durationFrames" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_tracks" (
    "id" UUID NOT NULL,
    "timelineVersionId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "TrackType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "volume" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_clips" (
    "id" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "sourceType" "ClipSourceType" NOT NULL,
    "assetVersionId" UUID,
    "generationCandidateId" UUID,
    "timelineStartFrame" INTEGER NOT NULL,
    "durationFrames" INTEGER NOT NULL,
    "sourceInFrame" INTEGER NOT NULL DEFAULT 0,
    "sourceOutFrame" INTEGER,
    "playbackRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "transform" JSONB,
    "effects" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_transitions" (
    "id" UUID NOT NULL,
    "timelineVersionId" UUID NOT NULL,
    "outgoingClipId" UUID NOT NULL,
    "incomingClipId" UUID NOT NULL,
    "type" "TransitionType" NOT NULL,
    "startFrame" INTEGER NOT NULL,
    "durationFrames" INTEGER NOT NULL,
    "parameters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_keyframes" (
    "id" UUID NOT NULL,
    "clipId" UUID NOT NULL,
    "property" "KeyframeProperty" NOT NULL,
    "frame" INTEGER NOT NULL,
    "value" JSONB NOT NULL,
    "interpolation" "InterpolationType" NOT NULL DEFAULT 'LINEAR',
    "easing" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_keyframes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timelines_currentVersionId_key" ON "timelines"("currentVersionId");

-- CreateIndex
CREATE INDEX "timelines_episodeId_status_idx" ON "timelines"("episodeId", "status");

-- CreateIndex
CREATE INDEX "timelines_archivedAt_idx" ON "timelines"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "timelines_episodeId_name_key" ON "timelines"("episodeId", "name");

-- CreateIndex
CREATE INDEX "timeline_versions_timelineId_status_idx" ON "timeline_versions"("timelineId", "status");

-- CreateIndex
CREATE INDEX "timeline_versions_parentVersionId_idx" ON "timeline_versions"("parentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_versions_timelineId_version_key" ON "timeline_versions"("timelineId", "version");

-- CreateIndex
CREATE INDEX "timeline_tracks_timelineVersionId_type_sortOrder_idx" ON "timeline_tracks"("timelineVersionId", "type", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_tracks_timelineVersionId_name_key" ON "timeline_tracks"("timelineVersionId", "name");

-- CreateIndex
CREATE INDEX "timeline_clips_trackId_timelineStartFrame_idx" ON "timeline_clips"("trackId", "timelineStartFrame");

-- CreateIndex
CREATE INDEX "timeline_clips_assetVersionId_idx" ON "timeline_clips"("assetVersionId");

-- CreateIndex
CREATE INDEX "timeline_clips_generationCandidateId_idx" ON "timeline_clips"("generationCandidateId");

-- CreateIndex
CREATE INDEX "timeline_transitions_timelineVersionId_startFrame_idx" ON "timeline_transitions"("timelineVersionId", "startFrame");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_transitions_outgoingClipId_incomingClipId_key" ON "timeline_transitions"("outgoingClipId", "incomingClipId");

-- CreateIndex
CREATE INDEX "timeline_keyframes_clipId_property_frame_idx" ON "timeline_keyframes"("clipId", "property", "frame");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_keyframes_clipId_property_frame_key" ON "timeline_keyframes"("clipId", "property", "frame");

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "timeline_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_versions" ADD CONSTRAINT "timeline_versions_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "timelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_versions" ADD CONSTRAINT "timeline_versions_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "timeline_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_tracks" ADD CONSTRAINT "timeline_tracks_timelineVersionId_fkey" FOREIGN KEY ("timelineVersionId") REFERENCES "timeline_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_clips" ADD CONSTRAINT "timeline_clips_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "timeline_tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_clips" ADD CONSTRAINT "timeline_clips_assetVersionId_fkey" FOREIGN KEY ("assetVersionId") REFERENCES "asset_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_clips" ADD CONSTRAINT "timeline_clips_generationCandidateId_fkey" FOREIGN KEY ("generationCandidateId") REFERENCES "generation_candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_transitions" ADD CONSTRAINT "timeline_transitions_timelineVersionId_fkey" FOREIGN KEY ("timelineVersionId") REFERENCES "timeline_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_transitions" ADD CONSTRAINT "timeline_transitions_outgoingClipId_fkey" FOREIGN KEY ("outgoingClipId") REFERENCES "timeline_clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_transitions" ADD CONSTRAINT "timeline_transitions_incomingClipId_fkey" FOREIGN KEY ("incomingClipId") REFERENCES "timeline_clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_keyframes" ADD CONSTRAINT "timeline_keyframes_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "timeline_clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
