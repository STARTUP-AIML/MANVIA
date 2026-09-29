// ==============================================================================
// MANVIA — AuthorizationController Unit Tests
// ==============================================================================
// Phase 5: Role Switching & Permissions Endpoint Validation
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthorizationController } from '../../src/modules/authorization/authorization.controller.js';
import type { TokenService } from '../../src/modules/auth/services/token.service.js';
import { PermissionService } from '../../src/modules/authorization/services/permission.service.js';
import type { AuthAuditService } from '../../src/modules/auth/services/auth-audit.service.js';
import { Role } from '@prisma/client';
import { ForbiddenError } from '../../src/common/errors/app-error.js';

describe('AuthorizationController', () => {
  let controller: AuthorizationController;
  let tokenService: TokenService;
  let permissionService: PermissionService;
  let auditService: AuthAuditService;

  beforeEach(() => {
    tokenService = {
      generateAccessToken: vi.fn().mockReturnValue({
        accessToken: 'new.jwt.token',
        expiresInSeconds: 900,
      }),
    } as unknown as TokenService;

    permissionService = new PermissionService();

    auditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthAuditService;

    controller = new AuthorizationController(tokenService, permissionService, auditService);
  });

  describe('switchRole', () => {
    it('should throw ForbiddenError and log audit failure when switching to a role not assigned', async () => {
      const user = {
        id: 'user-1',
        email: 'user@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 'sess-1',
      };

      await expect(controller.switchRole(user, { role: Role.ADMIN })).rejects.toThrow(
        new ForbiddenError('User is not assigned the requested role'),
      );

      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AUTH.ROLE_SWITCH_FAILURE',
          status: 'FAILURE',
        }),
      );
    });

    it('should switch role and issue new access token when role is assigned to user', async () => {
      const user = {
        id: 'user-1',
        email: 'doctor@example.com',
        roles: [Role.PATIENT, Role.DOCTOR],
        activeRole: Role.PATIENT,
        sessionId: 'sess-1',
      };

      const result = await controller.switchRole(user, { role: Role.DOCTOR });

      expect(result.activeRole).toBe(Role.DOCTOR);
      expect(result.accessToken).toBe('new.jwt.token');
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          sessionId: 'sess-1',
          activeRole: Role.DOCTOR,
        }),
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AUTH.ROLE_SWITCH_SUCCESS',
          status: 'SUCCESS',
        }),
      );
    });
  });

  describe('getPermissions', () => {
    it('should return permissions for current active role', () => {
      const user = {
        id: 'user-1',
        email: 'patient@example.com',
        roles: [Role.PATIENT],
        activeRole: Role.PATIENT,
        sessionId: 'sess-1',
      };

      const result = controller.getPermissions(user);
      expect(result.activeRole).toBe(Role.PATIENT);
      expect(result.roles).toEqual([Role.PATIENT]);
      expect(result.permissions.length).toBeGreaterThan(0);
    });
  });
});
