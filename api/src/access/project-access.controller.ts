import { ProjectAccessLevel } from '@prisma/client';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ProjectAccess } from './project-access.decorator';
import { ProjectAccessGuard } from './project-access.guard';

@Controller('projects')
@UseGuards(ProjectAccessGuard)
export class ProjectAccessController {
  @Get(':projectId/access-check')
  @ProjectAccess(ProjectAccessLevel.VIEW)
  check(@Param('projectId') projectId: string) {
    return {
      data: { projectId, authorized: true },
      meta: { scope: 'project', requiredAccess: 'VIEW' },
    };
  }
}
