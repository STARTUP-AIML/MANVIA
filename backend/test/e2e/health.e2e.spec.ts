import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { bootstrap } from '../../src/index.js';
import type { Server } from 'node:http';

describe('Health & Foundation (E2E)', () => {
  let server: Server;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    const app = bootstrap();
    server = app.server;
  });

  it('GET /health should return 200 and liveness payload', async () => {
    const res = await request(server).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBeDefined();
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('GET /health/liveness should return 200 with status ok', async () => {
    const res = await request(server).get('/health/liveness');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health/readiness should return 200 with healthy components', async () => {
    const res = await request(server).get('/health/readiness');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.components).toBeDefined();
  });

  it('GET / should return 200 with application metadata', async () => {
    const res = await request(server).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('manvia-backend');
    expect(res.body.status).toBe('online');
  });

  it('GET /api/v1 should return 200 with API prefix confirmation', async () => {
    const res = await request(server).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('manvia-backend');
  });

  it('GET /unknown-route should return 404', async () => {
    const res = await request(server).get('/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });
});
