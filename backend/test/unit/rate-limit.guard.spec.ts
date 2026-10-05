import { describe, it, expect, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { RateLimitGuard } from '../../src/common/guards/rate-limit.guard.js';
import type { RateLimitOptions } from '../../src/common/guards/rate-limit.decorator.js';
import type { ICacheService } from '../../src/cache/cache.interface.js';
import { TooManyRequestsError } from '../../src/common/errors/app-error.js';

describe('RateLimitGuard (M8 Production Throttling)', () => {
  let guard: RateLimitGuard;
  let mockReflector: Reflector;
  let mockCache: Record<string, number>;
  let mockCacheService: ICacheService;

  beforeEach(() => {
    mockCache = {};
    mockReflector = new Reflector();

    mockCacheService = {
      get: async <T>(key: string): Promise<T | null> => {
        return (mockCache[key] as unknown as T) ?? null;
      },
      set: async <T>(key: string, value: T): Promise<void> => {
        mockCache[key] = value as unknown as number;
      },
      del: async (key: string): Promise<boolean> => {
        delete mockCache[key];
        return true;
      },
      exists: async (key: string): Promise<boolean> => {
        return key in mockCache;
      },
      acquireLock: async () => null,
      healthCheck: async () => ({ isHealthy: true }),
    };

    guard = new RateLimitGuard(mockReflector, mockCacheService);
  });

  const createMockContext = (
    options?: RateLimitOptions,
    ip = '192.168.1.5',
    userId?: string,
  ): ExecutionContext => {
    const headers: Record<string, string> = {};
    const resHeaders: Record<string, string> = {};

    mockReflector.getAllAndOverride = () => options;

    const req = {
      headers,
      ip,
      routerPath: '/api/v1/test',
      url: '/api/v1/test',
      user: userId ? { id: userId, email: 'test@example.com' } : undefined,
    };

    const res = {
      header: (name: string, val: string) => {
        resHeaders[name.toLowerCase()] = val;
      },
    };

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;
  };

  it('allows request when no RateLimit metadata is present', async () => {
    const ctx = createMockContext(undefined);
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('allows request within rate limit and increments counter', async () => {
    const ctx = createMockContext({ limit: 3, ttlSeconds: 60, scope: 'auth:login' });

    // First request
    const r1 = await guard.canActivate(ctx);
    expect(r1).toBe(true);
    expect(mockCache['ratelimit:auth:login:ip:192.168.1.5']).toBe(1);

    // Second request
    const r2 = await guard.canActivate(ctx);
    expect(r2).toBe(true);
    expect(mockCache['ratelimit:auth:login:ip:192.168.1.5']).toBe(2);
  });

  it('throws TooManyRequestsError when rate limit is exceeded', async () => {
    const ctx = createMockContext({ limit: 2, ttlSeconds: 30, scope: 'auth:login' });

    await guard.canActivate(ctx); // count = 1
    await guard.canActivate(ctx); // count = 2

    // Third request exceeds limit
    await expect(guard.canActivate(ctx)).rejects.toThrow(TooManyRequestsError);
  });

  it('tracks authenticated user separately from IP when configured', async () => {
    const ctxUser = createMockContext(
      { limit: 5, ttlSeconds: 60, scope: 'appointments:reserve', trackBy: 'user_or_ip' },
      '192.168.1.5',
      'user_123',
    );

    await guard.canActivate(ctxUser);
    expect(mockCache['ratelimit:appointments:reserve:user:user_123']).toBe(1);
    expect(mockCache['ratelimit:appointments:reserve:ip:192.168.1.5']).toBeUndefined();
  });
});
