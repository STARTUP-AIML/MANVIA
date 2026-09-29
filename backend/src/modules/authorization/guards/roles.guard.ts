// ==============================================================================
// MANVIA — Roles & Permissions Guard
// ==============================================================================
// Phase 5: RBAC Role & Permission Enforcement Boundary
// ==============================================================================

import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import type { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { AuthenticatedUser } from '../../auth/auth.interface.js';
import type { Permission } from '../authorization.interface.js';
import { PermissionService } from '../services/permission.service.js';
import { AuthAuditService } from '../../auth/services/auth-audit.service.js';
import { UnauthorizedError, ForbiddenError } from '../../../common/errors/app-error.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
    private readonly auditService: AuthAuditService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If neither roles nor permissions are defined on the handler/controller, pass through
    if (!requiredRoles && !requiredPermissions) {
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

    // 2. Validate active role against assigned roles (mitigates role spoofing & vertical escalation)
    if (!user.roles || !user.roles.includes(user.activeRole)) {
      await this.auditService.logEvent({
        actorUserId: user.id,
        action: 'AUTH.ACCESS_DENIED',
        resourceType: 'AUTHORIZATION',
        status: 'FAILURE',
        details: {
          reason: 'INVALID_ACTIVE_ROLE',
          activeRole: user.activeRole,
          assignedRoles: user.roles,
        },
      });
      throw new ForbiddenError('Invalid active role assignment');
    }

    // 3. Evaluate required roles
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.includes(user.activeRole);
      if (!hasRequiredRole) {
        await this.auditService.logEvent({
          actorUserId: user.id,
          action: 'AUTH.ACCESS_DENIED',
          resourceType: 'ROLE_AUTHORIZATION',
          status: 'FAILURE',
          details: {
            reason: 'INSUFFICIENT_ROLE',
            requiredRoles,
            activeRole: user.activeRole,
          },
        });
        throw new ForbiddenError('Access denied: insufficient role privileges');
      }
    }

    // 4. Evaluate required permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPerms = this.permissionService.hasAllPermissions(
        user.activeRole,
        requiredPermissions,
      );
      if (!hasAllPerms) {
        await this.auditService.logEvent({
          actorUserId: user.id,
          action: 'AUTH.ACCESS_DENIED',
          resourceType: 'PERMISSION_AUTHORIZATION',
          status: 'FAILURE',
          details: {
            reason: 'MISSING_PERMISSIONS',
            requiredPermissions,
            activeRole: user.activeRole,
          },
        });
        throw new ForbiddenError('Access denied: missing required permissions');
      }
    }

    return true;
  }
}
