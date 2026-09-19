import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { StructuredLogger } from './structured-logger';

const logger = new StructuredLogger('comicdrama-api');

export function traceIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-trace-id');
  const traceId = incoming && incoming.length <= 128 ? incoming : `trace_${randomUUID()}`;
  const startedAt = Date.now();

  res.setHeader('x-trace-id', traceId);
  res.locals.traceId = traceId;
  res.on('finish', () => {
    logger.info('http.request.completed', {
      traceId,
      metadata: {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
    });
  });
  next();
}
