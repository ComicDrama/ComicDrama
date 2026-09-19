-- CreateEnum
CREATE TYPE "GenerationType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'TTS', 'RENDER');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('DRAFT', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GenerationCandidateStatus" AS ENUM ('PENDING', 'READY', 'SELECTED', 'REJECTED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProviderJobStatus" AS ENUM ('SUBMITTED', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "generations" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "parentGenerationId" UUID,
    "targetType" VARCHAR(50) NOT NULL,
    "targetId" UUID NOT NULL,
    "type" "GenerationType" NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'DRAFT',
    "inputVersion" VARCHAR(120),
    "inputSnapshot" JSONB,
    "prompt" TEXT,
    "negativePrompt" TEXT,
    "compiledPrompt" TEXT,
    "provider" VARCHAR(120),
    "model" VARCHAR(160),
    "seed" BIGINT,
    "parameters" JSONB,
    "requestedCount" INTEGER NOT NULL DEFAULT 1,
    "estimatedCost" DECIMAL(18,6),
    "actualCost" DECIMAL(18,6),
    "currency" VARCHAR(12),
    "selectedCandidateId" UUID,
    "errorCode" VARCHAR(80),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_candidates" (
    "id" UUID NOT NULL,
    "generationId" UUID NOT NULL,
    "providerJobId" UUID,
    "assetVersionId" UUID,
    "ordinal" INTEGER NOT NULL,
    "status" "GenerationCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "providerOutputId" VARCHAR(240),
    "fileName" VARCHAR(255),
    "mimeType" VARCHAR(120),
    "storageKey" VARCHAR(500),
    "byteSize" BIGINT,
    "sha256" CHAR(64),
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "result" JSONB,
    "failureCode" VARCHAR(80),
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedAt" TIMESTAMP(3),

    CONSTRAINT "generation_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_jobs" (
    "id" UUID NOT NULL,
    "generationId" UUID NOT NULL,
    "parentJobId" UUID,
    "provider" VARCHAR(120) NOT NULL,
    "model" VARCHAR(160),
    "externalJobId" VARCHAR(240),
    "idempotencyKey" VARCHAR(240),
    "status" "ProviderJobStatus" NOT NULL DEFAULT 'SUBMITTED',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "request" JSONB,
    "response" JSONB,
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "errorCode" VARCHAR(80),
    "errorMessage" TEXT,
    "submittedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastPolledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "generations_selectedCandidateId_key" ON "generations"("selectedCandidateId");

-- CreateIndex
CREATE INDEX "generations_projectId_status_idx" ON "generations"("projectId", "status");

-- CreateIndex
CREATE INDEX "generations_targetType_targetId_idx" ON "generations"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "generations_parentGenerationId_idx" ON "generations"("parentGenerationId");

-- CreateIndex
CREATE UNIQUE INDEX "generation_candidates_assetVersionId_key" ON "generation_candidates"("assetVersionId");

-- CreateIndex
CREATE INDEX "generation_candidates_providerJobId_idx" ON "generation_candidates"("providerJobId");

-- CreateIndex
CREATE INDEX "generation_candidates_generationId_status_idx" ON "generation_candidates"("generationId", "status");

-- CreateIndex
CREATE INDEX "generation_candidates_status_idx" ON "generation_candidates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "generation_candidates_generationId_ordinal_key" ON "generation_candidates"("generationId", "ordinal");

-- CreateIndex
CREATE INDEX "provider_jobs_generationId_status_idx" ON "provider_jobs"("generationId", "status");

-- CreateIndex
CREATE INDEX "provider_jobs_parentJobId_idx" ON "provider_jobs"("parentJobId");

-- CreateIndex
CREATE INDEX "provider_jobs_status_lastPolledAt_idx" ON "provider_jobs"("status", "lastPolledAt");

-- CreateIndex
CREATE UNIQUE INDEX "provider_jobs_generationId_attempt_key" ON "provider_jobs"("generationId", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "provider_jobs_provider_externalJobId_key" ON "provider_jobs"("provider", "externalJobId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_jobs_idempotencyKey_key" ON "provider_jobs"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "generations" ADD CONSTRAINT "generations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generations" ADD CONSTRAINT "generations_parentGenerationId_fkey" FOREIGN KEY ("parentGenerationId") REFERENCES "generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generations" ADD CONSTRAINT "generations_selectedCandidateId_fkey" FOREIGN KEY ("selectedCandidateId") REFERENCES "generation_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_candidates" ADD CONSTRAINT "generation_candidates_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_candidates" ADD CONSTRAINT "generation_candidates_providerJobId_fkey" FOREIGN KEY ("providerJobId") REFERENCES "provider_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_candidates" ADD CONSTRAINT "generation_candidates_assetVersionId_fkey" FOREIGN KEY ("assetVersionId") REFERENCES "asset_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_jobs" ADD CONSTRAINT "provider_jobs_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_jobs" ADD CONSTRAINT "provider_jobs_parentJobId_fkey" FOREIGN KEY ("parentJobId") REFERENCES "provider_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

