// ==============================================================================
// MANVIA — Resource Owner Guard
// ==============================================================================
// Phase 5: Resource Ownership Authorization Boundary
// ==============================================================================

import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import {
  REQUIRE_OWNERSHIP_KEY,
  type OwnershipOptions,
} from '../decorators/require-ownership.decorator.js';
import type { AuthenticatedUser } from '../../auth/auth.interface.js';
import { AuthAuditService } from '../../auth/services/auth-audit.service.js';
import { UnauthorizedError, ForbiddenError } from '../../../common/errors/app-error.js';

@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuthAuditService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<OwnershipOptions | undefined>(
      REQUIRE_OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const user = request.user;

    // 1. Fail closed if unauthenticated
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // 2. Extract resource owner identifier from request
    const location = options.location ?? 'params';
    const source = (request as unknown as Record<string, Record<string, unknown>>)[location] ?? {};

    const targetParam = options.paramName;
    let targetOwnerId: string | undefined;

    if (targetParam && typeof source[targetParam] === 'string') {
      targetOwnerId = source[targetParam] as string;
    } else if (typeof source['userId'] === 'string') {
      targetOwnerId = source['userId'] as string;
    } else if (typeof source['id'] === 'string') {
      targetOwnerId = source['id'] as string;
    }

    if (!targetOwnerId) {
      throw new ForbiddenError('Resource identifier missing for ownership verification');
    }

    // 3. Ownership verification: requesting user must match resource owner
    if (user.id === targetOwnerId) {
      return true;
    }

    // 4. Admin override check (strictly auditable and only if explicitly permitted by route options)
    if (options.allowAdmin && user.activeRole === 'ADMIN') {
      await this.auditService.logEvent({
        actorUserId: user.id,
        action: 'AUTH.ADMIN_RESOURCE_ACCESS',
        resourceType: 'RESOURCE_OVERRIDE',
        resourceId: targetOwnerId,
        status: 'SUCCESS',
        details: { targetOwnerId },
      });
      return true;
    }

    // 5. Fail closed on ownership violation
    await this.auditService.logEvent({
      actorUserId: user.id,
      action: 'AUTH.ACCESS_DENIED',
      resourceType: 'OWNERSHIP_AUTHORIZATION',
      resourceId: targetOwnerId,
      status: 'FAILURE',
      details: {
        reason: 'OWNERSHIP_VIOLATION',
        targetOwnerId,
      },
    });

    throw new ForbiddenError('Access denied: you do not have permission to access this resource');
  }
}
