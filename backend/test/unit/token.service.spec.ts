// ==============================================================================
// MANVIA — Token Service Unit Tests
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenService } from '../../src/modules/auth/services/token.service.js';
import { ConfigService } from '../../src/config/config.service.js';
import { UnauthorizedError } from '../../src/common/errors/app-error.js';
import jwt from 'jsonwebtoken';

describe('TokenService', () => {
  let service: TokenService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
    service = new TokenService(configService);
  });

  describe('generateAccessToken', () => {
    it('should generate a signed JWT with standard claims', () => {
      const result = service.generateAccessToken({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sessionId: '987fcdeb-51a2-43f7-9abc-def012345678',
        roles: ['PATIENT'],
        activeRole: 'PATIENT',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.expiresInSeconds).toBe(900);

      const decoded = jwt.decode(result.accessToken) as Record<string, unknown>;
      expect(decoded.sub).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(decoded.sessionId).toBe('987fcdeb-51a2-43f7-9abc-def012345678');
      expect(decoded.roles).toEqual(['PATIENT']);
      expect(decoded.activeRole).toBe('PATIENT');
      expect(decoded.jti).toBeDefined();
    });
  });

  describe('verifyAccessToken', () => {
    it('should correctly decode a valid access token', () => {
      const { accessToken } = service.generateAccessToken({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sessionId: '987fcdeb-51a2-43f7-9abc-def012345678',
        roles: ['PATIENT'],
        activeRole: 'PATIENT',
      });

      const payload = service.verifyAccessToken(accessToken);
      expect(payload.sub).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(payload.sessionId).toBe('987fcdeb-51a2-43f7-9abc-def012345678');
    });

    it('should throw UnauthorizedError when token is expired', () => {
      const expiredToken = jwt.sign(
        { sub: '123', sessionId: '456', roles: ['PATIENT'], activeRole: 'PATIENT', jti: '789' },
        configService.jwtSecret,
        { expiresIn: '-1s' },
      );

      expect(() => service.verifyAccessToken(expiredToken)).toThrow(UnauthorizedError);
      expect(() => service.verifyAccessToken(expiredToken)).toThrow('Access token has expired');
    });

    it('should throw UnauthorizedError when signature is invalid', () => {
      const invalidToken = jwt.sign(
        { sub: '123', sessionId: '456', roles: ['PATIENT'], activeRole: 'PATIENT', jti: '789' },
        'wrong-secret-signature-key-1234567890',
      );

      expect(() => service.verifyAccessToken(invalidToken)).toThrow(UnauthorizedError);
      expect(() => service.verifyAccessToken(invalidToken)).toThrow('Invalid access token');
    });
  });

  describe('generateOpaqueRefreshToken & hashRefreshToken', () => {
    it('should generate a 64-character hex string with 256 bits of entropy', () => {
      const token1 = service.generateOpaqueRefreshToken();
      const token2 = service.generateOpaqueRefreshToken();

      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('should compute deterministic SHA-256 hash', () => {
      const token = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const hash1 = service.hashRefreshToken(token);
      const hash2 = service.hashRefreshToken(token);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });
  });

  describe('parseDurationToSeconds', () => {
    it('should parse seconds, minutes, hours, days correctly', () => {
      expect(service.parseDurationToSeconds('30s')).toBe(30);
      expect(service.parseDurationToSeconds('15m')).toBe(900);
      expect(service.parseDurationToSeconds('2h')).toBe(7200);
      expect(service.parseDurationToSeconds('7d')).toBe(604800);
      expect(service.parseDurationToSeconds('invalid')).toBe(900);
    });
  });
});
