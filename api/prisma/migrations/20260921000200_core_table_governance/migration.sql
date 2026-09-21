-- P2-12: project-scoped query paths, optimistic row versions, lifecycle archives, and mutable-operation timestamps.
-- The project columns are added nullable, backfilled from existing parent relationships, then made mandatory.

-- AlterTable
ALTER TABLE "episodes" ADD COLUMN "projectId" UUID;
ALTER TABLE "source_documents" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "scripts" ADD COLUMN "projectId" UUID, ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "shots" ADD COLUMN "projectId" UUID, ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "characters" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "locations" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "props" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "assets" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "asset_collections" ADD COLUMN "archivedAt" TIMESTAMP(3), ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "timelines" ADD COLUMN "projectId" UUID;
ALTER TABLE "export_presets" ADD COLUMN "archivedAt" TIMESTAMP(3), ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Mutable operational records get an update timestamp. Keep no database default after backfill: Prisma maintains @updatedAt.
ALTER TABLE "task_attempts" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "generations" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "generation_candidates" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "render_segments" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "task_attempts" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "generations" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "generation_candidates" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "render_segments" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Backfill denormalized project ownership from the authoritative parent chain.
UPDATE "episodes" AS episode
SET "projectId" = season."projectId"
FROM "seasons" AS season
WHERE episode."seasonId" = season."id";

UPDATE "scripts" AS script
SET "projectId" = episode."projectId"
FROM "episodes" AS episode
WHERE script."episodeId" = episode."id";

UPDATE "shots" AS shot
SET "projectId" = script."projectId"
FROM "script_versions" AS script_version
JOIN "scripts" AS script ON script."id" = script_version."scriptId"
WHERE shot."scriptVersionId" = script_version."id";

UPDATE "timelines" AS timeline
SET "projectId" = episode."projectId"
FROM "episodes" AS episode
WHERE timeline."episodeId" = episode."id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "episodes" WHERE "projectId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill episodes.projectId';
  END IF;
  IF EXISTS (SELECT 1 FROM "scripts" WHERE "projectId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill scripts.projectId';
  END IF;
  IF EXISTS (SELECT 1 FROM "shots" WHERE "projectId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill shots.projectId';
  END IF;
  IF EXISTS (SELECT 1 FROM "timelines" WHERE "projectId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill timelines.projectId';
  END IF;
END $$;

ALTER TABLE "episodes" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "scripts" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "shots" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "timelines" ALTER COLUMN "projectId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "seasons_projectId_archivedAt_idx" ON "seasons"("projectId", "archivedAt");
CREATE INDEX "source_documents_projectId_archivedAt_idx" ON "source_documents"("projectId", "archivedAt");
CREATE INDEX "characters_projectId_archivedAt_idx" ON "characters"("projectId", "archivedAt");
CREATE INDEX "characters_archivedAt_idx" ON "characters"("archivedAt");
CREATE INDEX "locations_projectId_archivedAt_idx" ON "locations"("projectId", "archivedAt");
CREATE INDEX "locations_archivedAt_idx" ON "locations"("archivedAt");
CREATE INDEX "props_projectId_archivedAt_idx" ON "props"("projectId", "archivedAt");
CREATE INDEX "props_archivedAt_idx" ON "props"("archivedAt");
CREATE INDEX "assets_projectId_archivedAt_idx" ON "assets"("projectId", "archivedAt");
CREATE INDEX "episodes_projectId_status_idx" ON "episodes"("projectId", "status");
CREATE INDEX "episodes_projectId_archivedAt_idx" ON "episodes"("projectId", "archivedAt");
CREATE INDEX "scripts_projectId_status_idx" ON "scripts"("projectId", "status");
CREATE INDEX "scripts_projectId_archivedAt_idx" ON "scripts"("projectId", "archivedAt");
CREATE INDEX "shots_projectId_status_idx" ON "shots"("projectId", "status");
CREATE INDEX "shots_projectId_archivedAt_idx" ON "shots"("projectId", "archivedAt");
CREATE INDEX "asset_collections_projectId_archivedAt_idx" ON "asset_collections"("projectId", "archivedAt");
CREATE INDEX "asset_collections_archivedAt_idx" ON "asset_collections"("archivedAt");
CREATE INDEX "timelines_projectId_status_idx" ON "timelines"("projectId", "status");
CREATE INDEX "timelines_projectId_archivedAt_idx" ON "timelines"("projectId", "archivedAt");
CREATE INDEX "export_presets_projectId_archivedAt_idx" ON "export_presets"("projectId", "archivedAt");
CREATE INDEX "export_presets_archivedAt_idx" ON "export_presets"("archivedAt");

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shots" ADD CONSTRAINT "shots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
