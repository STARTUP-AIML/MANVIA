import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import crypto from 'node:crypto';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { ConfigService } from './config/config.service.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import { setupSwagger } from './config/swagger.config.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

import type { IncomingMessage } from 'node:http';

/**
 * Resolves request correlation ID: validates and retains trusted alphanumeric/UUID format,
 * otherwise generates a cryptographically secure UUID v4.
 */
export function resolveRequestId(incoming?: string | string[] | undefined): string {
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  if (typeof candidate === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(candidate)) {
    return candidate;
  }
  return crypto.randomUUID();
}

/**
 * Creates and configures the Fastify HTTP adapter with custom request ID generation
 * and HTTP body/header security constraints.
 */
export function createFastifyAdapter(): FastifyAdapter {
  const adapter = new FastifyAdapter({
    requestIdHeader: 'x-request-id',
    genReqId: (req: IncomingMessage) => resolveRequestId(req.headers['x-request-id']),
    bodyLimit: 10 * 1024 * 1024, // 10 MB payload limit
  });

  const fastifyInstance = adapter.getInstance();

  // Guarantee that every HTTP response includes correlation headers
  fastifyInstance.addHook('onRequest', (request, reply, done) => {
    reply.header('x-request-id', request.id);
    reply.header('x-correlation-id', request.id);
    done();
  });

  fastifyInstance.addHook('onSend', (request, reply, payload, done) => {
    if (!reply.getHeader('x-request-id')) {
      reply.header('x-request-id', request.id);
    }
    if (!reply.getHeader('x-correlation-id')) {
      reply.header('x-correlation-id', request.id);
    }
    done(null, payload);
  });

  return adapter;
}

/**
 * Factory function creating and configuring the NestJS Fastify application instance.
 * Exported separately to allow clean lifecycle management in integration/e2e tests.
 */
export async function createApp(): Promise<NestFastifyApplication> {
  const adapter = createFastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  // Security Headers Baseline (Helmet)
  await app.register(helmet, {
    contentSecurityPolicy: configService.isSwaggerEnabled
      ? {
          directives: {
            defaultSrc: [`'self'`],
            styleSrc: [`'self'`, `'unsafe-inline'`],
            imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
            scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  });

  // CORS Configuration
  const allowedOrigins = configService.corsAllowedOrigins;
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      // Permit configured origins in dev/test for ergonomic development
      if (configService.isDevelopment || configService.isTest) {
        return callback(null, true);
      }
      // Strict origin checking for production/staging environments
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS request origin not allowed'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Request-ID',
      'X-Correlation-ID',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-ID', 'X-Correlation-ID'],
    credentials: true,
    maxAge: 3600,
  });

  // Global API Version Prefix with infrastructure route exclusions
  app.setGlobalPrefix(configService.apiPrefix, {
    exclude: [
      'health',
      'health/live',
      'health/ready',
      'health/liveness',
      'health/readiness',
      '',
      'api/v1',
    ],
  });

  // Global Validation Pipe
  app.useGlobalPipes(createValidationPipe());

  // Global Standardized Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter(configService.raw));

  // Global Structured Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor(configService.raw));

  // OpenAPI / Swagger Documentation
  setupSwagger(app, configService.raw);

  // Graceful Shutdown Hooks
  app.enableShutdownHooks();

  return app;
}

/**
 * Bootstraps and binds the NestJS Fastify application to HTTP network interfaces.
 */
export async function bootstrap(): Promise<NestFastifyApplication> {
  const app = await createApp();
  const configService = app.get(ConfigService);
  const logger = new Logger('MANVIA');

  await app.listen(configService.port, configService.host);

  logger.log(
    `[MANVIA] Backend foundation running on http://${configService.host}:${configService.port} [${configService.nodeEnv}]`,
  );
  if (configService.isSwaggerEnabled) {
    logger.log(
      `[MANVIA] Swagger documentation active on http://${configService.host}:${configService.port}/${configService.swaggerPath}`,
    );
  }

  // Graceful process termination signal handlers
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.log(`Received ${signal}. Gracefully terminating NestJS application...`);
      await app.close();
      logger.log('Application shutdown complete.');
      process.exit(0);
    });
  }

  return app;
}

// Auto-start when executed directly and not running in test runner
if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('[MANVIA] Fatal bootstrap failure:', err);
    process.exit(1);
  });
}
