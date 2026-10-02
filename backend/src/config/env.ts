import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env into process.env if present
dotenv.config();

export const EnvSchema = z
  .object({
    // Runtime
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    HOST: z.string().default('0.0.0.0'),
    APP_NAME: z.string().default('manvia-backend'),
    API_PREFIX: z.string().default('api/v1'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // CORS & Security
    CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
    RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

    // Swagger / OpenAPI Documentation
    SWAGGER_ENABLED: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          if (val.toLowerCase() === 'true' || val === '1') return true;
          if (val.toLowerCase() === 'false' || val === '0') return false;
        }
        return val;
      }, z.boolean())
      .default(true),
    SWAGGER_PATH: z.string().default('docs'),

    // Database (Phase 3 PostgreSQL + Prisma Foundation)
    DATABASE_URL: z
      .string()
      .regex(
        /^(postgresql|postgres):\/\/.+/i,
        'DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://',
      )
      .default('postgresql://postgres:postgres@localhost:5432/manvia_dev?schema=public'),
    DATABASE_POOL_MIN: z.coerce.number().int().positive().default(2),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

    // Cache & Redis (Phase 2/3 boundary)
    REDIS_URL: z.string().default('redis://localhost:6379'),
    REDIS_KEY_PREFIX: z.string().default('manvia:'),
    REDIS_PASSWORD: z.string().optional().default(''),

    // Authentication & JWT (Phase 4 boundary)
    JWT_SECRET: z
      .string()
      .min(16, 'JWT_SECRET must be at least 16 characters for security')
      .default('placeholder-jwt-secret-min-32-chars-for-dev-only'),
    JWT_ACCESS_EXPIRATION: z.string().default('15m'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters for security')
      .default('placeholder-jwt-refresh-secret-min-32-chars-for-dev-only'),
    JWT_REFRESH_EXPIRATION: z.string().default('7d'),

    // Object Storage Abstraction (OD-002)
    STORAGE_DRIVER: z.enum(['local', 'minio', 's3']).default('local'),
    STORAGE_LOCAL_ROOT: z.string().default('./uploads'),
    STORAGE_BUCKET: z.string().default('manvia-documents-dev'),
    STORAGE_REGION: z.string().default('us-east-1'),
    STORAGE_ENDPOINT: z.string().optional().default(''),
    STORAGE_ACCESS_KEY: z.string().optional().default(''),
    STORAGE_SECRET_KEY: z.string().optional().default(''),

    // Observability & OpenTelemetry (OD-009)
    OTEL_SERVICE_NAME: z.string().default('manvia-backend'),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional().default(''),
    OTEL_ENABLED: z.coerce.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (
        data.JWT_SECRET.toLowerCase().includes('placeholder') ||
        data.JWT_SECRET.toLowerCase().includes('dev-only') ||
        data.JWT_SECRET.length < 32
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message:
            'In production, JWT_SECRET must be at least 32 characters and must not contain placeholder/dev-only values.',
        });
      }
      if (
        data.JWT_REFRESH_SECRET.toLowerCase().includes('placeholder') ||
        data.JWT_REFRESH_SECRET.toLowerCase().includes('dev-only') ||
        data.JWT_REFRESH_SECRET.length < 32
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message:
            'In production, JWT_REFRESH_SECRET must be at least 32 characters and must not contain placeholder/dev-only values.',
        });
      }
    }
  });

export type EnvConfig = z.infer<typeof EnvSchema>;

let cachedConfig: EnvConfig | null = null;

/**
 * Validates provided raw environment record or defaults to process.env.
 * Throws structured error without leaking secret values if schema validation fails.
 */
export function validateEnv(rawEnv: Record<string, unknown> = process.env): EnvConfig {
  const result = EnvSchema.safeParse(rawEnv);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration detected:\n${formattedErrors}`);
  }

  return result.data;
}

/**
 * Returns memoized application environment configuration.
 */
export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv(process.env);
  }
  return cachedConfig;
}

/**
 * Clears cached environment config (primarily for unit test isolation).
 */
export function resetEnvConfig(): void {
  cachedConfig = null;
}

/**
 * Redacts credentials (passwords) from a database connection URL for safe logging and diagnostics.
 */
export function sanitizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return url.replace(/:\/\/(.*?):(.*?)@/, '://$1:***@');
  }
}
