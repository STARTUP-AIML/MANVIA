// ==============================================================================
// MANVIA — Authentication DTO Validation Unit Tests
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from '../../src/modules/auth/dto/register.dto.js';
import { LoginDto } from '../../src/modules/auth/dto/login.dto.js';
import { RefreshTokenDto } from '../../src/modules/auth/dto/refresh-token.dto.js';
import { ChangePasswordDto } from '../../src/modules/auth/dto/change-password.dto.js';

describe('Auth DTOs Validation', () => {
  describe('RegisterDto', () => {
    it('should validate valid registration input', async () => {
      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'Str0ngP@ssw0rd!2026',
        phone: '+14155552671',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid email', async () => {
      const dto = plainToInstance(RegisterDto, {
        email: 'invalid-email-address',
        password: 'Str0ngP@ssw0rd!2026',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.property).toBe('email');
    });

    it('should reject weak password', async () => {
      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'weakpassword',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.property).toBe('password');
    });

    it('should reject invalid phone format', async () => {
      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'Str0ngP@ssw0rd!2026',
        phone: '12345',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.property).toBe('phone');
    });
  });

  describe('LoginDto', () => {
    it('should validate valid login input', async () => {
      const dto = plainToInstance(LoginDto, {
        email: 'user@example.com',
        password: 'Str0ngP@ssw0rd!2026',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty login input', async () => {
      const dto = plainToInstance(LoginDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('RefreshTokenDto', () => {
    it('should validate valid refresh token', async () => {
      const dto = plainToInstance(RefreshTokenDto, {
        refreshToken: 'opaque-token-string',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty refresh token', async () => {
      const dto = plainToInstance(RefreshTokenDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ChangePasswordDto', () => {
    it('should validate valid change password request', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: 'Str0ngP@ssw0rd!2026',
        newPassword: 'N3wStr0ngP@ssw0rd!2027',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject weak new password', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: 'Str0ngP@ssw0rd!2026',
        newPassword: 'short',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
