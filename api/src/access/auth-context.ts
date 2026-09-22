import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const AUTH_USER_ID_HEADER = 'x-user-id';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user?.id ?? request.header(AUTH_USER_ID_HEADER) ?? undefined;
});
