import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { UnauthorizedError } from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';

@Injectable()
export class AIAuthGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as
      (CurrentUserContext & { id?: string; roles?: string[]; email?: string }) | undefined;

    const userId = user?.userId ?? user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication credentials required');
    }

    request.user = {
      ...user,
      userId,
      activeRole:
        user?.activeRole ??
        (Array.isArray(user?.roles)
          ? (user.roles[0] as 'DOCTOR' | 'PATIENT' | 'ADMIN')
          : 'PATIENT'),
    };
    return true;
  }
}
