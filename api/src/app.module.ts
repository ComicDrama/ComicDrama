import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { VersionController } from './health/version.controller';
import { traceIdMiddleware } from './common/trace-id.middleware';

@Module({
  controllers: [HealthController, VersionController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(traceIdMiddleware).forRoutes('*');
  }
}
