import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { VersioningService } from './versioning.service';

@Module({
  providers: [PrismaService, VersioningService],
  exports: [VersioningService],
})
export class VersioningModule {}
