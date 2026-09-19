import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

interface ApiResponse<T> {
  data: T;
  meta: { traceId: string };
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth(
    @Res({ passthrough: true }) response: Response,
  ): ApiResponse<{ service: string; version: string }> {
    return {
      data: { service: 'api', version: '0.1.0' },
      meta: { traceId: response.locals.traceId ?? 'health-check' },
    };
  }
}
