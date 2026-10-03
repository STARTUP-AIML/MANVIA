// ==============================================================================
// MANVIA — Authentication Service Unit Tests
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../src/modules/auth/services/auth.service.js';
import type { UserService } from '../../src/modules/identity/user.service.js';
import type { PasswordCredentialRepository } from '../../src/modules/auth/repositories/password-credential.repository.js';
import type { PasswordService } from '../../src/modules/auth/services/password.service.js';
import type { TokenService } from '../../src/modules/auth/services/token.service.js';
import type { SessionService } from '../../src/modules/auth/services/session.service.js';
import type { AuthAuditService } from '../../src/modules/auth/services/auth-audit.service.js';
import type { PrismaService } from '../../src/database/prisma.service.js';
import { ConflictError, ValidationError } from '../../src/common/errors/app-error.js';
import type { User, PasswordCredential, Session } from '@prisma/client';
import { Prisma } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserService: Partial<UserService>;
  let mockCredRepo: Partial<PasswordCredentialRepository>;
  let mockPasswordService: Partial<PasswordService>;
  let mockTokenService: Partial<TokenService>;
  let mockSessionService: Partial<SessionService>;
  let mockAuditService: Partial<AuthAuditService>;
  let mockPrisma: Partial<PrismaService>;

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'patient@example.com',
    phone: null,
    emailVerified: false,
    phoneVerified: false,
    status: 'ACTIVE',
    roles: ['PATIENT'],
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCred: PasswordCredential = {
    id: 'cred-uuid-1',
    userId: 'user-uuid-1',
    passwordHash: '$argon2id$hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession: Session = {
    id: 'session-uuid-1',
    userId: 'user-uuid-1',
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

  beforeEach(() => {
    mockUserService = {
      createUser: vi.fn().mockResolvedValue(mockUser),
      findById: vi.fn().mockResolvedValue(mockUser),
      findByEmail: vi.fn(),
      validateAccountStatus: vi.fn(),
      handleFailedLogin: vi.fn().mockResolvedValue({ isLocked: false }),
      handleSuccessfulLogin: vi.fn().mockResolvedValue(undefined),
    };

    mockCredRepo = {
      create: vi.fn().mockResolvedValue(mockCred),
      findByUserId: vi.fn().mockResolvedValue(mockCred),
      updatePasswordHash: vi.fn().mockResolvedValue(mockCred),
      withTransaction: vi.fn().mockReturnThis(),
    };

    mockPasswordService = {
      validatePasswordPolicy: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
      hashPassword: vi.fn().mockResolvedValue('$argon2id$hashedPassword'),
      verifyPassword: vi.fn(),
    };

    mockTokenService = {
      generateAccessToken: vi.fn().mockReturnValue({
        accessToken: 'mock-jwt-access-token',
        expiresInSeconds: 900,
      }),
    };

    mockSessionService = {
      createSession: vi.fn().mockResolvedValue({
        session: mockSession,
        refreshToken: 'mock-raw-refresh-token',
      }),
      rotateRefreshToken: vi.fn(),
      revokeSession: vi.fn().mockResolvedValue(undefined),
      revokeAllUserSessions: vi.fn().mockResolvedValue(1),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      executeTransaction: vi
        .fn()
        .mockImplementation(async (fn) => fn({} as unknown as Parameters<typeof fn>[0])),
    };

    service = new AuthService(
      mockUserService as UserService,
      mockCredRepo as PasswordCredentialRepository,
      mockPasswordService as PasswordService,
      mockTokenService as TokenService,
      mockSessionService as SessionService,
      mockAuditService as AuthAuditService,
      mockPrisma as PrismaService,
    );
  });

  describe('register', () => {
    it('should successfully register a new user identity atomically', async () => {
      const result = await service.register({
        email: 'patient@example.com',
        password: 'Str0ngP@ssw0rd!2026',
      });

      expect(result.user.id).toBe('user-uuid-1');
      expect(result.accessToken).toBe('mock-jwt-access-token');
      expect(result.refreshToken).toBe('mock-raw-refresh-token');
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('Str0ngP@ssw0rd!2026');
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH.REGISTER', status: 'SUCCESS' }),
      );
    });

    it('should throw ValidationError if password does not meet policy requirements', async () => {
      vi.mocked(mockPasswordService.validatePasswordPolicy!).mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 12 characters'],
      });

      await expect(
        service.register({
          email: 'patient@example.com',
          password: 'short',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError on duplicate email constraint violation', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.x',
        meta: { target: ['email'] },
      });

      vi.mocked(mockPrisma.executeTransaction!).mockRejectedValue(p2002Error);

      await expect(
        service.register({
          email: 'patient@example.com',
          password: 'Str0ngP@ssw0rd!2026',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError on duplicate phone constraint violation', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.x',
        meta: { target: ['phone'] },
      });

      vi.mocked(mockPrisma.executeTransaction!).mockRejectedValue(p2002Error);

      await expect(
        service.register({
          email: 'patient@example.com',
          password: 'Str0ngP@ssw0rd!2026',
          phone: '+14155552671',
        }),
      ).rejects.toThrow('An account with this phone number already exists');
    });
  });

  describe('login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      vi.mocked(mockUserService.findByEmail!).mockResolvedValue(mockUser);
      vi.mocked(mockPasswordService.verifyPassword!).mockResolvedValue(true);

      const result = await service.login({
        email: 'patient@example.com',
        password: 'Str0ngP@ssw0rd!2026',
      });

      expect(result.user.id).toBe('user-uuid-1');
      expect(result.accessToken).toBe('mock-jwt-access-token');
      expect(mockUserService.handleSuccessfulLogin).toHaveBeenCalledWith(mockUser);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH.LOGIN_SUCCESS' }),
      );
    });

    it('should throw UnauthorizedError when user is not found (and perform dummy verify)', async () => {
      vi.mocked(mockUserService.findByEmail!).mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'Str0ngP@ssw0rd!2026',
        }),
      ).rejects.toThrow('Invalid email or password');

      expect(mockPasswordService.verifyPassword).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when password does not match', async () => {
      vi.mocked(mockUserService.findByEmail!).mockResolvedValue(mockUser);
      vi.mocked(mockPasswordService.verifyPassword!).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'patient@example.com',
          password: 'WrongPassword!123',
        }),
      ).rejects.toThrow('Invalid email or password');

      expect(mockUserService.handleFailedLogin).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedError when no credential is bound to user', async () => {
      vi.mocked(mockUserService.findByEmail!).mockResolvedValue(mockUser);
      vi.mocked(mockCredRepo.findByUserId!).mockResolvedValue(null);

      await expect(
        service.login({
          email: 'patient@example.com',
          password: 'Str0ngP@ssw0rd!2026',
        }),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refresh', () => {
    it('should rotate token and return new credentials', async () => {
      vi.mocked(mockSessionService.rotateRefreshToken!).mockResolvedValue({
        session: mockSession,
        user: mockUser,
        newRefreshToken: 'new-raw-refresh-token',
      });

      const result = await service.refresh({
        refreshToken: 'old-refresh-token',
      });

      expect(result.refreshToken).toBe('new-raw-refresh-token');
      expect(result.accessToken).toBe('mock-jwt-access-token');
    });
  });

  describe('logout', () => {
    it('should revoke session and emit audit log', async () => {
      await service.logout('session-uuid-1', 'user-uuid-1');
      expect(mockSessionService.revokeSession).toHaveBeenCalledWith(
        'session-uuid-1',
        'user-uuid-1',
      );
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH.LOGOUT' }),
      );
    });
  });

  describe('changePassword', () => {
    it('should update password and revoke all existing sessions', async () => {
      vi.mocked(mockPasswordService.verifyPassword!).mockResolvedValue(true);

      await service.changePassword('user-uuid-1', {
        currentPassword: 'Str0ngP@ssw0rd!2026',
        newPassword: 'N3wStr0ngP@ssw0rd!2027',
      });

      expect(mockCredRepo.updatePasswordHash).toHaveBeenCalled();
      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith('user-uuid-1');
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH.PASSWORD_CHANGE' }),
      );
    });

    it('should throw UnauthorizedError when current password is wrong', async () => {
      vi.mocked(mockPasswordService.verifyPassword!).mockResolvedValue(false);

      await expect(
        service.changePassword('user-uuid-1', {
          currentPassword: 'WrongCurrentPassword!1',
          newPassword: 'N3wStr0ngP@ssw0rd!2027',
        }),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw ValidationError when new password violates policy', async () => {
      vi.mocked(mockPasswordService.verifyPassword!).mockResolvedValue(true);
      vi.mocked(mockPasswordService.validatePasswordPolicy!).mockReturnValue({
        isValid: false,
        errors: ['Too short'],
      });

      await expect(
        service.changePassword('user-uuid-1', {
          currentPassword: 'Str0ngP@ssw0rd!2026',
          newPassword: 'short',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw UnauthorizedError when no credential exists for user', async () => {
      vi.mocked(mockCredRepo.findByUserId!).mockResolvedValue(null);

      await expect(
        service.changePassword('user-uuid-1', {
          currentPassword: 'Str0ngP@ssw0rd!2026',
          newPassword: 'N3wStr0ngP@ssw0rd!2027',
        }),
      ).rejects.toThrow('No password credential configured');
    });
  });
});
