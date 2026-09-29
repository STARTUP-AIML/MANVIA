// ==============================================================================
// MANVIA — ResourceOwnerGuard Unit Tests
// ==============================================================================
// Phase 5: Resource Ownership Authorization Guard Validation
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { ResourceOwnerGuard } from '../../src/modules/authorization/guards/resource-owner.guard.js';
import type { AuthAuditService } from '../../src/modules/auth/services/auth-audit.service.js';
import { Role } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../../src/common/errors/app-error.js';

describe('ResourceOwnerGuard', () => {
  let guard: ResourceOwnerGuard;
  let reflector: Reflector;
  let auditService: AuthAuditService;

  const createMockExecutionContext = (
    user?: unknown,
    params: Record<string, unknown> = {},
    body: Record<string, unknown> = {},
  ): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user, params, body }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    auditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthAuditService;

    guard = new ResourceOwnerGuard(reflector, auditService);
  });

  it('should pass through when @RequireOwnership is not configured', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockExecutionContext();

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedError when request is unauthenticated', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({});
    const ctx = createMockExecutionContext(undefined, { id: 'user-1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
  });

  it('should allow access when user.id matches target param (ownership verified)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({});
    const user = {
      id: 'user-owner-123',
      email: 'owner@example.com',
      roles: [Role.PATIENT],
      activeRole: Role.PATIENT,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user, { userId: 'user-owner-123' });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should deny access when user.id does not match target param (ownership violation)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({});
    const user = {
      id: 'attacker-id-456',
      email: 'attacker@example.com',
      roles: [Role.PATIENT],
      activeRole: Role.PATIENT,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user, { userId: 'victim-id-123' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenError('Access denied: you do not have permission to access this resource'),
    );
    expect(auditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH.ACCESS_DENIED',
        status: 'FAILURE',
        details: expect.objectContaining({ reason: 'OWNERSHIP_VIOLATION' }),
      }),
    );
  });

  it('should deny access to ADMIN by default when allowAdmin is false (no automatic admin bypass)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ allowAdmin: false });
    const user = {
      id: 'admin-id-789',
      email: 'admin@example.com',
      roles: [Role.ADMIN],
      activeRole: Role.ADMIN,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user, { userId: 'patient-id-123' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenError);
  });

  it('should allow access to ADMIN when allowAdmin is explicitly true and log audit event', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ allowAdmin: true });
    const user = {
      id: 'admin-id-789',
      email: 'admin@example.com',
      roles: [Role.ADMIN],
      activeRole: Role.ADMIN,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user, { userId: 'patient-id-123' });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(auditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH.ADMIN_RESOURCE_ACCESS',
        status: 'SUCCESS',
      }),
    );
  });

  it('should throw ForbiddenError when target identifier is missing from request', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ paramName: 'missingParam' });
    const user = {
      id: 'user-123',
      email: 'user@example.com',
      roles: [Role.PATIENT],
      activeRole: Role.PATIENT,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user, {}); // No params

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenError('Resource identifier missing for ownership verification'),
    );
  });
});
