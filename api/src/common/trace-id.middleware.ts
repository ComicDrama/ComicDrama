import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function traceIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-trace-id');
  const traceId = incoming && incoming.length <= 128 ? incoming : `trace_${randomUUID()}`;
  res.setHeader('x-trace-id', traceId);
  res.locals.traceId = traceId;
  next();
}