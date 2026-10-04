import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { UnauthorizedError, ForbiddenError } from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';

/**
 * AdminAuthGuard strictly enforces the authenticated request.user identity.
 * Prevents header-based impersonation for doctor verification admin endpoints.
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

    const activeRole = user?.activeRole ?? (Array.isArray(user?.roles) ? user.roles[0] : undefined);
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
