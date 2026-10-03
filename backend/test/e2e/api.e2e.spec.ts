import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';

describe('API Foundation & Routing (E2E)', () => {
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

  it('GET / should return 200 with platform root metadata', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.name).toBe('manvia-backend');
    expect(body.status).toBe('online');
    expect(body.version).toBe('0.1.0-phase2');
    expect(body.environment).toBe('test');
    expect(body.documentation).toBeDefined();
  });

  it('GET /api/v1 should return 200 with API version prefix confirmation', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1' });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.name).toBe('manvia-backend');
    expect(body.prefix).toBe('api/v1');
    expect(body.version).toBe('0.1.0-phase2');
  });

  it('GET /unknown-route should return 404 with standardized error JSON', async () => {
    const res = await app.inject({ method: 'GET', url: '/unknown-route' });
    expect(res.statusCode).toBe(404);

    const body = JSON.parse(res.body);
    expect(body.statusCode).toBe(404);
    expect(body.error).toBe('NOT_FOUND');
    expect(body.message).toContain('Cannot GET');
    expect(body.requestId).toBeDefined();
    expect(body.timestamp).toBeDefined();

    // Verify correlation header stamped on 404 response
    expect(res.headers['x-request-id']).toBe(body.requestId);
  });

  it('should preserve and reflect custom safe X-Request-ID header in response', async () => {
    const customId = 'req_trusted-client-id-12345';
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': customId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-request-id']).toBe(customId);
    expect(res.headers['x-correlation-id']).toBe(customId);
  });

  it('should include secure HTTP headers via Helmet', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('should handle CORS preflight request cleanly', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'GET',
      },
    });

    // CORS preflight response
    expect([200, 204]).toContain(res.statusCode);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});
