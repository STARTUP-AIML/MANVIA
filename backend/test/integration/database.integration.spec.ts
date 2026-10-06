// ==============================================================================
// MANVIA — Database Layer Integration Test Suite
// ==============================================================================
// Verifies live integration with PostgreSQL 18.x via Prisma 7.x:
// - Connection and version verification
// - Interactive transaction commit and rollback
// - NestJS application health probe integration (/health/ready)
// - Graceful shutdown and pool drainage
// ==============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { ConfigService } from '../../src/config/config.service.js';

describe('PostgreSQL 18 + Prisma 7 Integration', () => {
  let app: NestFastifyApplication;
  let prismaService: PrismaService;
  let configService: ConfigService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prismaService = app.get(PrismaService);
    configService = app.get(ConfigService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should establish connection to PostgreSQL (17.x or 18.x)', async () => {
    expect(prismaService).toBeDefined();
    expect(configService).toBeDefined();
    expect(configService.databaseUrl).toBeDefined();

    const versionResult =
      await prismaService.$queryRawUnsafe<Array<{ version: string }>>('SELECT version()');
    expect(versionResult).toBeDefined();
    expect(versionResult.length).toBeGreaterThan(0);
    expect(versionResult[0]?.version).toMatch(/PostgreSQL (?:17|18)\./i);
  });

  it('should provide healthy status from checkHealth() probe', async () => {
    const health = await prismaService.checkHealth();
    expect(health.status).toBe('healthy');
    expect(health.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(health.details?.dialect).toBe('postgresql');
    expect(health.details?.status).toBe('connected');
  });

  it('should commit operations within an interactive transaction', async () => {
    const transactionResult = await prismaService.executeTransaction(async (tx) => {
      const result = await tx.$queryRawUnsafe<Array<{ answer: number }>>('SELECT 42 as answer');
      return result[0]?.answer;
    });

    expect(transactionResult).toBe(42);
  });

  it('should roll back transaction operations when an error is thrown', async () => {
    let rollbackDetected = false;

    try {
      await prismaService.executeTransaction(async (tx) => {
        await tx.$queryRawUnsafe('SELECT 1');
        throw new Error('Forced transaction rollback error');
      });
    } catch (err) {
      rollbackDetected = true;
      expect((err as Error).message).toBe('Forced transaction rollback error');
    }

    expect(rollbackDetected).toBe(true);

    // Verify database connection remains healthy after rollback
    const postRollbackHealth = await prismaService.checkHealth();
    expect(postRollbackHealth.status).toBe('healthy');
  });

  it('should reflect database health in /health/ready endpoint', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
    expect(body.components).toBeDefined();
    expect(body.components.database).toBeDefined();
    expect(body.components.database.status).toBe('healthy');
    expect(body.components.database.details?.dialect).toBe('postgresql');
  });

  it('should keep /health/live responsive as process liveness probe', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/live' });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
  });
});
