-- P2-03: immutable script versions and structured screenplay elements.

-- CreateEnum
CREATE TYPE "ScriptStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScriptVersionStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScriptAdaptationMode" AS ENUM ('SIMPLE', 'STANDARD', 'COMPLETE');

-- CreateEnum
CREATE TYPE "BeatType" AS ENUM ('ACTION', 'REVEAL', 'EMOTION', 'TRANSITION', 'DIALOGUE', 'MONTAGE');

-- CreateEnum
CREATE TYPE "DialogueType" AS ENUM ('SPOKEN', 'VOICE_OVER', 'OFF_SCREEN', 'WHISPER', 'SHOUT');

-- CreateTable
CREATE TABLE "scripts" (
    "id" UUID NOT NULL,
    "episodeId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "status" "ScriptStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" UUID,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_versions" (
    "id" UUID NOT NULL,
    "scriptId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "parentVersionId" UUID,
    "sourceVersionId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "synopsis" TEXT,
    "adaptationMode" "ScriptAdaptationMode" NOT NULL DEFAULT 'STANDARD',
    "status" "ScriptVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "script_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" UUID NOT NULL,
    "scriptVersionId" UUID NOT NULL,
    "sourceSegmentId" UUID,
    "ordinal" INTEGER NOT NULL,
    "heading" VARCHAR(300) NOT NULL,
    "interiorExterior" VARCHAR(20),
    "timeOfDay" VARCHAR(100),
    "location" VARCHAR(300),
    "atmosphere" TEXT,
    "summary" TEXT,
    "action" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beats" (
    "id" UUID NOT NULL,
    "sceneId" UUID NOT NULL,
    "sourceSegmentId" UUID,
    "ordinal" INTEGER NOT NULL,
    "type" "BeatType" NOT NULL,
    "summary" TEXT NOT NULL,
    "action" TEXT,
    "emotionalState" VARCHAR(200),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dialogues" (
    "id" UUID NOT NULL,
    "sceneId" UUID NOT NULL,
    "beatId" UUID,
    "sourceSegmentId" UUID,
    "ordinal" INTEGER NOT NULL,
    "type" "DialogueType" NOT NULL DEFAULT 'SPOKEN',
    "speaker" VARCHAR(200) NOT NULL,
    "parenthetical" TEXT,
    "text" TEXT NOT NULL,
    "delivery" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dialogues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scripts_episodeId_key" ON "scripts"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "scripts_currentVersionId_key" ON "scripts"("currentVersionId");

-- CreateIndex
CREATE INDEX "scripts_status_idx" ON "scripts"("status");

-- CreateIndex
CREATE INDEX "scripts_archivedAt_idx" ON "scripts"("archivedAt");

-- CreateIndex
CREATE INDEX "script_versions_scriptId_status_idx" ON "script_versions"("scriptId", "status");

-- CreateIndex
CREATE INDEX "script_versions_parentVersionId_idx" ON "script_versions"("parentVersionId");

-- CreateIndex
CREATE INDEX "script_versions_sourceVersionId_idx" ON "script_versions"("sourceVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "script_versions_scriptId_version_key" ON "script_versions"("scriptId", "version");

-- CreateIndex
CREATE INDEX "scenes_sourceSegmentId_idx" ON "scenes"("sourceSegmentId");

-- CreateIndex
CREATE UNIQUE INDEX "scenes_scriptVersionId_ordinal_key" ON "scenes"("scriptVersionId", "ordinal");

-- CreateIndex
CREATE INDEX "beats_sourceSegmentId_idx" ON "beats"("sourceSegmentId");

-- CreateIndex
CREATE UNIQUE INDEX "beats_sceneId_ordinal_key" ON "beats"("sceneId", "ordinal");

-- CreateIndex
CREATE INDEX "dialogues_beatId_idx" ON "dialogues"("beatId");

-- CreateIndex
CREATE INDEX "dialogues_sourceSegmentId_idx" ON "dialogues"("sourceSegmentId");

-- CreateIndex
CREATE UNIQUE INDEX "dialogues_sceneId_ordinal_key" ON "dialogues"("sceneId", "ordinal");

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "script_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_versions" ADD CONSTRAINT "script_versions_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "scripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_versions" ADD CONSTRAINT "script_versions_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "script_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_versions" ADD CONSTRAINT "script_versions_sourceVersionId_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "source_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_scriptVersionId_fkey" FOREIGN KEY ("scriptVersionId") REFERENCES "script_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_sourceSegmentId_fkey" FOREIGN KEY ("sourceSegmentId") REFERENCES "source_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beats" ADD CONSTRAINT "beats_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beats" ADD CONSTRAINT "beats_sourceSegmentId_fkey" FOREIGN KEY ("sourceSegmentId") REFERENCES "source_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dialogues" ADD CONSTRAINT "dialogues_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dialogues" ADD CONSTRAINT "dialogues_beatId_fkey" FOREIGN KEY ("beatId") REFERENCES "beats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dialogues" ADD CONSTRAINT "dialogues_sourceSegmentId_fkey" FOREIGN KEY ("sourceSegmentId") REFERENCES "source_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
