// ==============================================================================
// MANVIA — Central Authorization Service
// ==============================================================================
// Phase 5: Authorization & Policy Evaluation Engine
// ==============================================================================

import { Injectable, Logger } from '@nestjs/common';
import type { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/auth.interface.js';
import type {
  AuthorizationContext,
  AuthorizationResult,
  IPolicyHandler,
  Permission,
} from '../authorization.interface.js';
import { PermissionService } from './permission.service.js';
import { AuthAuditService } from '../../auth/services/auth-audit.service.js';

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    private readonly permissionService: PermissionService,
    private readonly auditService: AuthAuditService,
  ) {}

  /**
   * Validates that the requested active role is genuinely assigned to the user.
   * Prevents client-side role manipulation / privilege escalation.
   */
  public validateActiveRole(user: AuthenticatedUser, candidateRole: Role): boolean {
    if (!user.roles || !Array.isArray(user.roles)) {
      return false;
    }
    return user.roles.includes(candidateRole);
  }

  /**
   * Checks whether the user's current active role possesses a specific permission.
   */
  public can(user: AuthenticatedUser, permission: Permission): boolean {
    if (!this.validateActiveRole(user, user.activeRole)) {
      this.logger.warn(
        `User ${user.id} has invalid activeRole '${user.activeRole}' not present in assigned roles [${user.roles.join(', ')}]`,
      );
      return false;
    }
    return this.permissionService.hasPermission(user.activeRole, permission);
  }

  /**
   * Checks whether the user's active role matches any of the required roles.
   */
  public canAccessRole(user: AuthenticatedUser, requiredRoles: Role[]): boolean {
    if (requiredRoles.length === 0) {
      return true;
    }
    if (!this.validateActiveRole(user, user.activeRole)) {
      return false;
    }
    return requiredRoles.includes(user.activeRole);
  }

  /**
   * Reusable check to determine if an authenticated user owns a specific resource.
   * Uses authenticated user context — never client-provided user IDs.
   */
  public checkOwnership(user: AuthenticatedUser, resourceOwnerId: string): boolean {
    if (!user || !user.id || !resourceOwnerId) {
      return false;
    }
    return user.id === resourceOwnerId;
  }

  /**
   * Evaluates an extensible policy handler against the provided authorization context.
   */
  public async evaluatePolicy(
    policy: IPolicyHandler,
    context: AuthorizationContext,
  ): Promise<boolean> {
    try {
      return await policy.handle(context);
    } catch (err) {
      this.logger.error(
        `Policy ${policy.name} evaluation error for user ${context.user.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false; // Fail closed
    }
  }

  /**
   * Generic evaluation endpoint that logs audit events on authorization rejection.
   */
  public async authorize(context: AuthorizationContext): Promise<AuthorizationResult> {
    // 1. Verify active role validity
    if (!this.validateActiveRole(context.user, context.user.activeRole)) {
      await this.auditService.logEvent({
        actorUserId: context.user.id,
        action: 'AUTH.ACCESS_DENIED',
        resourceType: context.resourceType ?? 'AUTHORIZATION',
        resourceId: context.resourceId,
        status: 'FAILURE',
        details: {
          reason: 'ROLE_SPOOFING_ATTEMPT',
          claimedRole: context.user.activeRole,
          assignedRoles: context.user.roles,
        },
      });
      return { isAuthorized: false, reason: 'Invalid active role assignment' };
    }

    // 2. Evaluate ownership if a resourceOwnerId is specified
    if (context.resourceOwnerId && !this.checkOwnership(context.user, context.resourceOwnerId)) {
      await this.auditService.logEvent({
        actorUserId: context.user.id,
        action: 'AUTH.ACCESS_DENIED',
        resourceType: context.resourceType ?? 'RESOURCE',
        resourceId: context.resourceId,
        status: 'FAILURE',
        details: {
          reason: 'OWNERSHIP_VIOLATION',
          targetOwnerId: context.resourceOwnerId,
        },
      });
      return { isAuthorized: false, reason: 'Ownership verification failed' };
    }

    return { isAuthorized: true };
  }
}
