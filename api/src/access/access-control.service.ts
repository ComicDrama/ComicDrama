import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ProjectAccessLevel, ProjectRole } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

const ACCESS_RANK: Record<ProjectAccessLevel, number> = {
  [ProjectAccessLevel.VIEW]: 1,
  [ProjectAccessLevel.EDIT]: 2,
  [ProjectAccessLevel.MANAGE]: 3,
};

const ROLE_ACCESS: Record<ProjectRole, ProjectAccessLevel> = {
  [ProjectRole.OWNER]: ProjectAccessLevel.MANAGE,
  [ProjectRole.PRODUCER]: ProjectAccessLevel.MANAGE,
  [ProjectRole.DIRECTOR]: ProjectAccessLevel.EDIT,
  [ProjectRole.SCREENWRITER]: ProjectAccessLevel.EDIT,
  [ProjectRole.STORYBOARD_ARTIST]: ProjectAccessLevel.EDIT,
  [ProjectRole.ASSET_ARTIST]: ProjectAccessLevel.EDIT,
  [ProjectRole.EDITOR]: ProjectAccessLevel.EDIT,
  [ProjectRole.REVIEWER]: ProjectAccessLevel.VIEW,
  [ProjectRole.VIEWER]: ProjectAccessLevel.VIEW,
};

export interface ProjectAccessDecision {
  granted: boolean;
  projectId: string;
  userId: string;
  accessLevel: ProjectAccessLevel | null;
  roles: ProjectRole[];
  source: 'direct' | 'team' | null;
}

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async assertProjectAccess(
    userId: string | undefined,
    projectId: string | undefined,
    requiredLevel: ProjectAccessLevel,
    requiredRoles: ProjectRole[] = [],
  ): Promise<ProjectAccessDecision> {
    if (!userId) {
      throw new UnauthorizedException('认证用户缺少 x-user-id');
    }
    if (!projectId) {
      throw new ForbiddenException('缺少项目范围，无法执行资源级权限检查');
    }

    const decision = await this.evaluateProjectAccess(userId, projectId);
    const levelGranted =
      decision.accessLevel !== null &&
      ACCESS_RANK[decision.accessLevel] >= ACCESS_RANK[requiredLevel];
    const roleGranted =
      requiredRoles.length === 0 || requiredRoles.some((role) => decision.roles.includes(role));
    if (!levelGranted || !roleGranted) {
      throw new ForbiddenException('用户没有执行此项目操作所需的权限');
    }
    return decision;
  }

  async evaluateProjectAccess(userId: string, projectId: string): Promise<ProjectAccessDecision> {
    const direct = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: { roles: true, user: true },
    });

    const directActive = direct?.status === 'ACTIVE' && direct.user.status === 'ACTIVE';
    const directRoles = directActive ? direct.roles.map((assignment) => assignment.role) : [];
    const directLevel = directActive ? this.levelWithRoles(direct.accessLevel, directRoles) : null;

    const teamGrants = await this.prisma.projectTeam.findMany({
      where: { projectId, status: 'ACTIVE' },
      include: { roles: true, team: { include: { members: { include: { user: true } } } } },
    });

    let teamLevel: ProjectAccessLevel | null = null;
    let teamRoles: ProjectRole[] = [];
    for (const grant of teamGrants) {
      const activeMember = grant.team.members.some(
        (member) =>
          member.userId === userId && member.status === 'ACTIVE' && member.user.status === 'ACTIVE',
      );
      if (!activeMember) {
        continue;
      }
      const roles = grant.roles.map((assignment) => assignment.role);
      const level = this.levelWithRoles(grant.accessLevel, roles);
      if (teamLevel === null || ACCESS_RANK[level] > ACCESS_RANK[teamLevel]) {
        teamLevel = level;
        teamRoles = roles;
      } else if (teamLevel === level) {
        teamRoles = [...new Set([...teamRoles, ...roles])];
      }
    }

    if (directLevel && (!teamLevel || ACCESS_RANK[directLevel] >= ACCESS_RANK[teamLevel])) {
      return {
        granted: true,
        projectId,
        userId,
        accessLevel: directLevel,
        roles: directRoles,
        source: 'direct',
      };
    }
    if (teamLevel) {
      return {
        granted: true,
        projectId,
        userId,
        accessLevel: teamLevel,
        roles: teamRoles,
        source: 'team',
      };
    }
    return { granted: false, projectId, userId, accessLevel: null, roles: [], source: null };
  }

  private levelWithRoles(level: ProjectAccessLevel, roles: ProjectRole[]): ProjectAccessLevel {
    return roles.reduce(
      (current, role) =>
        ACCESS_RANK[ROLE_ACCESS[role]] > ACCESS_RANK[current] ? ROLE_ACCESS[role] : current,
      level,
    );
  }
}
