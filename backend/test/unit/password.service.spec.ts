// ==============================================================================
// MANVIA — Password Service Unit Tests
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordService } from '../../src/modules/auth/services/password.service.js';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  describe('validatePasswordPolicy', () => {
    it('should approve a strong password meeting all criteria', () => {
      const result = service.validatePasswordPolicy('Str0ngP@ssw0rd!2026');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject passwords shorter than 12 characters', () => {
      const result = service.validatePasswordPolicy('Short1!Aa');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters in length');
    });

    it('should reject passwords exceeding 128 characters', () => {
      const longPassword = 'A1!' + 'a'.repeat(126);
      const result = service.validatePasswordPolicy(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters in length');
    });

    it('should reject passwords missing uppercase letters', () => {
      const result = service.validatePasswordPolicy('lowercaseonly123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords missing lowercase letters', () => {
      const result = service.validatePasswordPolicy('UPPERCASEONLY123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords missing numeric digits', () => {
      const result = service.validatePasswordPolicy('NoNumericDigitsHere!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one numeric digit');
    });

    it('should reject passwords missing special characters', () => {
      const result = service.validatePasswordPolicy('NoSpecialCharacters1234');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('hashPassword & verifyPassword', () => {
    it('should generate an Argon2id hash that verifies successfully', async () => {
      const plain = 'Secur3P@ssword1234';
      const hash = await service.hashPassword(plain);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$argon2id\$/);

      const isValid = await service.verifyPassword(plain, hash);
      expect(isValid).toBe(true);
    });

    it('should reject verification with incorrect password', async () => {
      const plain = 'Secur3P@ssword1234';
      const hash = await service.hashPassword(plain);

      const isValid = await service.verifyPassword('WrongPassword123!', hash);
      expect(isValid).toBe(false);
    });

    it('should return false safely when verifying against a malformed hash', async () => {
      const isValid = await service.verifyPassword('AnyPassword123!', 'invalid-hash-string');
      expect(isValid).toBe(false);
    });
  });
});
