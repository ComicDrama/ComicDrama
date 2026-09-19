import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { StructuredLogger } from './structured-logger';

@Catch()
export class StructuredHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new StructuredLogger('comicdrama-api');

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const traceId = response.locals.traceId ?? 'unknown';
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      typeof exceptionResponse === 'string' ? exceptionResponse : 'Internal server error';

    this.logger.error('http.request.failed', {
      traceId,
      errorCode: `HTTP_${status}`,
      message: exception instanceof Error ? exception.message : message,
      metadata: { method: request.method, path: request.originalUrl, statusCode: status },
    });

    response.status(status).json({
      code: `HTTP_${status}`,
      message,
      traceId,
      details: typeof exceptionResponse === 'object' ? exceptionResponse : {},
    });
  }
}
