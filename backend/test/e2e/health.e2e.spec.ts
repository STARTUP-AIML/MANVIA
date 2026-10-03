import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';

describe('Health Endpoints (E2E)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /health should return 200 and liveness payload', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(typeof body.timestamp).toBe('string');
  });

  it('GET /health/live should return 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/live' });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
  });

  it('GET /health/liveness should return 200 with status ok (alias)', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/liveness' });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
  });

  it('GET /health/ready should return 200 with healthy readiness payload', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
    expect(body.components).toBeDefined();
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  it('GET /health/readiness should return 200 with healthy readiness payload (alias)', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/readiness' });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
    expect(body.components).toBeDefined();
  });
});
