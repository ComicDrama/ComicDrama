import { SetMetadata } from '@nestjs/common';
import type { ProjectAccessLevel, ProjectRole } from '@prisma/client';

export const PROJECT_ACCESS_METADATA = 'project_access';

export interface ProjectAccessRequirement {
  level: ProjectAccessLevel;
  roles: ProjectRole[];
}

export const ProjectAccess = (level: ProjectAccessLevel, ...roles: ProjectRole[]) =>
  SetMetadata(PROJECT_ACCESS_METADATA, { level, roles } satisfies ProjectAccessRequirement);
