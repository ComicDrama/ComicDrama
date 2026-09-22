import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { VersionController } from './health/version.controller';
import { traceIdMiddleware } from './common/trace-id.middleware';
import { AccessControlModule } from './access/access-control.module';
import { AuditLogModule } from './audit/audit-log.module';
import { VersioningModule } from './versioning/versioning.module';
import { SourceDocumentModule } from './source-documents/source-document.module';

@Module({
  imports: [AccessControlModule, AuditLogModule, VersioningModule, SourceDocumentModule],
  controllers: [HealthController, VersionController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(traceIdMiddleware).forRoutes('*');
  }
}
