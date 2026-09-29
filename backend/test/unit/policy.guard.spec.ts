// ==============================================================================
// MANVIA — PolicyGuard Unit Tests
// ==============================================================================
// Phase 5: Extensible Policy Guard Validation
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { PolicyGuard } from '../../src/modules/authorization/guards/policy.guard.js';
import type { AuthAuditService } from '../../src/modules/auth/services/auth-audit.service.js';
import type { IPolicyHandler } from '../../src/modules/authorization/authorization.interface.js';
import { Role } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../../src/common/errors/app-error.js';

describe('PolicyGuard', () => {
  let guard: PolicyGuard;
  let reflector: Reflector;
  let auditService: AuthAuditService;

  const createMockExecutionContext = (
    user?: unknown,
    params: Record<string, string> = {},
  ): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user,
          params,
          url: '/api/v1/resource',
          method: 'GET',
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    auditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthAuditService;

    guard = new PolicyGuard(reflector, auditService);
  });

  it('should pass through when no policies are configured', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockExecutionContext();

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedError when unauthenticated', async () => {
    const mockPolicy: IPolicyHandler = {
      name: 'MockPolicy',
      handle: vi.fn().mockReturnValue(true),
    };
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([mockPolicy]);
    const ctx = createMockExecutionContext(undefined);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
  });

  it('should allow access when attached policies evaluate to true', async () => {
    const mockPolicy: IPolicyHandler = {
      name: 'MockPolicy',
      handle: vi.fn().mockReturnValue(true),
    };
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([mockPolicy]);

    const user = {
      id: 'user-1',
      email: 'user@example.com',
      roles: [Role.PATIENT],
      activeRole: Role.PATIENT,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user, { id: 'rec-1' });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockPolicy.handle).toHaveBeenCalled();
  });

  it('should throw ForbiddenError when attached policy evaluates to false', async () => {
    const mockPolicy: IPolicyHandler = {
      name: 'MockPolicy',
      handle: vi.fn().mockReturnValue(false),
    };
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([mockPolicy]);

    const user = {
      id: 'user-1',
      email: 'user@example.com',
      roles: [Role.PATIENT],
      activeRole: Role.PATIENT,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user, { id: 'rec-1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenError('Access denied: policy evaluation failed'),
    );
    expect(auditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH.ACCESS_DENIED',
        status: 'FAILURE',
      }),
    );
  });

  it('should fail closed when attached policy throws an error', async () => {
    const mockPolicy: IPolicyHandler = {
      name: 'FaultyPolicy',
      handle: vi.fn().mockImplementation(() => {
        throw new Error('Database connection failed during policy evaluation');
      }),
    };
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([mockPolicy]);

    const user = {
      id: 'user-1',
      email: 'user@example.com',
      roles: [Role.PATIENT],
      activeRole: Role.PATIENT,
      sessionId: 'sess-1',
    };
    const ctx = createMockExecutionContext(user, { id: 'rec-1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenError('Access denied: policy evaluation failed'),
    );
  });
});
