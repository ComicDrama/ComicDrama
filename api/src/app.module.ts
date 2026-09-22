import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { VersionController } from './health/version.controller';
import { traceIdMiddleware } from './common/trace-id.middleware';
import { AccessControlModule } from './access/access-control.module';
import { AuditLogModule } from './audit/audit-log.module';

@Module({
  imports: [AccessControlModule, AuditLogModule],
  controllers: [HealthController, VersionController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(traceIdMiddleware).forRoutes('*');
  }
}
