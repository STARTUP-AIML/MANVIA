import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';

export const AdminUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
