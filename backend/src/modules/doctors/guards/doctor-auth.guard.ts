import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { UnauthorizedError, ForbiddenError } from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../interfaces/auth-context.interface.js';

/**
 * DoctorAuthGuard enforces:
 * 1. Authentication existence (request.user or x-user-id header)
 * 2. Role verification (activeRole === 'DOCTOR')
 *
 * Integrates directly with Phase 4 (JwtAuthGuard) and Phase 5 (RolesGuard).
 */
@Injectable()
export class DoctorAuthGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user: CurrentUserContext | undefined =
      request.user ?? this.extractUserFromHeaders(request);

    if (!user || !user.userId) {
      throw new UnauthorizedError('Authentication credentials required');
    }

    if (user.activeRole !== 'DOCTOR') {
      throw new ForbiddenError('Doctor role required to access this resource');
    }

    request.user = user;
    return true;
  }

  private extractUserFromHeaders(request: {
    headers: Record<string, string | string[] | undefined>;
  }): CurrentUserContext | undefined {
    const rawUserId = request.headers['x-user-id'];
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    const rawRole =
      request.headers['x-user-role'] ??
      request.headers['x-active-role'] ??
      request.headers['active-role'];
    const role = Array.isArray(rawRole) ? rawRole[0] : rawRole;

    if (userId && typeof userId === 'string' && userId.trim().length > 0) {
      const activeRole = (role as 'DOCTOR' | 'PATIENT' | 'ADMIN') || 'DOCTOR';
      return {
        userId: userId.trim(),
        activeRole,
      };
    }

    return undefined;
  }
}
