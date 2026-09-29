import { describe, it, expect, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { DoctorAuthGuard } from '../../src/modules/doctors/guards/doctor-auth.guard.js';
import { UnauthorizedError, ForbiddenError } from '../../src/common/errors/app-error.js';

describe('DoctorAuthGuard', () => {
  let guard: DoctorAuthGuard;

  beforeEach(() => {
    guard = new DoctorAuthGuard();
  });

  function createMockExecutionContext(req: Record<string, unknown> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getClass: () => ({}),
      getHandler: () => ({}),
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToRpc: () => ({}) as never,
      switchToWs: () => ({}) as never,
      getType: () => 'http',
    } as unknown as ExecutionContext;
  }

  it('should allow access when request has valid DOCTOR user context', () => {
    const context = createMockExecutionContext({
      headers: {},
      user: {
        userId: '11111111-1111-1111-1111-111111111111',
        activeRole: 'DOCTOR',
      },
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access via test x-user-id and x-user-role headers', () => {
    const req: Record<string, unknown> = {
      headers: {
        'x-user-id': '22222222-2222-2222-2222-222222222222',
        'x-user-role': 'DOCTOR',
      },
    };
    const context = createMockExecutionContext(req);

    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.user).toEqual({
      userId: '22222222-2222-2222-2222-222222222222',
      activeRole: 'DOCTOR',
    });
  });

  it('should throw UnauthorizedError when no credentials or user context are present', () => {
    const context = createMockExecutionContext({
      headers: {},
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedError);
  });

  it('should throw ForbiddenError when user role is PATIENT', () => {
    const context = createMockExecutionContext({
      headers: {},
      user: {
        userId: '33333333-3333-3333-3333-333333333333',
        activeRole: 'PATIENT',
      },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenError);
  });

  it('should throw ForbiddenError when x-user-role header is PATIENT', () => {
    const context = createMockExecutionContext({
      headers: {
        'x-user-id': '44444444-4444-4444-4444-444444444444',
        'x-user-role': 'PATIENT',
      },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenError);
  });
});
