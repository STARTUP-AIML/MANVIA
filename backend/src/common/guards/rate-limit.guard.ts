// ==============================================================================
// MANVIA — Redis-Backed Distributed Rate Limiting Guard (M8.6)
// ==============================================================================

import { Injectable, type CanActivate, type ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.decorator.js';
import { CACHE_SERVICE } from '../../cache/cache.module.js';
import type { ICacheService } from '../../cache/cache.interface.js';
import { TooManyRequestsError } from '../errors/app-error.js';
import type { AuthenticatedUser } from '../../modules/auth/auth.interface.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_SERVICE) private readonly cacheService: ICacheService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<
      FastifyRequest & { user?: AuthenticatedUser; routerPath?: string }
    >();
    const res = http.getResponse<FastifyReply>();

    // Determine client identity
    const forwardedHeader = req.headers['x-forwarded-for'];
    const clientIp =
      (typeof forwardedHeader === 'string' ? forwardedHeader.split(',')[0]?.trim() : undefined) ||
      req.ip ||
      '127.0.0.1';

    const userId = req.user?.id;
    const trackId =
      options.trackBy === 'ip' ? `ip:${clientIp}` : userId ? `user:${userId}` : `ip:${clientIp}`;

    const scope = options.scope || `${req.routerPath || req.url || 'global'}`;
    const cacheKey = `ratelimit:${scope}:${trackId}`;

    const currentCount = (await this.cacheService.get<number>(cacheKey)) || 0;

    if (currentCount >= options.limit) {
      res.header('Retry-After', options.ttlSeconds.toString());
      res.header('X-RateLimit-Limit', options.limit.toString());
      res.header('X-RateLimit-Remaining', '0');
      throw new TooManyRequestsError(
        `Rate limit exceeded. Maximum ${options.limit} requests per ${options.ttlSeconds}s.`,
        options.ttlSeconds,
      );
    }

    const nextCount = currentCount + 1;
    await this.cacheService.set(cacheKey, nextCount, options.ttlSeconds);

    res.header('X-RateLimit-Limit', options.limit.toString());
    res.header('X-RateLimit-Remaining', Math.max(0, options.limit - nextCount).toString());

    return true;
  }
}
