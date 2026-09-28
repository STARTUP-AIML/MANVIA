import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { getEnvConfig } from './config/index.js';
import { HealthService } from './health/index.js';

export function bootstrap() {
  const config = getEnvConfig();
  const healthService = new HealthService('0.1.0-phase1');

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? '/';

    if (url === '/health' || url === '/health/liveness') {
      const liveness = healthService.checkLiveness();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(liveness));
      return;
    }

    if (url === '/health/readiness') {
      const readiness = await healthService.checkReadiness();
      const statusCode = readiness.status === 'unhealthy' ? 503 : 200;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(readiness));
      return;
    }

    if (url === '/' || url === `/${config.API_PREFIX}`) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          name: config.APP_NAME,
          status: 'online',
          version: '0.1.0-phase1',
          environment: config.NODE_ENV,
          documentation: 'Phase 1 Foundation Operational. NestJS + Fastify arriving in Phase 2.',
        }),
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found', path: url }));
  });

  const shutdown = (signal: string) => {
    // Graceful shutdown handling
    console.info(`[SYSTEM] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.info('[SYSTEM] Server terminated gracefully.');
      process.exit(0);
    });

    // Force close after 10s timeout
    setTimeout(() => {
      console.error('[SYSTEM] Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { server, config, healthService };
}

// Auto-start server when run directly
if (process.env.NODE_ENV !== 'test') {
  const { server, config } = bootstrap();
  server.listen(config.PORT, config.HOST, () => {
    console.info(
      `[MANVIA] Backend foundation running on http://${config.HOST}:${config.PORT} [${config.NODE_ENV}]`,
    );
  });
}
