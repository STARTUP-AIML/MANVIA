import { describe, it, expect, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { AdminAuthGuard } from '../../src/modules/doctor-verification/guards/admin-auth.guard.js';
import { UnauthorizedError, ForbiddenError } from '../../src/common/errors/app-error.js';

describe('AdminAuthGuard (Unit Tests)', () => {
  let guard: AdminAuthGuard;

  beforeEach(() => {
    guard = new AdminAuthGuard();
  });

  const createMockContext = (request: Record<string, unknown>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access when request.user has ADMIN role', () => {
    const ctx = createMockContext({
      user: {
        userId: 'admin-123',
        activeRole: 'ADMIN',
      },
      headers: {},
    });

    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should reject forged admin headers when request.user is absent', () => {
    const ctx = createMockContext({
      headers: {
        'x-user-id': 'admin-456',
        'x-user-role': 'ADMIN',
      },
    });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedError);
  });

  it('should reject unauthenticated request with UnauthorizedError', () => {
    const ctx = createMockContext({
      headers: {},
    });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedError);
  });

  it('should reject DOCTOR role with ForbiddenError', () => {
    const ctx = createMockContext({
      user: {
        userId: 'doctor-123',
        activeRole: 'DOCTOR',
      },
      headers: {},
    });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenError);
  });

  it('should reject PATIENT role with ForbiddenError', () => {
    const ctx = createMockContext({
      user: {
        userId: 'patient-123',
        activeRole: 'PATIENT',
      },
      headers: {},
    });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenError);
  });
});
