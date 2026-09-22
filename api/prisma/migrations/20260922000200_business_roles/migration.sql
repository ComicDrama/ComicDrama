-- P2-15: project business roles and normalized role assignments.

CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'PRODUCER', 'DIRECTOR', 'SCREENWRITER', 'STORYBOARD_ARTIST', 'ASSET_ARTIST', 'EDITOR', 'REVIEWER', 'VIEWER');

CREATE TABLE "project_member_roles" ( "id" UUID NOT NULL, "projectId" UUID NOT NULL, "projectMemberId" UUID NOT NULL, "role" "ProjectRole" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,  CONSTRAINT "project_member_roles_pkey" PRIMARY KEY ("id") );

CREATE TABLE "project_team_roles" ( "id" UUID NOT NULL, "projectId" UUID NOT NULL, "projectTeamId" UUID NOT NULL, "role" "ProjectRole" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,  CONSTRAINT "project_team_roles_pkey" PRIMARY KEY ("id") );

CREATE INDEX "project_member_roles_projectId_role_idx" ON "project_member_roles"("projectId", "role");

CREATE UNIQUE INDEX "project_member_roles_projectMemberId_role_key" ON "project_member_roles"("projectMemberId", "role");

CREATE INDEX "project_team_roles_projectId_role_idx" ON "project_team_roles"("projectId", "role");

CREATE UNIQUE INDEX "project_team_roles_projectTeamId_role_key" ON "project_team_roles"("projectTeamId", "role");

ALTER TABLE "project_member_roles" ADD CONSTRAINT "project_member_roles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_member_roles" ADD CONSTRAINT "project_member_roles_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "project_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_team_roles" ADD CONSTRAINT "project_team_roles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_team_roles" ADD CONSTRAINT "project_team_roles_projectTeamId_fkey" FOREIGN KEY ("projectTeamId") REFERENCES "project_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE; 
