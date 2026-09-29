// ==============================================================================
// MANVIA — Authentication Controller Unit Tests
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from '../../src/modules/auth/auth.controller.js';
import type { AuthService } from '../../src/modules/auth/services/auth.service.js';
import type { UserService } from '../../src/modules/identity/user.service.js';
import type { FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../../src/modules/auth/auth.interface.js';
import { NotFoundError } from '../../src/common/errors/app-error.js';
import type { AuthResponseDto } from '../../src/modules/auth/dto/auth-response.dto.js';
import type { TokenRefreshResponseDto } from '../../src/modules/auth/dto/token-refresh-response.dto.js';
import type { UserResponseDto } from '../../src/modules/auth/dto/user-response.dto.js';
import type { User } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;
  let mockUserService: Partial<UserService>;

  const mockReq: Partial<FastifyRequest> = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'vitest-test-agent',
      'x-device-type': 'WEB',
      'x-device-name': 'TestBrowser',
    },
  };

  const mockAuthUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'user@example.com',
    roles: ['PATIENT'],
    activeRole: 'PATIENT',
    sessionId: 'session-123',
  };

  beforeEach(() => {
    mockAuthService = {
      register: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        expiresIn: 900,
      } as unknown as AuthResponseDto),
      login: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        expiresIn: 900,
      } as unknown as AuthResponseDto),
      refresh: vi.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        expiresIn: 900,
      } as unknown as TokenRefreshResponseDto),
      logout: vi.fn().mockResolvedValue(undefined),
      changePassword: vi.fn().mockResolvedValue(undefined),
      mapToUserResponseDto: vi.fn().mockReturnValue({
        id: 'user-123',
        email: 'user@example.com',
        roles: ['PATIENT'],
      } as unknown as UserResponseDto),
    };

    mockUserService = {
      findById: vi
        .fn()
        .mockResolvedValue({ id: 'user-123', email: 'user@example.com' } as unknown as User),
    };

    controller = new AuthController(mockAuthService as AuthService, mockUserService as UserService);
  });

  describe('register', () => {
    it('should call authService.register with dto and metadata', async () => {
      const dto = { email: 'user@example.com', password: 'Str0ngP@ssw0rd!2026' };
      const res = await controller.register(dto, mockReq as FastifyRequest);

      expect(res).toBeDefined();
      expect(mockAuthService.register).toHaveBeenCalledWith(
        dto,
        expect.objectContaining({ ipAddress: '127.0.0.1', userAgent: 'vitest-test-agent' }),
      );
    });
  });

  describe('login', () => {
    it('should call authService.login with dto and metadata', async () => {
      const dto = { email: 'user@example.com', password: 'Str0ngP@ssw0rd!2026' };
      const res = await controller.login(dto, mockReq as FastifyRequest);

      expect(res).toBeDefined();
      expect(mockAuthService.login).toHaveBeenCalledWith(
        dto,
        expect.objectContaining({ ipAddress: '127.0.0.1' }),
      );
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh with dto and metadata', async () => {
      const dto = { refreshToken: 'opaque-token-123' };
      const res = await controller.refresh(dto, mockReq as FastifyRequest);

      expect(res).toBeDefined();
      expect(mockAuthService.refresh).toHaveBeenCalledWith(dto, expect.any(Object));
    });
  });

  describe('logout', () => {
    it('should call authService.logout with session ID and user ID', async () => {
      const res = await controller.logout(mockAuthUser, mockReq as FastifyRequest);
      expect(res).toEqual({ message: 'Logged out successfully' });
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'session-123',
        'user-123',
        expect.any(Object),
      );
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword with user ID and dto', async () => {
      const dto = {
        currentPassword: 'Str0ngP@ssw0rd!2026',
        newPassword: 'N3wStr0ngP@ssw0rd!2027',
      };

      const res = await controller.changePassword('user-123', dto, mockReq as FastifyRequest);
      expect(res).toEqual({ message: 'Password updated successfully' });
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'user-123',
        dto,
        expect.any(Object),
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return sanitized user profile for authenticated user', async () => {
      const res = await controller.getCurrentUser(mockAuthUser);
      expect(res.id).toBe('user-123');
      expect(mockUserService.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundError if user not found in database', async () => {
      vi.mocked(mockUserService.findById!).mockResolvedValue(null);
      await expect(controller.getCurrentUser(mockAuthUser)).rejects.toThrow(NotFoundError);
    });
  });
});
