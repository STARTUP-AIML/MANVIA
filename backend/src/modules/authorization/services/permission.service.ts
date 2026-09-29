// ==============================================================================
// MANVIA — Permission Service
// ==============================================================================
// Phase 5: RBAC Permission Evaluation & Mapping
// ==============================================================================

import { Injectable } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { Permission } from '../authorization.interface.js';
import { ROLE_PERMISSIONS } from '../constants/permissions.constants.js';

@Injectable()
export class PermissionService {
  /**
   * Retrieves all permissions assigned to a given role.
   */
  public getPermissionsForRole(role: Role): readonly Permission[] {
    return ROLE_PERMISSIONS[role] ?? [];
  }

  /**
   * Retrieves the union of permissions across multiple roles.
   */
  public getPermissionsForRoles(roles: Role[]): Permission[] {
    const permissionsSet = new Set<Permission>();
    for (const role of roles) {
      const perms = this.getPermissionsForRole(role);
      for (const p of perms) {
        permissionsSet.add(p);
      }
    }
    return Array.from(permissionsSet);
  }

  /**
   * Checks whether a role includes a specific permission.
   */
  public hasPermission(role: Role, permission: Permission): boolean {
    const permissions = this.getPermissionsForRole(role);
    return permissions.includes(permission);
  }

  /**
   * Checks whether a role includes all required permissions.
   */
  public hasAllPermissions(role: Role, requiredPermissions: Permission[]): boolean {
    if (requiredPermissions.length === 0) {
      return true;
    }
    const permissions = this.getPermissionsForRole(role);
    return requiredPermissions.every((p) => permissions.includes(p));
  }

  /**
   * Checks whether a role includes at least one of the specified permissions.
   */
  public hasAnyPermission(role: Role, permissionsToCheck: Permission[]): boolean {
    if (permissionsToCheck.length === 0) {
      return true;
    }
    const permissions = this.getPermissionsForRole(role);
    return permissionsToCheck.some((p) => permissions.includes(p));
  }
}
