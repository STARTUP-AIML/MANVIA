// ==============================================================================
// MANVIA — RolesGuard Unit Tests
// ==============================================================================
// Phase 5: RBAC Roles & Permissions Guard Validation
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from '../../src/modules/authorization/guards/roles.guard.js';
import { PermissionService } from '../../src/modules/authorization/services/permission.service.js';
import type { AuthAuditService } from '../../src/modules/auth/services/auth-audit.service.js';
import { Permission } from '../../src/modules/authorization/authorization.interface.js';
import { Role } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../../src/common/errors/app-error.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let permissionService: PermissionService;
  let auditService: AuthAuditService;

  const createMockExecutionContext = (user?: unknown): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    permissionService = new PermissionService();
    auditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthAuditService;

    guard = new RolesGuard(reflector, permissionService, auditService);
  });

  it('should pass through when neither roles nor permissions are configured on route', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockExecutionContext();

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedError when route is protected by roles but request is unauthenticated', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'manvia:roles') return [Role.DOCTOR];
      return undefined;
    });
    const ctx = createMockExecutionContext(undefined); // No user

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
  });

  it('should throw ForbiddenError when user activeRole is not in assigned roles (role spoofing mitigation)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'manvia:roles') return [Role.DOCTOR];
      return undefined;
    });

    const user = {
      id: 'user-1',
      email: 'patient@example.com',
      roles: [Role.PATIENT],
      activeRole: Role.ADMIN, // Spoofed role!
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user);

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenError('Invalid active role assignment'),
    );
    expect(auditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH.ACCESS_DENIED',
        status: 'FAILURE',
      }),
    );
  });

  it('should allow access when user activeRole matches required roles', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'manvia:roles') return [Role.DOCTOR, Role.ADMIN];
      return undefined;
    });

    const user = {
      id: 'user-doc',
      email: 'doctor@example.com',
      roles: [Role.DOCTOR],
      activeRole: Role.DOCTOR,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenError when user activeRole does not match required roles', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'manvia:roles') return [Role.ADMIN];
      return undefined;
    });

    const user = {
      id: 'user-pat',
      email: 'patient@example.com',
      roles: [Role.PATIENT],
      activeRole: Role.PATIENT,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user);

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenError('Access denied: insufficient role privileges'),
    );
    expect(auditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH.ACCESS_DENIED',
        status: 'FAILURE',
      }),
    );
  });

  it('should allow access when user activeRole possesses all required permissions', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'manvia:permissions') {
        return [Permission.USER_READ, Permission.PATIENT_PROFILE_READ];
      }
      return undefined;
    });

    const user = {
      id: 'user-pat',
      email: 'patient@example.com',
      roles: [Role.PATIENT],
      activeRole: Role.PATIENT,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenError when user activeRole is missing a required permission', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'manvia:permissions') {
        return [Permission.ADMIN_ACCESS];
      }
      return undefined;
    });

    const user = {
      id: 'user-pat',
      email: 'patient@example.com',
      roles: [Role.PATIENT],
      activeRole: Role.PATIENT,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user);

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenError('Access denied: missing required permissions'),
    );
    expect(auditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH.ACCESS_DENIED',
        status: 'FAILURE',
      }),
    );
  });
});
