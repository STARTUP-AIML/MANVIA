/**
 * Cache & Distributed Lock Interface (ADR-007, Phase 2/3/9/13)
 *
 * Provides a vendor-neutral abstraction over Redis for distributed caching
 * and Redlock distributed locking to prevent appointment double-booking.
 */

export interface ILock {
  readonly resource: string;
  readonly ttlMs: number;
  release(): Promise<boolean>;
  extend(ttlMs: number): Promise<boolean>;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;

  /**
   * Acquire a distributed lock on a given resource with a time-to-live.
   * Throws or returns null if lock cannot be acquired within retry limits.
   */
  acquireLock(resource: string, ttlMs: number): Promise<ILock | null>;

  healthCheck(): Promise<{
    isHealthy: boolean;
    latencyMs?: number;
    error?: string;
  }>;
}
