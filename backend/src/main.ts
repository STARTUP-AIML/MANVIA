import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import fastifyWebsocket from '@fastify/websocket';
import crypto from 'node:crypto';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { ConfigService } from './config/config.service.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import { setupSwagger } from './config/swagger.config.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { AIVoiceGateway } from './modules/ai/realtime/ai-voice.gateway.js';
import { TokenService } from './modules/auth/services/token.service.js';
import { SessionService } from './modules/auth/services/session.service.js';
import type { AuthenticatedUser } from './modules/auth/auth.interface.js';
import type { FastifyRequest } from 'fastify';

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

  // Fastify WebSocket Plugin (Voice Avatar Gateway /ws/v1/ai/voice)
  await app.register(fastifyWebsocket, {
    options: {
      maxPayload: 2 * 1024 * 1024, // 2MB max frame payload limit
    },
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
      'X-User-ID',
      'X-User-Role',
      'X-Active-Role',
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
      'ws/v1/ai/voice',
    ],
  });

  // Register MANVIA Realtime Voice Gateway on Fastify adapter
  try {
    const voiceGateway = app.get(AIVoiceGateway);
    voiceGateway.registerGateway(app.getHttpAdapter().getInstance());
  } catch (err) {
    new Logger('AIVoiceGateway').warn(
      `Deferred voice gateway route registration: ${(err as Error).message}`,
    );
  }

  // Global Validation Pipe
  app.useGlobalPipes(createValidationPipe());

  // Global Standardized Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter(configService.raw));

  // Global Structured Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor(configService.raw));

  // Fastify Bearer Authentication Resolution Hook
  // Validates cryptographic JWT signature and active database session state,
  // attaching verified identity context to request.user for downstream domain guards.
  try {
    const tokenService = app.get(TokenService);
    const sessionService = app.get(SessionService);
    const fastifyInstance = app.getHttpAdapter().getInstance();

    fastifyInstance.addHook('onRequest', async (request: FastifyRequest) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return;
      }

      const [scheme, token] = authHeader.split(' ');
      if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return;
      }

      try {
        const payload = tokenService.verifyAccessToken(token);
        const { isValid, session } = await sessionService.validateSession(payload.sessionId);
        if (!isValid || !session || session.user.status !== 'ACTIVE') {
          return;
        }

        (request as FastifyRequest & { user?: AuthenticatedUser & { userId?: string } }).user = {
          id: session.user.id,
          userId: session.user.id,
          email: session.user.email,
          roles: session.user.roles,
          activeRole: payload.activeRole ?? session.user.roles[0] ?? 'PATIENT',
          sessionId: session.id,
        };
      } catch {
        // Invalid/expired token -> request.user remains undefined
      }
    });
  } catch (err) {
    new Logger('AuthHook').warn(`Deferred auth hook registration: ${(err as Error).message}`);
  }

  // OpenAPI / Swagger Documentation
  setupSwagger(app, configService.raw);

  // Graceful Shutdown Hooks
  app.enableShutdownHooks();

  return app;
}

declare global {
  var __MANVIA_APP__: NestFastifyApplication | undefined;
  var __MANVIA_SIGNALS_REGISTERED__: boolean | undefined;
}

/**
 * Bootstraps and binds the NestJS Fastify application to HTTP network interfaces.
 */
export async function bootstrap(): Promise<NestFastifyApplication> {
  // In development watch mode, cleanly close any previous instance before re-binding port
  if (globalThis.__MANVIA_APP__) {
    await globalThis.__MANVIA_APP__.close();
    globalThis.__MANVIA_APP__ = undefined;
  }

  const app = await createApp();
  globalThis.__MANVIA_APP__ = app;
  const configService = app.get(ConfigService);
  const logger = new Logger('MANVIA');

  await app.listen(configService.port, configService.host);

  if (configService.isDevelopment) {
    const devHost =
      configService.host === '0.0.0.0' || configService.host === '::'
        ? 'localhost'
        : configService.host;
    const baseUrl = `http://${devHost}:${configService.port}`;
    logger.log(`[MANVIA] Backend running at ${baseUrl}`);
    logger.log(`[MANVIA] API: ${baseUrl}/${configService.apiPrefix}`);
    logger.log(`[MANVIA] Health: ${baseUrl}/health`);
    logger.log(`[MANVIA] Ready: ${baseUrl}/health/ready`);
    if (configService.isSwaggerEnabled) {
      logger.log(`[MANVIA] Swagger: ${baseUrl}/${configService.swaggerPath}`);
    }
  } else {
    logger.log(
      `[MANVIA] Backend foundation running on http://${configService.host}:${configService.port} [${configService.nodeEnv}]`,
    );
    if (configService.isSwaggerEnabled) {
      logger.log(
        `[MANVIA] Swagger documentation active on http://${configService.host}:${configService.port}/${configService.swaggerPath}`,
      );
    }
  }

  // Graceful process termination signal handlers (registered once per process)
  if (!globalThis.__MANVIA_SIGNALS_REGISTERED__) {
    globalThis.__MANVIA_SIGNALS_REGISTERED__ = true;
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.log(`Received ${signal}. Gracefully terminating NestJS application...`);
        if (globalThis.__MANVIA_APP__) {
          await globalThis.__MANVIA_APP__.close();
          globalThis.__MANVIA_APP__ = undefined;
        }
        logger.log('Application shutdown complete.');
        process.exit(0);
      });
    }
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
