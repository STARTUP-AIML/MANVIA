import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [ConfigModule, HealthModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
