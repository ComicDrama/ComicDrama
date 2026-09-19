-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'RETRYING', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskAttemptStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'CANCELLED');

-- CreateTable
CREATE TABLE "workflows" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "workflowVersion" INTEGER NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "context" JSONB,
    "output" JSONB,
    "errorCode" VARCHAR(80),
    "errorMessage" TEXT,
    "traceId" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "workflowRunId" UUID,
    "parentTaskId" UUID,
    "type" VARCHAR(120) NOT NULL,
    "resourceType" VARCHAR(80),
    "resourceId" UUID,
    "inputVersion" VARCHAR(120),
    "idempotencyKey" VARCHAR(240) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "traceId" VARCHAR(120),
    "payload" JSONB,
    "result" JSONB,
    "errorCode" VARCHAR(80),
    "errorMessage" TEXT,
    "lockedBy" VARCHAR(160),
    "lockedAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attempts" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "TaskAttemptStatus" NOT NULL DEFAULT 'STARTED',
    "workerId" VARCHAR(160),
    "traceId" VARCHAR(120),
    "input" JSONB,
    "output" JSONB,
    "errorCode" VARCHAR(80),
    "errorMessage" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeatAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflows_projectId_status_idx" ON "workflows"("projectId", "status");

-- CreateIndex
CREATE INDEX "workflows_archivedAt_idx" ON "workflows"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_projectId_slug_version_key" ON "workflows"("projectId", "slug", "version");

-- CreateIndex
CREATE INDEX "workflow_runs_projectId_status_idx" ON "workflow_runs"("projectId", "status");

-- CreateIndex
CREATE INDEX "workflow_runs_workflowId_status_idx" ON "workflow_runs"("workflowId", "status");

-- CreateIndex
CREATE INDEX "workflow_runs_traceId_idx" ON "workflow_runs"("traceId");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_idempotencyKey_key" ON "tasks"("idempotencyKey");

-- CreateIndex
CREATE INDEX "tasks_projectId_status_priority_idx" ON "tasks"("projectId", "status", "priority");

-- CreateIndex
CREATE INDEX "tasks_workflowRunId_status_idx" ON "tasks"("workflowRunId", "status");

-- CreateIndex
CREATE INDEX "tasks_parentTaskId_idx" ON "tasks"("parentTaskId");

-- CreateIndex
CREATE INDEX "tasks_resourceType_resourceId_idx" ON "tasks"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "tasks_status_heartbeatAt_idx" ON "tasks"("status", "heartbeatAt");

-- CreateIndex
CREATE INDEX "task_attempts_status_heartbeatAt_idx" ON "task_attempts"("status", "heartbeatAt");

-- CreateIndex
CREATE INDEX "task_attempts_workerId_status_idx" ON "task_attempts"("workerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "task_attempts_taskId_attempt_key" ON "task_attempts"("taskId", "attempt");

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

