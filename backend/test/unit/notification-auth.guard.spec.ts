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

  it('should populate user from x-user-id and x-user-role headers', () => {
    const req: { headers: Record<string, string>; user?: { userId: string; activeRole: string } } =
      {
        headers: {
          'x-user-id': 'usr-456',
          'x-user-role': 'DOCTOR',
        },
      };
    const ctx = createMockContext(req as unknown as Record<string, unknown>);

    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user?.userId).toBe('usr-456');
    expect(req.user?.activeRole).toBe('DOCTOR');
  });

  it('should support array headers and alternative role header names', () => {
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

    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.user?.userId).toBe('usr-789');
    expect(req.user?.activeRole).toBe('ADMIN');
  });

  it('should default role to PATIENT when role header is omitted', () => {
    const req: { headers: Record<string, string>; user?: { userId: string; activeRole: string } } =
      {
        headers: {
          'x-user-id': 'usr-default',
        },
      };
    const ctx = createMockContext(req as unknown as Record<string, unknown>);

    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.user?.activeRole).toBe('PATIENT');
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
