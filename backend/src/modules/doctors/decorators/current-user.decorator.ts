import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { CurrentUserContext } from '../interfaces/auth-context.interface.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
