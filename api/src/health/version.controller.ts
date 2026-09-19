import { Controller, Get } from '@nestjs/common';

@Controller('version')
export class VersionController {
  @Get()
  getVersion() {
    return {
      service: 'comicdrama-api',
      version: '0.1.0',
      environment: process.env.COMICDRAMA_ENV ?? 'development',
      capabilities: ['health', 'version'],
    };
  }
}