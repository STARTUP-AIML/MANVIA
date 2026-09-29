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
    expect(config.SWAGGER_ENABLED).toBe(true);
    expect(config.SWAGGER_PATH).toBe('docs');
  });

  it('should parse custom port and environment correctly', () => {
    const custom = validateEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      STORAGE_DRIVER: 's3',
      OTEL_ENABLED: 'true',
      SWAGGER_ENABLED: 'false',
      SWAGGER_PATH: 'api-reference',
    });

    expect(custom.NODE_ENV).toBe('production');
    expect(custom.PORT).toBe(8080);
    expect(custom.STORAGE_DRIVER).toBe('s3');
    expect(custom.OTEL_ENABLED).toBe(true);
    expect(custom.SWAGGER_ENABLED).toBe(false);
    expect(custom.SWAGGER_PATH).toBe('api-reference');
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

  it('should load default database configuration parameters', () => {
    const config = validateEnv({});
    expect(config.DATABASE_URL).toContain('postgresql://');
    expect(config.DATABASE_POOL_MIN).toBe(2);
    expect(config.DATABASE_POOL_MAX).toBe(10);
    expect(config.DATABASE_CONNECTION_TIMEOUT_MS).toBe(10000);
  });

  it('should accept valid postgresql and postgres database URLs', () => {
    const custom = validateEnv({
      DATABASE_URL:
        'postgres://custom_user:custom_pass@db.internal:5433/prod_manvia?sslmode=require',
    });
    expect(custom.DATABASE_URL).toBe(
      'postgres://custom_user:custom_pass@db.internal:5433/prod_manvia?sslmode=require',
    );
  });

  it('should reject malformed database URLs', () => {
    expect(() => validateEnv({ DATABASE_URL: 'http://not-a-database' })).toThrow(
      /DATABASE_URL must be a valid PostgreSQL connection string/,
    );
    expect(() => validateEnv({ DATABASE_URL: 'mysql://user:pass@localhost:3306/db' })).toThrow(
      /DATABASE_URL must be a valid PostgreSQL connection string/,
    );
    expect(() => validateEnv({ DATABASE_URL: 'plain-text' })).toThrow(
      /DATABASE_URL must be a valid PostgreSQL connection string/,
    );
  });

  it('should sanitize credentials in database URLs for safe logging', async () => {
    const { sanitizeDatabaseUrl } = await import('../../src/config/env.js');
    const secretUrl =
      'postgresql://admin:super_secret_pw123@prod-cluster.aws.internal:5432/manvia?schema=public';
    const sanitized = sanitizeDatabaseUrl(secretUrl);

    expect(sanitized).not.toContain('super_secret_pw123');
    expect(sanitized).toContain('***');
    expect(sanitized).toContain('admin');
    expect(sanitized).toContain('prod-cluster.aws.internal');
  });
});
