// ==============================================================================
// MANVIA — User Service Unit Tests
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService, MAX_FAILED_LOGIN_ATTEMPTS } from '../../src/modules/identity/user.service.js';
import type { UserRepository } from '../../src/modules/identity/user.repository.js';
import type { User } from '@prisma/client';
import { UnauthorizedError } from '../../src/common/errors/app-error.js';

describe('UserService', () => {
  let service: UserService;
  let mockUserRepo: Partial<UserRepository>;

  const baseUser: User = {
    id: 'user-uuid-1',
    email: 'test@example.com',
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

  beforeEach(() => {
    mockUserRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByPhone: vi.fn(),
      updateStatus: vi.fn(),
      recordFailedLogin: vi.fn(),
      recordSuccessfulLogin: vi.fn(),
      withTransaction: vi.fn().mockReturnThis(),
    };

    service = new UserService(mockUserRepo as UserRepository);
  });

  describe('validateAccountStatus', () => {
    it('should allow active user with zero lockouts', () => {
      expect(() => service.validateAccountStatus(baseUser)).not.toThrow();
    });

    it('should throw UnauthorizedError when user is deactivated', () => {
      const user = { ...baseUser, status: 'DEACTIVATED' as const };
      expect(() => service.validateAccountStatus(user)).toThrow(UnauthorizedError);
      expect(() => service.validateAccountStatus(user)).toThrow('Account is deactivated');
    });

    it('should throw UnauthorizedError when user is suspended', () => {
      const user = { ...baseUser, status: 'SUSPENDED' as const };
      expect(() => service.validateAccountStatus(user)).toThrow(UnauthorizedError);
      expect(() => service.validateAccountStatus(user)).toThrow('Account is suspended');
    });

    it('should throw UnauthorizedError when user is locked', () => {
      const user = { ...baseUser, status: 'LOCKED' as const };
      expect(() => service.validateAccountStatus(user)).toThrow(UnauthorizedError);
      expect(() => service.validateAccountStatus(user)).toThrow('temporarily locked');
    });

    it('should throw UnauthorizedError when lockoutUntil is in the future', () => {
      const user = {
        ...baseUser,
        lockoutUntil: new Date(Date.now() + 60000),
      };
      expect(() => service.validateAccountStatus(user)).toThrow(UnauthorizedError);
      expect(() => service.validateAccountStatus(user)).toThrow('temporarily locked');
    });

    it('should allow user if lockoutUntil has passed in the past', () => {
      const user = {
        ...baseUser,
        lockoutUntil: new Date(Date.now() - 60000),
      };
      expect(() => service.validateAccountStatus(user)).not.toThrow();
    });
  });

  describe('handleFailedLogin', () => {
    it('should increment failed attempts without lockout if below limit', async () => {
      const user = { ...baseUser, failedLoginAttempts: 2 };
      const result = await service.handleFailedLogin(user);

      expect(result.isLocked).toBe(false);
      expect(result.lockoutUntil).toBeUndefined();
      expect(mockUserRepo.recordFailedLogin).toHaveBeenCalledWith('user-uuid-1', 3, null);
    });

    it('should lock account when failed attempts reach threshold', async () => {
      const user = { ...baseUser, failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS - 1 };
      const result = await service.handleFailedLogin(user);

      expect(result.isLocked).toBe(true);
      expect(result.lockoutUntil).toBeDefined();
      expect(mockUserRepo.recordFailedLogin).toHaveBeenCalledWith(
        'user-uuid-1',
        MAX_FAILED_LOGIN_ATTEMPTS,
        expect.any(Date),
      );
    });
  });

  describe('handleSuccessfulLogin', () => {
    it('should reset login failures on repository', async () => {
      await service.handleSuccessfulLogin(baseUser);
      expect(mockUserRepo.recordSuccessfulLogin).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('delegation methods', () => {
    it('should delegate findById to repository', async () => {
      vi.mocked(mockUserRepo.findById!).mockResolvedValue(baseUser);
      const res = await service.findById('user-uuid-1');
      expect(res).toBe(baseUser);
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-uuid-1');
    });

    it('should delegate findByEmail to repository', async () => {
      vi.mocked(mockUserRepo.findByEmail!).mockResolvedValue(baseUser);
      const res = await service.findByEmail('test@example.com');
      expect(res).toBe(baseUser);
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should delegate findByPhone to repository', async () => {
      vi.mocked(mockUserRepo.findByPhone!).mockResolvedValue(baseUser);
      const res = await service.findByPhone('+14155552671');
      expect(res).toBe(baseUser);
      expect(mockUserRepo.findByPhone).toHaveBeenCalledWith('+14155552671');
    });

    it('should delegate createUser to repository', async () => {
      vi.mocked(mockUserRepo.create!).mockResolvedValue(baseUser);
      const res = await service.createUser({ email: 'test@example.com' });
      expect(res).toBe(baseUser);
      expect(mockUserRepo.create).toHaveBeenCalled();
    });

    it('should delegate updateStatus to repository', async () => {
      vi.mocked(mockUserRepo.updateStatus!).mockResolvedValue({ ...baseUser, status: 'SUSPENDED' });
      const res = await service.updateStatus('user-uuid-1', 'SUSPENDED');
      expect(res.status).toBe('SUSPENDED');
      expect(mockUserRepo.updateStatus).toHaveBeenCalledWith('user-uuid-1', 'SUSPENDED');
    });
  });
});
