import { randomUUID } from 'node:crypto';

export function createTraceId(): string {
  return `trace_${randomUUID()}`;
}
