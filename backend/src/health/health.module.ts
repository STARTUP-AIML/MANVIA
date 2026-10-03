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

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [
    {
      provide: HealthService,
      useFactory: (prisma: PrismaService) => {
        const service = new HealthService('0.1.0-phase20');
        service.registerIndicator('database', () => prisma.checkHealth());
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
      inject: [PrismaService],
    },
  ],
  exports: [HealthService],
})
export class HealthModule {}
