import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';
import { HealthService } from '../../src/health/health.service.js';
import { ConfigService } from '../../src/config/config.service.js';

describe('NestJS + Fastify Foundation Integration', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should initialize application successfully using Fastify adapter', () => {
    expect(app).toBeDefined();
    const adapter = app.getHttpAdapter();
    expect(adapter).toBeInstanceOf(FastifyAdapter);
    expect(adapter.getType()).toBe('fastify');
  });

  it('should wire ConfigService and provide valid environment parameters', () => {
    const configService = app.get(ConfigService);
    expect(configService).toBeDefined();
    expect(configService.nodeEnv).toBe('test');
    expect(configService.appName).toBe('manvia-backend');
    expect(configService.apiPrefix).toBe('api/v1');
    expect(configService.isTest).toBe(true);
  });

  it('should wire HealthService and allow indicator registration in integration lifecycle', async () => {
    const healthService = app.get(HealthService);
    expect(healthService).toBeDefined();

    healthService.registerIndicator('integration-service', async () => ({
      status: 'healthy',
      details: { ready: true },
    }));

    const readiness = await healthService.checkReadiness();
    expect(readiness.status).toBe('healthy');
    expect(readiness.components['integration-service']?.status).toBe('healthy');

    // Clean up indicator
    healthService.unregisterIndicator('integration-service');
  });

  it('should support graceful shutdown without unhandled errors', async () => {
    await expect(app.close()).resolves.toBeUndefined();
  });
});
