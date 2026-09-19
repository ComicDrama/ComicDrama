-- P2-01: Project / Season / Episode hierarchy.
-- This migration intentionally contains only the IP hierarchy. Source, script,
-- storyboard, asset, task and timeline tables are introduced in later phases.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "SeasonStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "EpisodeStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'ARCHIVED');

CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seasons" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "projectId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "title" VARCHAR(200),
    "description" TEXT,
    "status" "SeasonStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "episodes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "seasonId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "title" VARCHAR(200),
    "synopsis" TEXT,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "durationSeconds" INTEGER,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_archivedAt_idx" ON "projects"("archivedAt");
CREATE UNIQUE INDEX "seasons_projectId_number_key" ON "seasons"("projectId", "number");
CREATE INDEX "seasons_projectId_status_idx" ON "seasons"("projectId", "status");
CREATE INDEX "seasons_archivedAt_idx" ON "seasons"("archivedAt");
CREATE UNIQUE INDEX "episodes_seasonId_number_key" ON "episodes"("seasonId", "number");
CREATE INDEX "episodes_seasonId_status_idx" ON "episodes"("seasonId", "status");
CREATE INDEX "episodes_archivedAt_idx" ON "episodes"("archivedAt");

ALTER TABLE "seasons"
    ADD CONSTRAINT "seasons_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "episodes"
    ADD CONSTRAINT "episodes_seasonId_fkey"
    FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
