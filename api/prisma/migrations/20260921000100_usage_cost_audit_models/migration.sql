-- CreateEnum
CREATE TYPE "UsageSourceType" AS ENUM ('PROVIDER', 'GENERATION', 'RENDER', 'WORKFLOW', 'STORAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('REQUESTS', 'INPUT_TOKENS', 'OUTPUT_TOKENS', 'IMAGE_COUNT', 'VIDEO_SECONDS', 'AUDIO_SECONDS', 'RENDER_FRAMES', 'COMPUTE_SECONDS', 'STORAGE_BYTES', 'OTHER');

-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('AI_GENERATION', 'RENDER', 'STORAGE', 'EGRESS', 'SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "CostStatus" AS ENUM ('ESTIMATED', 'ACCRUED', 'REFUNDED', 'VOID');

-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "projectId" UUID,
    "generationId" UUID,
    "providerJobId" UUID,
    "renderJobId" UUID,
    "sourceType" "UsageSourceType" NOT NULL,
    "metric" "UsageMetric" NOT NULL,
    "resourceType" VARCHAR(80),
    "resourceId" UUID,
    "provider" VARCHAR(120),
    "model" VARCHAR(160),
    "quantity" DECIMAL(24,8) NOT NULL,
    "unit" VARCHAR(40) NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "durationMs" INTEGER,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_records" (
    "id" UUID NOT NULL,
    "projectId" UUID,
    "usageRecordId" UUID,
    "generationId" UUID,
    "renderJobId" UUID,
    "category" "CostCategory" NOT NULL,
    "status" "CostStatus" NOT NULL DEFAULT 'ACCRUED',
    "provider" VARCHAR(120),
    "model" VARCHAR(160),
    "description" TEXT,
    "quantity" DECIMAL(24,8),
    "unit" VARCHAR(40),
    "unitPrice" DECIMAL(24,8),
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" VARCHAR(12) NOT NULL DEFAULT 'USD',
    "metadata" JSONB,
    "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "projectId" UUID,
    "actorId" VARCHAR(120),
    "actorType" VARCHAR(40),
    "action" VARCHAR(120) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(120),
    "requestId" VARCHAR(120),
    "traceId" VARCHAR(120),
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_records_projectId_occurredAt_idx" ON "usage_records"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "usage_records_sourceType_metric_occurredAt_idx" ON "usage_records"("sourceType", "metric", "occurredAt");

-- CreateIndex
CREATE INDEX "usage_records_generationId_idx" ON "usage_records"("generationId");

-- CreateIndex
CREATE INDEX "usage_records_providerJobId_idx" ON "usage_records"("providerJobId");

-- CreateIndex
CREATE INDEX "usage_records_renderJobId_idx" ON "usage_records"("renderJobId");

-- CreateIndex
CREATE INDEX "usage_records_resourceType_resourceId_idx" ON "usage_records"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "cost_records_projectId_incurredAt_idx" ON "cost_records"("projectId", "incurredAt");

-- CreateIndex
CREATE INDEX "cost_records_category_status_incurredAt_idx" ON "cost_records"("category", "status", "incurredAt");

-- CreateIndex
CREATE INDEX "cost_records_usageRecordId_idx" ON "cost_records"("usageRecordId");

-- CreateIndex
CREATE INDEX "cost_records_generationId_idx" ON "cost_records"("generationId");

-- CreateIndex
CREATE INDEX "cost_records_renderJobId_idx" ON "cost_records"("renderJobId");

-- CreateIndex
CREATE INDEX "audit_logs_projectId_createdAt_idx" ON "audit_logs"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_traceId_idx" ON "audit_logs"("traceId");

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_providerJobId_fkey" FOREIGN KEY ("providerJobId") REFERENCES "provider_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_renderJobId_fkey" FOREIGN KEY ("renderJobId") REFERENCES "render_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_records" ADD CONSTRAINT "cost_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_records" ADD CONSTRAINT "cost_records_usageRecordId_fkey" FOREIGN KEY ("usageRecordId") REFERENCES "usage_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_records" ADD CONSTRAINT "cost_records_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_records" ADD CONSTRAINT "cost_records_renderJobId_fkey" FOREIGN KEY ("renderJobId") REFERENCES "render_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

