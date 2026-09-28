import { describe, it, expect, beforeEach } from 'vitest';
import { validateEnv, resetEnvConfig } from '../../src/config/env.js';

describe('Environment Configuration (Unit)', () => {
  beforeEach(() => {
    resetEnvConfig();
  });

  it('should load valid environment with defaults', () => {
    const config = validateEnv({});
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe('0.0.0.0');
    expect(config.STORAGE_DRIVER).toBe('local');
    expect(config.OTEL_ENABLED).toBe(false);
  });

  it('should parse custom port and environment correctly', () => {
    const custom = validateEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      STORAGE_DRIVER: 's3',
      OTEL_ENABLED: 'true',
    });

    expect(custom.NODE_ENV).toBe('production');
    expect(custom.PORT).toBe(8080);
    expect(custom.STORAGE_DRIVER).toBe('s3');
    expect(custom.OTEL_ENABLED).toBe(true);
  });

  it('should reject invalid port numbers', () => {
    expect(() => validateEnv({ PORT: '70000' })).toThrow(/Invalid environment configuration/);
    expect(() => validateEnv({ PORT: '-5' })).toThrow(/Invalid environment configuration/);
  });

  it('should reject invalid NODE_ENV values', () => {
    expect(() => validateEnv({ NODE_ENV: 'invalid-env' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('should reject JWT secrets shorter than 16 characters', () => {
    expect(() => validateEnv({ JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET must be at least 16 characters/,
    );
  });
});
