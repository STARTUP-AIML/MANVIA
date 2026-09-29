import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';
import { setupSwagger, createSwaggerDocument } from '../../src/config/swagger.config.js';
import { getEnvConfig } from '../../src/config/env.js';

describe('Swagger / OpenAPI Integration', () => {
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

  it('should generate valid OpenAPI specification with title MANVIA API and version 0.1.0-phase2', () => {
    const document = createSwaggerDocument(app);
    expect(document.info.title).toBe('MANVIA API');
    expect(document.info.version).toBe('0.1.0-phase2');
    expect(document.info.description).toContain('MANVIA');

    // Verify Bearer Auth security scheme placeholder
    expect(document.components?.securitySchemes).toBeDefined();
    expect(document.components?.securitySchemes?.['bearer-auth']).toBeDefined();
  });

  it('should return null when SWAGGER_ENABLED is configured false', () => {
    const baseConfig = getEnvConfig();
    const disabledConfig = {
      ...baseConfig,
      SWAGGER_ENABLED: false,
    };

    const result = setupSwagger(app, disabledConfig);
    expect(result).toBeNull();
  });

  it('should expose Swagger documentation endpoint when enabled', async () => {
    // When Swagger is enabled, the documentation route is accessible
    const res = await app.inject({ method: 'GET', url: '/docs' });
    expect([200, 301, 302]).toContain(res.statusCode);
  });
});
