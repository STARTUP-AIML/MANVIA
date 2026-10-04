import { describe, it, expect, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { RefundAuthGuard } from '../../src/modules/refunds/guards/refund-auth.guard.js';
import { UnauthorizedError } from '../../src/common/errors/app-error.js';

describe('RefundAuthGuard (Unit Tests)', () => {
  let guard: RefundAuthGuard;

  beforeEach(() => {
    guard = new RefundAuthGuard();
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

  it('should allow access when request has user object', () => {
    const ctx = createMockContext({
      user: {
        userId: 'patient-123',
        activeRole: 'PATIENT',
      },
      headers: {},
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should reject forged x-user-id/x-user-role headers when request.user is absent', () => {
    const req: { headers: Record<string, string>; user?: { userId: string; activeRole: string } } =
      {
        headers: {
          'x-user-id': 'doc-123',
          'x-user-role': 'DOCTOR',
        },
      };
    const ctx = createMockContext(req as unknown as Record<string, unknown>);

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedError);
    expect(req.user).toBeUndefined();
  });

  it('should throw UnauthorizedError when no credentials are provided', () => {
    const ctx = createMockContext({
      headers: {},
    });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedError);
  });
});
