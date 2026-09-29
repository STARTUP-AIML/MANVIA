// ==============================================================================
// MANVIA — Policy Evaluation Guard
// ==============================================================================
// Phase 5: Extensible Resource-Level Policy Guard Boundary
// ==============================================================================

import { Injectable, type CanActivate, type ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator.js';
import type { AuthenticatedUser } from '../../auth/auth.interface.js';
import type { IPolicyHandler, AuthorizationContext } from '../authorization.interface.js';
import { AuthAuditService } from '../../auth/services/auth-audit.service.js';
import { UnauthorizedError, ForbiddenError } from '../../../common/errors/app-error.js';

@Injectable()
export class PolicyGuard implements CanActivate {
  private readonly logger = new Logger(PolicyGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuthAuditService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const policies = this.reflector.getAllAndOverride<IPolicyHandler[] | undefined>(
      CHECK_POLICIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!policies || policies.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser; params?: Record<string, string> }>();
    const user = request.user;

    // 1. Fail closed if unauthenticated
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const params = request.params ?? {};
    const authContext: AuthorizationContext = {
      user,
      resourceId: params['id'] ?? params['userId'],
      resourceOwnerId: params['userId'] ?? params['id'],
      metadata: { url: request.url, method: request.method },
    };

    // 2. Evaluate all attached policies
    for (const policy of policies) {
      try {
        const isAllowed = await policy.handle(authContext);
        if (!isAllowed) {
          await this.auditService.logEvent({
            actorUserId: user.id,
            action: 'AUTH.ACCESS_DENIED',
            resourceType: 'POLICY_AUTHORIZATION',
            resourceId: authContext.resourceId,
            status: 'FAILURE',
            details: {
              policyName: policy.name,
              reason: 'POLICY_EVALUATION_DENIED',
            },
          });
          throw new ForbiddenError('Access denied: policy evaluation failed');
        }
      } catch (err) {
        if (err instanceof ForbiddenError) {
          throw err;
        }
        this.logger.error(`Policy ${policy.name} threw error during evaluation: ${String(err)}`);
        throw new ForbiddenError('Access denied: policy evaluation failed');
      }
    }

    return true;
  }
}
