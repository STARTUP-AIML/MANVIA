// ==============================================================================
// MANVIA — Authentication Guard
// ==============================================================================
// Phase 4: Identity & Session Verification Boundary
// Determines "Is this request authenticated, and which User does this session represent?"
// (Resource authorization is strictly deferred to Phase 5)
// ==============================================================================

import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../services/token.service.js';
import { SessionService } from '../services/session.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { AuthenticatedUser } from '../auth.interface.js';
import { UnauthorizedError } from '../../../common/errors/app-error.js';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check for @Public() exemption
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedError('Invalid authorization header format (expected Bearer token)');
    }

    // 2. Cryptographic signature and expiration check
    const payload = this.tokenService.verifyAccessToken(token);

    // 3. Database session validity check (not revoked, not expired)
    const { isValid, session } = await this.sessionService.validateSession(payload.sessionId);

    if (!isValid || !session) {
      throw new UnauthorizedError('Authentication session is no longer active');
    }

    // 4. User account status check
    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account is inactive or suspended');
    }

    // 5. Attach safe minimal identity context to request
    request.user = {
      id: session.user.id,
      email: session.user.email,
      roles: session.user.roles,
      activeRole: payload.activeRole ?? session.user.roles[0] ?? 'PATIENT',
      sessionId: session.id,
    };

    return true;
  }
}
