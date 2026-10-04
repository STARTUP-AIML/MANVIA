import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { UnauthorizedError, ForbiddenError } from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';

/**
 * AdminAuthGuard enforces the verified server-authenticated identity only.
 * Caller-controlled x-user-id/x-user-role/x-active-role headers are never trusted.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as
      (CurrentUserContext & { id?: string; roles?: string[] }) | undefined;

    const userId = user?.userId ?? user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication credentials required');
    }

    const activeRole = user?.activeRole;
    if (activeRole !== 'ADMIN') {
      throw new ForbiddenError('Administrator role required to access this resource');
    }

    request.user = {
      ...user,
      userId,
      activeRole,
    };
    return true;
  }
}
