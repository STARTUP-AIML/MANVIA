// ==============================================================================
// MANVIA — AuthorizationService Unit Tests
// ==============================================================================
// Phase 5: Authorization Service & Policy Evaluation Validation
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthorizationService } from '../../src/modules/authorization/services/authorization.service.js';
import { PermissionService } from '../../src/modules/authorization/services/permission.service.js';
import type { AuthAuditService } from '../../src/modules/auth/services/auth-audit.service.js';
import {
  Permission,
  type IPolicyHandler,
} from '../../src/modules/authorization/authorization.interface.js';
import { ResourceOwnershipPolicy } from '../../src/modules/authorization/policies/resource-ownership.policy.js';
import { Role } from '@prisma/client';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let permissionService: PermissionService;
  let auditService: AuthAuditService;

  beforeEach(() => {
    permissionService = new PermissionService();
    auditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthAuditService;

    service = new AuthorizationService(permissionService, auditService);
  });

  describe('validateActiveRole', () => {
    it('should return true when role belongs to user assigned roles', () => {
      const user = {
        id: 'u-1',
        email: 'doc@example.com',
        roles: [Role.PATIENT, Role.DOCTOR],
        activeRole: Role.DOCTOR,
        sessionId: 's-1',
      };
      expect(service.validateActiveRole(user, Role.DOCTOR)).toBe(true);
      expect(service.validateActiveRole(user, Role.PATIENT)).toBe(true);
    });

    it('should return false when candidate role is NOT in assigned roles', () => {
      const user = {
        id: 'u-1',
        email: 'pat@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(service.validateActiveRole(user, Role.ADMIN)).toBe(false);
      expect(service.validateActiveRole(user, Role.DOCTOR)).toBe(false);
    });

    it('should return false if roles array is undefined or empty', () => {
      const user = {
        id: 'u-1',
        email: 'bad@example.com',
        roles: [] as Role[],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(service.validateActiveRole(user, Role.PATIENT)).toBe(false);
    });
  });

  describe('can', () => {
    it('should return true when active role has permission', () => {
      const user = {
        id: 'u-1',
        email: 'patient@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(service.can(user, Permission.PATIENT_PROFILE_READ)).toBe(true);
    });

    it('should return false when active role lacks permission', () => {
      const user = {
        id: 'u-1',
        email: 'patient@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(service.can(user, Permission.ADMIN_ACCESS)).toBe(false);
    });

    it('should return false when active role is invalid/spoofed', () => {
      const user = {
        id: 'u-1',
        email: 'patient@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.ADMIN, // spoofed!
        sessionId: 's-1',
      };
      expect(service.can(user, Permission.ADMIN_ACCESS)).toBe(false);
    });
  });

  describe('canAccessRole', () => {
    it('should return true if requiredRoles is empty', () => {
      const user = {
        id: 'u-1',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(service.canAccessRole(user, [])).toBe(true);
    });

    it('should return true if active role matches one of required roles', () => {
      const user = {
        id: 'u-1',
        email: 'doc@example.com',
        roles: [Role.DOCTOR],
        activeRole: Role.DOCTOR,
        sessionId: 's-1',
      };
      expect(service.canAccessRole(user, [Role.PATIENT, Role.DOCTOR])).toBe(true);
    });

    it('should return false if active role does not match', () => {
      const user = {
        id: 'u-1',
        email: 'pat@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(service.canAccessRole(user, [Role.ADMIN])).toBe(false);
    });

    it('should return false if active role is not in assigned roles', () => {
      const user = {
        id: 'u-1',
        email: 'pat@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.ADMIN, // spoofed
        sessionId: 's-1',
      };
      expect(service.canAccessRole(user, [Role.ADMIN])).toBe(false);
    });
  });

  describe('checkOwnership', () => {
    it('should return true when user.id matches resourceOwnerId', () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(service.checkOwnership(user, 'user-123')).toBe(true);
    });

    it('should return false when user.id does not match resourceOwnerId', () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(service.checkOwnership(user, 'other-456')).toBe(false);
    });

    it('should return false if user or resourceOwnerId is empty', () => {
      const user = {
        id: '',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(service.checkOwnership(user, 'other-456')).toBe(false);
    });
  });

  describe('evaluatePolicy', () => {
    it('should return policy result on success', async () => {
      const policy: IPolicyHandler = {
        name: 'TestPolicy',
        handle: vi.fn().mockResolvedValue(true),
      };
      const user = {
        id: 'u-1',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      const result = await service.evaluatePolicy(policy, { user });
      expect(result).toBe(true);
    });

    it('should fail closed (return false) if policy throws', async () => {
      const policy: IPolicyHandler = {
        name: 'FaultyPolicy',
        handle: vi.fn().mockRejectedValue(new Error('Policy crash')),
      };
      const user = {
        id: 'u-1',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      const result = await service.evaluatePolicy(policy, { user });
      expect(result).toBe(false);
    });
  });

  describe('authorize', () => {
    it('should reject and log audit if active role is spoofed', async () => {
      const user = {
        id: 'u-1',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.ADMIN, // spoofed
        sessionId: 's-1',
      };
      const result = await service.authorize({ user });
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain('Invalid active role assignment');
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AUTH.ACCESS_DENIED',
          status: 'FAILURE',
        }),
      );
    });

    it('should reject and log audit if ownership check fails', async () => {
      const user = {
        id: 'u-1',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      const result = await service.authorize({ user, resourceOwnerId: 'different-owner' });
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain('Ownership verification failed');
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AUTH.ACCESS_DENIED',
          status: 'FAILURE',
        }),
      );
    });

    it('should return isAuthorized: true when all checks pass', async () => {
      const user = {
        id: 'u-1',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      const result = await service.authorize({ user, resourceOwnerId: 'u-1' });
      expect(result.isAuthorized).toBe(true);
    });
  });

  describe('ResourceOwnershipPolicy', () => {
    it('should return false if resourceOwnerId is missing', () => {
      const policy = new ResourceOwnershipPolicy();
      const user = {
        id: 'u-1',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(policy.handle({ user })).toBe(false);
    });

    it('should return true when user.id matches resourceOwnerId', () => {
      const policy = new ResourceOwnershipPolicy();
      const user = {
        id: 'u-1',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(policy.handle({ user, resourceOwnerId: 'u-1' })).toBe(true);
    });

    it('should return false when user.id does not match resourceOwnerId', () => {
      const policy = new ResourceOwnershipPolicy();
      const user = {
        id: 'u-1',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 's-1',
      };
      expect(policy.handle({ user, resourceOwnerId: 'other-user' })).toBe(false);
    });
  });
});
