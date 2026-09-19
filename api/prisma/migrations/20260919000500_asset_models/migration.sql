-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('CHARACTER', 'LOCATION', 'PROP', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STYLE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssetVersionStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SUPERSEDED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "projectId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(120),
    "type" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" UUID,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_versions" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "parentVersionId" UUID,
    "version" INTEGER NOT NULL,
    "status" "AssetVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "fileName" VARCHAR(255),
    "mimeType" VARCHAR(120),
    "byteSize" BIGINT,
    "sha256" CHAR(64),
    "storageKey" VARCHAR(500),
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "metadata" JSONB,
    "prompt" TEXT,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_collections" (
    "id" UUID NOT NULL,
    "projectId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_collection_items" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "pinnedVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_references" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "assetVersionId" UUID NOT NULL,
    "targetType" VARCHAR(50) NOT NULL,
    "targetId" UUID NOT NULL,
    "role" VARCHAR(80),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shotVersionId" UUID,

    CONSTRAINT "asset_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_currentVersionId_key" ON "assets"("currentVersionId");

-- CreateIndex
CREATE INDEX "assets_projectId_type_status_idx" ON "assets"("projectId", "type", "status");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_archivedAt_idx" ON "assets"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "assets_projectId_slug_key" ON "assets"("projectId", "slug");

-- CreateIndex
CREATE INDEX "asset_versions_status_idx" ON "asset_versions"("status");

-- CreateIndex
CREATE INDEX "asset_versions_parentVersionId_idx" ON "asset_versions"("parentVersionId");

-- CreateIndex
CREATE INDEX "asset_versions_sha256_idx" ON "asset_versions"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "asset_versions_assetId_version_key" ON "asset_versions"("assetId", "version");

-- CreateIndex
CREATE INDEX "asset_collections_projectId_idx" ON "asset_collections"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_collections_projectId_slug_key" ON "asset_collections"("projectId", "slug");

-- CreateIndex
CREATE INDEX "asset_collection_items_assetId_idx" ON "asset_collection_items"("assetId");

-- CreateIndex
CREATE INDEX "asset_collection_items_pinnedVersionId_idx" ON "asset_collection_items"("pinnedVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_collection_items_collectionId_assetId_key" ON "asset_collection_items"("collectionId", "assetId");

-- CreateIndex
CREATE INDEX "asset_references_assetId_targetType_idx" ON "asset_references"("assetId", "targetType");

-- CreateIndex
CREATE INDEX "asset_references_assetVersionId_idx" ON "asset_references"("assetVersionId");

-- CreateIndex
CREATE INDEX "asset_references_targetType_targetId_idx" ON "asset_references"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_references_assetVersionId_targetType_targetId_role_key" ON "asset_references"("assetVersionId", "targetType", "targetId", "role");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "asset_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "asset_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_collections" ADD CONSTRAINT "asset_collections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_collection_items" ADD CONSTRAINT "asset_collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "asset_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_collection_items" ADD CONSTRAINT "asset_collection_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_collection_items" ADD CONSTRAINT "asset_collection_items_pinnedVersionId_fkey" FOREIGN KEY ("pinnedVersionId") REFERENCES "asset_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_references" ADD CONSTRAINT "asset_references_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_references" ADD CONSTRAINT "asset_references_assetVersionId_fkey" FOREIGN KEY ("assetVersionId") REFERENCES "asset_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_references" ADD CONSTRAINT "asset_references_shotVersionId_fkey" FOREIGN KEY ("shotVersionId") REFERENCES "shot_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

