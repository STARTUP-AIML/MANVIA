import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { UnauthorizedError, ForbiddenError } from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../interfaces/auth-context.interface.js';

/**
 * DoctorAuthGuard enforces the authenticated request.user identity only.
 * Caller-provided x-user-id/x-user-role/x-active-role values are ignored.
 */
@Injectable()
export class DoctorAuthGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as
      (CurrentUserContext & { id?: string; activeRole?: string }) | undefined;

    if (!user) {
      throw new UnauthorizedError('Authentication credentials required');
    }

    const userId = user.userId ?? user.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication credentials required');
    }

    if (user.activeRole !== 'DOCTOR') {
      throw new ForbiddenError('Doctor role required to access this resource');
    }

    request.user = {
      ...user,
      userId,
      activeRole: 'DOCTOR',
    };
    return true;
  }
}
