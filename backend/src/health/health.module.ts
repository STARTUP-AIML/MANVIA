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
        const service = new HealthService('0.1.0-phase3');
        service.registerIndicator('database', () => prisma.checkHealth());
        return service;
      },
      inject: [PrismaService],
    },
  ],
  exports: [HealthService],
})
export class HealthModule {}
