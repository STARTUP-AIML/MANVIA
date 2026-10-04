import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { UnauthorizedError } from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';

@Injectable()
export class PaymentAuthGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as (CurrentUserContext & { id?: string }) | undefined;

    const userId = user?.userId ?? user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication credentials required');
    }

    request.user = {
      ...user,
      userId,
      activeRole: user?.activeRole ?? 'PATIENT',
    };
    return true;
  }
}
