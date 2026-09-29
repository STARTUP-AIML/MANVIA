import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: HealthService,
      useFactory: () => new HealthService('0.1.0-phase2'),
    },
  ],
  exports: [HealthService],
})
export class HealthModule {}
