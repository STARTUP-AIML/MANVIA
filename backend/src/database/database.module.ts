// ==============================================================================
// MANVIA — Global Database Module
// ==============================================================================
// Exposes PrismaService as a single managed provider across the application.
// ==============================================================================

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
