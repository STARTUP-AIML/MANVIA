// ==============================================================================
// MANVIA — DatabaseModule Unit Test Suite
// ==============================================================================
// Tests DatabaseModule indicator registration and health integration
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { HealthModule } from '../../src/health/health.module.js';
import { HealthService } from '../../src/health/health.service.js';
import { ConfigService } from '../../src/config/config.service.js';

describe('DatabaseModule (Unit)', () => {
  let moduleRef: TestingModule;
  let prismaService: PrismaService;
  let healthService: HealthService;

  beforeEach(async () => {
    const mockConfigService = {
      databaseUrl: 'postgresql://postgres:postgres@localhost:5432/manvia_test',
      sanitizedDatabaseUrl: 'postgresql://postgres:***@localhost:5432/manvia_test',
      databasePoolMin: 2,
      databasePoolMax: 5,
      databaseConnectionTimeoutMs: 5000,
      isProduction: false,
      isDevelopment: false,
      isTest: true,
    };

    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, HealthModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: vi.fn().mockResolvedValue(undefined),
        onApplicationShutdown: vi.fn().mockResolvedValue(undefined),
        checkHealth: vi.fn().mockResolvedValue({
          status: 'healthy',
          details: { dialect: 'postgresql' },
        }),
      })
      .compile();

    prismaService = moduleRef.get(PrismaService);
    healthService = moduleRef.get(HealthService);
  });

  it('should compile and expose PrismaService', () => {
    expect(moduleRef).toBeDefined();
    expect(prismaService).toBeDefined();
  });

  it('should register database health indicator with HealthService', async () => {
    expect(healthService).toBeDefined();

    const readiness = await healthService.checkReadiness();
    expect(readiness.components['database']).toBeDefined();
    expect(readiness.components['database']?.status).toBe('healthy');
  });

  it('should reflect unhealthy readiness when database checkHealth fails', async () => {
    vi.spyOn(prismaService, 'checkHealth').mockResolvedValueOnce({
      status: 'unhealthy',
      error: 'Simulated connection failure',
      details: { dialect: 'postgresql' },
    });

    const readiness = await healthService.checkReadiness();
    expect(readiness.status).toBe('unhealthy');
    expect(readiness.components['database']?.status).toBe('unhealthy');
  });
});
