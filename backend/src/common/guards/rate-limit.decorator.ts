// ==============================================================================
// MANVIA — Rate Limit Decorator (M8 Production Hardening)
// ==============================================================================

import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'RATE_LIMIT_KEY';

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the time window */
  limit: number;
  /** Window duration in seconds */
  ttlSeconds: number;
  /** Specific rate limit scope (e.g. 'auth:login', 'payments:create') */
  scope?: string;
  /** Tracking strategy: 'ip' only or 'user_or_ip' (prefer user ID if authenticated) */
  trackBy?: 'ip' | 'user_or_ip';
}

export const RateLimit = (options: RateLimitOptions): CustomDecorator<string> =>
  SetMetadata(RATE_LIMIT_KEY, options);
