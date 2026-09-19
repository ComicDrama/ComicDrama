import { randomUUID } from 'node:crypto';

export interface StructuredLogFields {
  traceId?: string;
  taskId?: string;
  errorCode?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export class StructuredLogger {
  constructor(private readonly service: string) {}

  info(event: string, fields: StructuredLogFields = {}): void {
    this.write('INFO', event, fields);
  }

  error(event: string, fields: StructuredLogFields = {}): void {
    this.write('ERROR', event, fields);
  }

  private write(level: 'INFO' | 'ERROR', event: string, fields: StructuredLogFields): void {
    const record = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      traceId: fields.traceId,
      taskId: fields.taskId,
      errorCode: fields.errorCode,
      message: fields.message,
      event,
      metadata: fields.metadata,
    };
    process.stdout.write(`${JSON.stringify({ ...record, logId: randomUUID() })}\n`);
  }
}
