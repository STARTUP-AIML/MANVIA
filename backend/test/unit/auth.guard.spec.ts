// ==============================================================================
// MANVIA — Authentication Guard Unit Tests
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthGuard } from '../../src/modules/auth/guards/auth.guard.js';
import type { TokenService } from '../../src/modules/auth/services/token.service.js';
import type { SessionService } from '../../src/modules/auth/services/session.service.js';
import type { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import type { Session, User } from '@prisma/client';
import type { AuthenticatedUser } from '../../src/modules/auth/auth.interface.js';

interface MockRequest {
  headers: Record<string, string | undefined>;
  user?: AuthenticatedUser | undefined;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockReflector: Partial<Reflector>;
  let mockTokenService: Partial<TokenService>;
  let mockSessionService: Partial<SessionService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    phone: null,
    emailVerified: true,
    phoneVerified: false,
    status: 'ACTIVE',
    roles: ['PATIENT'],
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession: Session = {
    id: 'session-123',
    userId: 'user-123',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    deviceType: null,
    deviceName: null,
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 86400 * 1000),
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function createMockExecutionContext(headers: Record<string, string | undefined> = {}) {
    const request: MockRequest = { headers };
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      _request: request,
    } as unknown as ExecutionContext & { _request: MockRequest };
  }

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    };

    mockTokenService = {
      verifyAccessToken: vi.fn().mockReturnValue({
        sub: 'user-123',
        sessionId: 'session-123',
        roles: ['PATIENT'],
        activeRole: 'PATIENT',
        jti: 'jti-123',
      }),
    };

    mockSessionService = {
      validateSession: vi.fn().mockResolvedValue({
        isValid: true,
        session: { ...mockSession, user: mockUser },
      }),
    };

    guard = new AuthGuard(
      mockReflector as Reflector,
      mockTokenService as TokenService,
      mockSessionService as SessionService,
    );
  });

  it('should allow public routes without token', async () => {
    vi.mocked(mockReflector.getAllAndOverride!).mockReturnValue(true);
    const ctx = createMockExecutionContext();

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedError when authorization header is missing', async () => {
    const ctx = createMockExecutionContext({});

    await expect(guard.canActivate(ctx)).rejects.toThrow('Missing authorization header');
  });

  it('should throw UnauthorizedError when authorization header is not Bearer scheme', async () => {
    const ctx = createMockExecutionContext({ authorization: 'Basic dXNlcjpwYXNz' });

    await expect(guard.canActivate(ctx)).rejects.toThrow('expected Bearer token');
  });

  it('should throw UnauthorizedError when session is invalid or revoked', async () => {
    vi.mocked(mockSessionService.validateSession!).mockResolvedValue({ isValid: false });
    const ctx = createMockExecutionContext({ authorization: 'Bearer valid.jwt.token' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Authentication session is no longer active',
    );
  });

  it('should throw UnauthorizedError when user account is inactive or suspended', async () => {
    vi.mocked(mockSessionService.validateSession!).mockResolvedValue({
      isValid: true,
      session: {
        ...mockSession,
        user: { ...mockUser, status: 'SUSPENDED' },
      },
    });
    const ctx = createMockExecutionContext({ authorization: 'Bearer valid.jwt.token' });

    await expect(guard.canActivate(ctx)).rejects.toThrow('User account is inactive or suspended');
  });

  it('should attach authenticated user context to request and return true on success', async () => {
    const ctx = createMockExecutionContext({ authorization: 'Bearer valid.jwt.token' });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const userContext = ctx._request.user;
    expect(userContext).toBeDefined();
    expect(userContext!.id).toBe('user-123');
    expect(userContext!.email).toBe('test@example.com');
    expect(userContext!.roles).toEqual(['PATIENT']);
    expect(userContext!.activeRole).toBe('PATIENT');
    expect(userContext!.sessionId).toBe('session-123');
  });
});
