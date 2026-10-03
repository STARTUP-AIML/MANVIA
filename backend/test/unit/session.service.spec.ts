// ==============================================================================
// MANVIA — Session Service Unit Tests
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionService } from '../../src/modules/auth/services/session.service.js';
import type { SessionRepository } from '../../src/modules/auth/repositories/session.repository.js';
import type { TokenService } from '../../src/modules/auth/services/token.service.js';
import type { AuthAuditService } from '../../src/modules/auth/services/auth-audit.service.js';
import type { PrismaService } from '../../src/database/prisma.service.js';
import { UnauthorizedError } from '../../src/common/errors/app-error.js';
import type { Session, RefreshToken, User } from '@prisma/client';

describe('SessionService', () => {
  let service: SessionService;
  let mockSessionRepo: Partial<SessionRepository>;
  let mockTokenService: Partial<TokenService>;
  let mockAuditService: Partial<AuthAuditService>;
  let mockPrisma: Partial<PrismaService>;

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

  const mockRefreshToken: RefreshToken = {
    id: 'token-123',
    sessionId: 'session-123',
    tokenHash: 'hashed-token-val',
    familyId: 'family-123',
    usedAt: null,
    expiresAt: new Date(Date.now() + 7 * 86400 * 1000),
    revokedAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockSessionRepo = {
      createSession: vi.fn().mockResolvedValue(mockSession),
      createRefreshToken: vi.fn().mockResolvedValue(mockRefreshToken),
      findSessionById: vi.fn(),
      updateSessionActivity: vi.fn().mockResolvedValue(mockSession),
      revokeSession: vi.fn().mockResolvedValue(mockSession),
      revokeAllUserSessions: vi.fn().mockResolvedValue(2),
      findActiveSessionsByUserId: vi.fn().mockResolvedValue([mockSession]),
      findRefreshTokenByHash: vi.fn(),
      markRefreshTokenUsed: vi.fn().mockResolvedValue(mockRefreshToken),
      revokeRefreshToken: vi.fn().mockResolvedValue(mockRefreshToken),
      revokeTokenFamily: vi.fn().mockResolvedValue(1),
      withTransaction: vi.fn().mockReturnThis(),
    };

    mockTokenService = {
      generateOpaqueRefreshToken: vi.fn().mockReturnValue('raw-opaque-token-123'),
      hashRefreshToken: vi.fn().mockReturnValue('hashed-token-val'),
      getRefreshTokenExpiryDate: vi.fn().mockReturnValue(new Date(Date.now() + 7 * 86400 * 1000)),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      executeTransaction: vi
        .fn()
        .mockImplementation(async (fn) => fn({} as unknown as Parameters<typeof fn>[0])),
    };

    service = new SessionService(
      mockSessionRepo as SessionRepository,
      mockTokenService as TokenService,
      mockAuditService as AuthAuditService,
      mockPrisma as PrismaService,
    );
  });

  describe('createSession', () => {
    it('should create a session and associated refresh token', async () => {
      const result = await service.createSession({
        userId: 'user-123',
        ipAddress: '127.0.0.1',
      });

      expect(result.session).toBe(mockSession);
      expect(result.refreshToken).toBe('raw-opaque-token-123');
      expect(mockSessionRepo.createSession).toHaveBeenCalled();
      expect(mockSessionRepo.createRefreshToken).toHaveBeenCalled();
    });
  });

  describe('validateSession', () => {
    it('should return isValid: true for an active, valid session', async () => {
      vi.mocked(mockSessionRepo.findSessionById!).mockResolvedValue({
        ...mockSession,
        user: mockUser,
      });

      const result = await service.validateSession('session-123');
      expect(result.isValid).toBe(true);
      expect(result.session).toBeDefined();
    });

    it('should return isValid: false if session is not found', async () => {
      vi.mocked(mockSessionRepo.findSessionById!).mockResolvedValue(null);

      const result = await service.validateSession('unknown-session');
      expect(result.isValid).toBe(false);
    });

    it('should return isValid: false if session is revoked', async () => {
      vi.mocked(mockSessionRepo.findSessionById!).mockResolvedValue({
        ...mockSession,
        revokedAt: new Date(),
        user: mockUser,
      });

      const result = await service.validateSession('session-123');
      expect(result.isValid).toBe(false);
    });

    it('should return isValid: false if session is expired', async () => {
      vi.mocked(mockSessionRepo.findSessionById!).mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000),
        user: mockUser,
      });

      const result = await service.validateSession('session-123');
      expect(result.isValid).toBe(false);
    });
  });

  describe('rotateRefreshToken (ADR-009 Token Family Rotation)', () => {
    it('should successfully rotate refresh token on valid presentation', async () => {
      vi.mocked(mockSessionRepo.findRefreshTokenByHash!).mockResolvedValue({
        ...mockRefreshToken,
        session: {
          ...mockSession,
          user: mockUser,
        },
      });

      const result = await service.rotateRefreshToken('raw-opaque-token-123');
      expect(result.session).toBeDefined();
      expect(result.user).toBe(mockUser);
      expect(result.newRefreshToken).toBe('raw-opaque-token-123');
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH.TOKEN_REFRESH', status: 'SUCCESS' }),
      );
    });

    it('should throw UnauthorizedError when refresh token does not exist', async () => {
      vi.mocked(mockSessionRepo.findRefreshTokenByHash!).mockResolvedValue(null);

      await expect(service.rotateRefreshToken('unknown-token')).rejects.toThrow(UnauthorizedError);
    });

    it('BREACH DETECTION: should revoke entire family and session when a used token is replayed', async () => {
      vi.mocked(mockSessionRepo.findRefreshTokenByHash!).mockResolvedValue({
        ...mockRefreshToken,
        usedAt: new Date(Date.now() - 5000), // ALREADY USED
        session: {
          ...mockSession,
          user: mockUser,
        },
      });

      await expect(service.rotateRefreshToken('replayed-token')).rejects.toThrow(
        'Security alert: Invalid token reuse detected. Session has been revoked.',
      );

      expect(mockSessionRepo.revokeTokenFamily).toHaveBeenCalledWith('family-123');
      expect(mockSessionRepo.revokeSession).toHaveBeenCalledWith('session-123');
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AUTH.BREACH_ATTEMPT_DETECTED',
          status: 'FAILURE',
        }),
      );
    });

    it('should reject refresh if token or session is revoked', async () => {
      vi.mocked(mockSessionRepo.findRefreshTokenByHash!).mockResolvedValue({
        ...mockRefreshToken,
        revokedAt: new Date(),
        session: {
          ...mockSession,
          user: mockUser,
        },
      });

      await expect(service.rotateRefreshToken('revoked-token')).rejects.toThrow(
        'Authentication session has been revoked',
      );
    });

    it('should reject refresh if token is expired', async () => {
      vi.mocked(mockSessionRepo.findRefreshTokenByHash!).mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 10000),
        session: {
          ...mockSession,
          user: mockUser,
        },
      });

      await expect(service.rotateRefreshToken('expired-token')).rejects.toThrow(
        'Refresh token has expired',
      );
    });

    it('should reject refresh if user account is not active', async () => {
      vi.mocked(mockSessionRepo.findRefreshTokenByHash!).mockResolvedValue({
        ...mockRefreshToken,
        session: {
          ...mockSession,
          user: { ...mockUser, status: 'SUSPENDED' },
        },
      });

      await expect(service.rotateRefreshToken('valid-token')).rejects.toThrow(
        'User account is inactive or suspended',
      );
    });
  });

  describe('revokeSession and revokeAllUserSessions', () => {
    it('should revoke a session and log audit event', async () => {
      await service.revokeSession('session-123', 'user-123');
      expect(mockSessionRepo.revokeSession).toHaveBeenCalledWith('session-123');
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH.SESSION_REVOKED' }),
      );
    });

    it('should revoke all user sessions and return count', async () => {
      const count = await service.revokeAllUserSessions('user-123');
      expect(count).toBe(2);
      expect(mockSessionRepo.revokeAllUserSessions).toHaveBeenCalledWith('user-123');
    });

    it('should fetch active sessions for a user', async () => {
      const sessions = await service.getActiveSessions('user-123');
      expect(sessions).toHaveLength(1);
    });
  });
});
