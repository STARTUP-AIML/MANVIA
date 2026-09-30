import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';

@Injectable()
export class AIAuthGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user: CurrentUserContext | undefined = request.user
      ? this.normalizeUser(request.user)
      : (this.extractUserFromHeaders(request) ?? this.extractUserFromToken(request));

    if (!user || !user.userId) {
      throw new UnauthorizedError('Authentication credentials required');
    }

    request.user = user;
    return true;
  }

  private normalizeUser(user: {
    id?: string;
    userId?: string;
    activeRole?: 'DOCTOR' | 'PATIENT' | 'ADMIN';
    roles?: ('DOCTOR' | 'PATIENT' | 'ADMIN')[];
    email?: string;
  }): CurrentUserContext {
    const context: CurrentUserContext = {
      userId: user.userId ?? user.id ?? '',
      activeRole: user.activeRole ?? user.roles?.[0] ?? 'PATIENT',
    };
    if (user.email !== undefined) {
      context.email = user.email;
    }
    return context;
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
      const activeRole = (role as 'DOCTOR' | 'PATIENT' | 'ADMIN') || 'PATIENT';
      return {
        userId: userId.trim(),
        activeRole,
      };
    }

    return undefined;
  }

  private extractUserFromToken(request: {
    headers: Record<string, string | string[] | undefined>;
  }): CurrentUserContext | undefined {
    const rawAuth = request.headers['authorization'];
    const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return undefined;
    }

    try {
      const decoded = jwt.decode(token) as {
        sub?: string;
        id?: string;
        activeRole?: 'DOCTOR' | 'PATIENT' | 'ADMIN';
        roles?: ('DOCTOR' | 'PATIENT' | 'ADMIN')[];
        email?: string;
      } | null;

      const userId = decoded?.sub ?? decoded?.id;
      if (userId && typeof userId === 'string' && userId.trim().length > 0) {
        const activeRole = decoded?.activeRole ?? decoded?.roles?.[0] ?? 'PATIENT';
        const context: CurrentUserContext = {
          userId: userId.trim(),
          activeRole,
        };
        if (decoded?.email) {
          context.email = decoded.email;
        }
        return context;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }
}
