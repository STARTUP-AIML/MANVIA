import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bootstrap } from '../../src/index.js';
import type { Server } from 'node:http';

describe('Foundation Integration', () => {
  let server: Server;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    const app = bootstrap();
    server = app.server;
  });

  afterEach(async () => {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it('should initialize server and register health indicators in integration context', async () => {
    const app = bootstrap();
    expect(app.server).toBeDefined();
    expect(app.config).toBeDefined();
    expect(app.healthService).toBeDefined();

    // Verify indicator registration in integration lifecycle
    app.healthService.registerIndicator('integration-service', async () => ({
      status: 'healthy',
      details: { ready: true },
    }));

    const readiness = await app.healthService.checkReadiness();
    expect(readiness.status).toBe('healthy');
    expect(readiness.components['integration-service']?.status).toBe('healthy');
  });
});
