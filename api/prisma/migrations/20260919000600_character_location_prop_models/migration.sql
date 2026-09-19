-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CharacterAppearanceType" AS ENUM ('TURNAROUND', 'FRONT', 'SIDE', 'BACK', 'EXPRESSION', 'POSE', 'COSTUME', 'REFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "VoiceProfileStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LocationVersionStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PropStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SceneContinuitySubject" AS ENUM ('CHARACTER', 'LOCATION', 'PROP', 'OTHER');

-- CreateTable
CREATE TABLE "characters" (
    "id" UUID NOT NULL,
    "projectId" UUID,
    "assetId" UUID,
    "currentAppearanceId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(120),
    "aliases" JSONB,
    "role" VARCHAR(120),
    "gender" VARCHAR(80),
    "ageDescription" VARCHAR(120),
    "personality" TEXT,
    "background" TEXT,
    "appearanceDescription" TEXT,
    "costumeDescription" TEXT,
    "status" "CharacterStatus" NOT NULL DEFAULT 'DRAFT',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_appearances" (
    "id" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "assetVersionId" UUID NOT NULL,
    "type" "CharacterAppearanceType" NOT NULL DEFAULT 'REFERENCE',
    "label" VARCHAR(200),
    "ordinal" INTEGER NOT NULL DEFAULT 0,
    "costume" TEXT,
    "expression" TEXT,
    "pose" TEXT,
    "cameraAngle" VARCHAR(100),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_appearances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_profiles" (
    "id" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "sampleAssetVersionId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "provider" VARCHAR(120),
    "voiceId" VARCHAR(200),
    "language" VARCHAR(40),
    "locale" VARCHAR(40),
    "gender" VARCHAR(40),
    "pitch" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "style" TEXT,
    "status" "VoiceProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "projectId" UUID,
    "assetId" UUID,
    "currentVersionId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(120),
    "locationType" VARCHAR(120),
    "description" TEXT,
    "status" "LocationStatus" NOT NULL DEFAULT 'DRAFT',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_versions" (
    "id" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "parentVersionId" UUID,
    "assetVersionId" UUID,
    "version" INTEGER NOT NULL,
    "status" "LocationVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "layout" JSONB,
    "lighting" JSONB,
    "timeOfDay" VARCHAR(100),
    "weather" VARCHAR(100),
    "continuityRules" JSONB,
    "prompt" TEXT,
    "metadata" JSONB,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_continuities" (
    "id" UUID NOT NULL,
    "sceneId" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "subjectType" "SceneContinuitySubject" NOT NULL,
    "characterId" UUID,
    "locationId" UUID,
    "propId" UUID,
    "stateKey" VARCHAR(120) NOT NULL,
    "stateValue" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_continuities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "props" (
    "id" UUID NOT NULL,
    "projectId" UUID,
    "assetId" UUID,
    "currentVersionId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(120),
    "category" VARCHAR(120),
    "description" TEXT,
    "material" VARCHAR(200),
    "dimensions" JSONB,
    "defaultState" TEXT,
    "status" "PropStatus" NOT NULL DEFAULT 'DRAFT',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "props_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "characters_assetId_key" ON "characters"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "characters_currentAppearanceId_key" ON "characters"("currentAppearanceId");

-- CreateIndex
CREATE INDEX "characters_projectId_status_idx" ON "characters"("projectId", "status");

-- CreateIndex
CREATE INDEX "characters_status_idx" ON "characters"("status");

-- CreateIndex
CREATE UNIQUE INDEX "characters_projectId_slug_key" ON "characters"("projectId", "slug");

-- CreateIndex
CREATE INDEX "character_appearances_characterId_type_idx" ON "character_appearances"("characterId", "type");

-- CreateIndex
CREATE INDEX "character_appearances_assetVersionId_idx" ON "character_appearances"("assetVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "character_appearances_characterId_assetVersionId_type_key" ON "character_appearances"("characterId", "assetVersionId", "type");

-- CreateIndex
CREATE INDEX "voice_profiles_characterId_status_idx" ON "voice_profiles"("characterId", "status");

-- CreateIndex
CREATE INDEX "voice_profiles_sampleAssetVersionId_idx" ON "voice_profiles"("sampleAssetVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "voice_profiles_characterId_name_key" ON "voice_profiles"("characterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "locations_assetId_key" ON "locations"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "locations_currentVersionId_key" ON "locations"("currentVersionId");

-- CreateIndex
CREATE INDEX "locations_projectId_status_idx" ON "locations"("projectId", "status");

-- CreateIndex
CREATE INDEX "locations_status_idx" ON "locations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "locations_projectId_slug_key" ON "locations"("projectId", "slug");

-- CreateIndex
CREATE INDEX "location_versions_locationId_status_idx" ON "location_versions"("locationId", "status");

-- CreateIndex
CREATE INDEX "location_versions_parentVersionId_idx" ON "location_versions"("parentVersionId");

-- CreateIndex
CREATE INDEX "location_versions_assetVersionId_idx" ON "location_versions"("assetVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "location_versions_locationId_version_key" ON "location_versions"("locationId", "version");

-- CreateIndex
CREATE INDEX "scene_continuities_characterId_idx" ON "scene_continuities"("characterId");

-- CreateIndex
CREATE INDEX "scene_continuities_locationId_idx" ON "scene_continuities"("locationId");

-- CreateIndex
CREATE INDEX "scene_continuities_propId_idx" ON "scene_continuities"("propId");

-- CreateIndex
CREATE INDEX "scene_continuities_sceneId_subjectType_idx" ON "scene_continuities"("sceneId", "subjectType");

-- CreateIndex
CREATE UNIQUE INDEX "scene_continuities_sceneId_ordinal_key" ON "scene_continuities"("sceneId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "props_assetId_key" ON "props"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "props_currentVersionId_key" ON "props"("currentVersionId");

-- CreateIndex
CREATE INDEX "props_projectId_status_idx" ON "props"("projectId", "status");

-- CreateIndex
CREATE INDEX "props_status_idx" ON "props"("status");

-- CreateIndex
CREATE UNIQUE INDEX "props_projectId_slug_key" ON "props"("projectId", "slug");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_currentAppearanceId_fkey" FOREIGN KEY ("currentAppearanceId") REFERENCES "character_appearances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_appearances" ADD CONSTRAINT "character_appearances_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_appearances" ADD CONSTRAINT "character_appearances_assetVersionId_fkey" FOREIGN KEY ("assetVersionId") REFERENCES "asset_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_profiles" ADD CONSTRAINT "voice_profiles_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_profiles" ADD CONSTRAINT "voice_profiles_sampleAssetVersionId_fkey" FOREIGN KEY ("sampleAssetVersionId") REFERENCES "asset_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "location_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_versions" ADD CONSTRAINT "location_versions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_versions" ADD CONSTRAINT "location_versions_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "location_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_versions" ADD CONSTRAINT "location_versions_assetVersionId_fkey" FOREIGN KEY ("assetVersionId") REFERENCES "asset_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_continuities" ADD CONSTRAINT "scene_continuities_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_continuities" ADD CONSTRAINT "scene_continuities_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_continuities" ADD CONSTRAINT "scene_continuities_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_continuities" ADD CONSTRAINT "scene_continuities_propId_fkey" FOREIGN KEY ("propId") REFERENCES "props"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "props" ADD CONSTRAINT "props_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "props" ADD CONSTRAINT "props_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "props" ADD CONSTRAINT "props_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "asset_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

