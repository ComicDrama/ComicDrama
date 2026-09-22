-- P2-14: users, teams, memberships, and project access grants.

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ARCHIVED');

CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

CREATE TYPE "ProjectAccessLevel" AS ENUM ('VIEW', 'EDIT', 'MANAGE');

CREATE TABLE "users" (     "id" UUID NOT NULL,     "email" VARCHAR(320) NOT NULL,     "displayName" VARCHAR(200) NOT NULL,     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',     "version" INTEGER NOT NULL DEFAULT 1,     "archivedAt" TIMESTAMP(3),     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,     "updatedAt" TIMESTAMP(3) NOT NULL,      CONSTRAINT "users_pkey" PRIMARY KEY ("id") );

CREATE TABLE "teams" (     "id" UUID NOT NULL,     "slug" VARCHAR(120) NOT NULL,     "name" VARCHAR(200) NOT NULL,     "description" TEXT,     "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',     "version" INTEGER NOT NULL DEFAULT 1,     "archivedAt" TIMESTAMP(3),     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,     "updatedAt" TIMESTAMP(3) NOT NULL,      CONSTRAINT "teams_pkey" PRIMARY KEY ("id") );

CREATE TABLE "team_members" (     "id" UUID NOT NULL,     "teamId" UUID NOT NULL,     "userId" UUID NOT NULL,     "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',     "isAdmin" BOOLEAN NOT NULL DEFAULT false,     "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,     "acceptedAt" TIMESTAMP(3),     "suspendedAt" TIMESTAMP(3),     "removedAt" TIMESTAMP(3),     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,     "updatedAt" TIMESTAMP(3) NOT NULL,      CONSTRAINT "team_members_pkey" PRIMARY KEY ("id") );

CREATE TABLE "project_members" (     "id" UUID NOT NULL,     "projectId" UUID NOT NULL,     "userId" UUID NOT NULL,     "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',     "accessLevel" "ProjectAccessLevel" NOT NULL DEFAULT 'VIEW',     "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,     "acceptedAt" TIMESTAMP(3),     "suspendedAt" TIMESTAMP(3),     "removedAt" TIMESTAMP(3),     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,     "updatedAt" TIMESTAMP(3) NOT NULL,      CONSTRAINT "project_members_pkey" PRIMARY KEY ("id") );

CREATE TABLE "project_teams" (     "id" UUID NOT NULL,     "projectId" UUID NOT NULL,     "teamId" UUID NOT NULL,     "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',     "accessLevel" "ProjectAccessLevel" NOT NULL DEFAULT 'VIEW',     "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,     "revokedAt" TIMESTAMP(3),     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,     "updatedAt" TIMESTAMP(3) NOT NULL,      CONSTRAINT "project_teams_pkey" PRIMARY KEY ("id") );

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE INDEX "users_status_idx" ON "users"("status");

CREATE INDEX "users_archivedAt_idx" ON "users"("archivedAt");

CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

CREATE INDEX "teams_status_idx" ON "teams"("status");

CREATE INDEX "teams_archivedAt_idx" ON "teams"("archivedAt");

CREATE INDEX "team_members_userId_status_idx" ON "team_members"("userId", "status");

CREATE INDEX "team_members_teamId_status_idx" ON "team_members"("teamId", "status");

CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

CREATE INDEX "project_members_userId_status_idx" ON "project_members"("userId", "status");

CREATE INDEX "project_members_projectId_status_accessLevel_idx" ON "project_members"("projectId", "status", "accessLevel");

CREATE UNIQUE INDEX "project_members_projectId_userId_key" ON "project_members"("projectId", "userId");

CREATE INDEX "project_teams_teamId_status_idx" ON "project_teams"("teamId", "status");

CREATE INDEX "project_teams_projectId_status_accessLevel_idx" ON "project_teams"("projectId", "status", "accessLevel");

CREATE UNIQUE INDEX "project_teams_projectId_teamId_key" ON "project_teams"("projectId", "teamId");

ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
