// ==============================================================================
// MANVIA — Health Module
// ==============================================================================
// Exposes liveness and readiness probe endpoints.
// Injects PrismaService to register PostgreSQL readiness health indicator.
// ==============================================================================

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { PrismaService } from '../database/prisma.service.js';
import { CacheModule } from '../cache/cache.module.js';
import { RedisCacheService } from '../cache/redis-cache.service.js';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [HealthController],
  providers: [
    {
      provide: HealthService,
      useFactory: (prisma: PrismaService, cache: RedisCacheService) => {
        const service = new HealthService('0.1.0-phase20');
        service.registerIndicator('database', () => prisma.checkHealth());
        service.registerIndicator('cache', async () => {
          const res = await cache.healthCheck();
          return {
            status: res.isHealthy ? 'healthy' : 'unhealthy',
            details: { latencyMs: res.latencyMs, error: res.error },
          };
        });
        service.registerIndicator('memory', async () => {
          const mem = process.memoryUsage();
          const heapUsedMb = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;
          const heapTotalMb = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100;
          const rssMb = Math.round((mem.rss / 1024 / 1024) * 100) / 100;
          return {
            status: 'healthy',
            details: { heapUsedMb, heapTotalMb, rssMb },
          };
        });
        return service;
      },
      inject: [PrismaService, RedisCacheService],
    },
  ],
  exports: [HealthService],
})
export class HealthModule {}
