import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AccessControlService } from './access-control.service';
import { ProjectAccessController } from './project-access.controller';
import { ProjectAccessGuard } from './project-access.guard';

@Module({
  controllers: [ProjectAccessController],
  providers: [PrismaService, AccessControlService, ProjectAccessGuard],
  exports: [AccessControlService, ProjectAccessGuard],
})
export class AccessControlModule {}
