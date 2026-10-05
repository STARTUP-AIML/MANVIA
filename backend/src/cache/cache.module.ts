// ==============================================================================
// MANVIA — Global Cache Module (ADR-007, Phase 2/3/9/13, M8)
// ==============================================================================

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import { RedisCacheService } from './redis-cache.service.js';

export const CACHE_SERVICE = 'CACHE_SERVICE';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RedisCacheService,
    {
      provide: CACHE_SERVICE,
      useExisting: RedisCacheService,
    },
  ],
  exports: [RedisCacheService, CACHE_SERVICE],
})
export class CacheModule {}
