import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { UnauthorizedError, ForbiddenError } from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';

/**
 * PatientAuthGuard enforces the server-validated request.user identity only.
 * Caller-supplied x-user-id/x-user-role/x-active-role headers are never trusted.
 */
@Injectable()
export class PatientAuthGuard implements CanActivate {
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

    if (user.activeRole !== 'PATIENT') {
      throw new ForbiddenError('Patient role required to access this resource');
    }

    request.user = {
      ...user,
      userId,
      activeRole: 'PATIENT',
    };
    return true;
  }
}
