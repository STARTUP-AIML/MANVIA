// ==============================================================================
// MANVIA — PrismaService Unit Test Suite
// ==============================================================================
// Tests PrismaService lifecycle, error handling, health queries, and transactions
// ==============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaService } from '../../src/database/prisma.service.js';
import { ConfigService } from '../../src/config/config.service.js';

describe('PrismaService (Unit)', () => {
  let prismaService: PrismaService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockConfigService = {
      databaseUrl: 'postgresql://test_user:test_pass@localhost:5432/test_db',
      sanitizedDatabaseUrl: 'postgresql://test_user:***@localhost:5432/test_db',
      databasePoolMin: 2,
      databasePoolMax: 5,
      databaseConnectionTimeoutMs: 5000,
      isProduction: false,
      isDevelopment: false,
      isTest: true,
    } as unknown as ConfigService;

    prismaService = new PrismaService(mockConfigService);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('should initialize with disconnected state', () => {
    expect(prismaService).toBeDefined();
    expect(prismaService.isConnected).toBe(false);
  });

  it('should connect successfully during onModuleInit', async () => {
    const connectSpy = vi.spyOn(prismaService, '$connect').mockResolvedValue(undefined);

    await prismaService.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(prismaService.isConnected).toBe(true);
  });

  it('should handle onModuleInit connection failure safely in non-production', async () => {
    vi.spyOn(prismaService, '$connect').mockRejectedValue(new Error('Connection refused'));

    await expect(prismaService.onModuleInit()).resolves.toBeUndefined();
    expect(prismaService.isConnected).toBe(false);
  });

  it('should fail fast onModuleInit connection failure in production', async () => {
    const prodConfigService = {
      ...mockConfigService,
      isProduction: true,
    } as unknown as ConfigService;
    const prodPrismaService = new PrismaService(prodConfigService);
    vi.spyOn(prodPrismaService, '$connect').mockRejectedValue(new Error('Network unreachable'));

    await expect(prodPrismaService.onModuleInit()).rejects.toThrow(
      /Critical: Cannot connect to PostgreSQL database/,
    );
  });

  it('should disconnect and drain pool during onApplicationShutdown', async () => {
    const disconnectSpy = vi.spyOn(prismaService, '$disconnect').mockResolvedValue(undefined);
    const poolHolder = prismaService as unknown as {
      pool: { end: () => Promise<void> };
      connected: boolean;
    };
    const poolEndSpy = vi.spyOn(poolHolder.pool, 'end').mockResolvedValue(undefined);

    poolHolder.connected = true;
    await prismaService.onApplicationShutdown('SIGTERM');

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(poolEndSpy).toHaveBeenCalledTimes(1);
    expect(prismaService.isConnected).toBe(false);
  });

  it('should return healthy ComponentHealth when checkHealth query succeeds', async () => {
    vi.spyOn(prismaService, '$queryRawUnsafe').mockResolvedValue([{ '?column?': 1 }]);

    const health = await prismaService.checkHealth();

    expect(health.status).toBe('healthy');
    expect(health.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(health.details).toEqual({
      dialect: 'postgresql',
      status: 'connected',
    });
    expect(prismaService.isConnected).toBe(true);
  });

  it('should return unhealthy ComponentHealth and redact credentials when checkHealth fails', async () => {
    vi.spyOn(prismaService, '$queryRawUnsafe').mockRejectedValue(
      new Error('Failed connecting to postgresql://user:super_secret_pw@db.internal:5432/db'),
    );

    const health = await prismaService.checkHealth();

    expect(health.status).toBe('unhealthy');
    expect(health.error).toBeDefined();
    expect(health.error).not.toContain('super_secret_pw');
    expect(health.error).toContain('***');
    expect(health.details).toEqual({
      dialect: 'postgresql',
      status: 'disconnected',
    });
    expect(prismaService.isConnected).toBe(false);
  });

  it('should delegate executeTransaction to $transaction', async () => {
    const mockTxClient = { $queryRawUnsafe: vi.fn() };
    const transactionSpy = vi
      .spyOn(prismaService, '$transaction')
      .mockImplementation(async (callback: unknown) =>
        (callback as (tx: unknown) => Promise<unknown>)(mockTxClient),
      );

    const result = await prismaService.executeTransaction(async (tx) => {
      expect(tx).toBe(mockTxClient);
      return 'transaction_success';
    });

    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe('transaction_success');
  });
});
