import { describe, it, expect, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { NotificationAuthGuard } from '../../src/modules/notifications/guards/notification-auth.guard.js';
import { UnauthorizedError } from '../../src/common/errors/app-error.js';

describe('NotificationAuthGuard (Unit Tests)', () => {
  let guard: NotificationAuthGuard;

  beforeEach(() => {
    guard = new NotificationAuthGuard();
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
        userId: 'usr-123',
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
          'x-user-id': 'usr-456',
          'x-user-role': 'DOCTOR',
        },
      };
    const ctx = createMockContext(req as unknown as Record<string, unknown>);

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedError);
    expect(req.user).toBeUndefined();
  });

  it('should reject array/alternative forged role headers when request.user is absent', () => {
    const req: {
      headers: Record<string, string | string[]>;
      user?: { userId: string; activeRole: string };
    } = {
      headers: {
        'x-user-id': ['usr-789'],
        'x-active-role': ['ADMIN'],
      },
    };
    const ctx = createMockContext(req as unknown as Record<string, unknown>);

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedError);
    expect(req.user).toBeUndefined();
  });

  it('should reject forged x-user-id even when no role header is present', () => {
    const req: { headers: Record<string, string>; user?: { userId: string; activeRole: string } } =
      {
        headers: {
          'x-user-id': 'usr-default',
        },
      };
    const ctx = createMockContext(req as unknown as Record<string, unknown>);

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedError);
    expect(req.user).toBeUndefined();
  });

  it('should throw UnauthorizedError when no credentials or empty userId provided', () => {
    const ctxNoHeaders = createMockContext({
      headers: {},
    });
    expect(() => guard.canActivate(ctxNoHeaders)).toThrow(UnauthorizedError);

    const ctxEmptyUser = createMockContext({
      headers: {
        'x-user-id': '   ',
      },
    });
    expect(() => guard.canActivate(ctxEmptyUser)).toThrow(UnauthorizedError);
  });
});
