import { describe, it, expect, beforeEach } from 'vitest';
import { HealthService } from '../../src/health/health.service.js';

describe('HealthService (Unit)', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService('1.0.0-test');
  });

  describe('checkLiveness', () => {
    it('should return status ok and metadata', () => {
      const result = service.checkLiveness();
      expect(result.status).toBe('ok');
      expect(result.version).toBe('1.0.0-test');
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('checkReadiness', () => {
    it('should report healthy when no indicators are registered', async () => {
      const result = await service.checkReadiness();
      expect(result.status).toBe('healthy');
      expect(Object.keys(result.components).length).toBe(0);
    });

    it('should report healthy when all indicators are healthy', async () => {
      service.registerIndicator('database', async () => ({
        status: 'healthy',
        details: { pool: 'connected' },
      }));
      service.registerIndicator('cache', async () => ({
        status: 'healthy',
        details: { ping: 'pong' },
      }));

      const result = await service.checkReadiness();
      expect(result.status).toBe('healthy');
      expect(result.components['database']?.status).toBe('healthy');
      expect(result.components['cache']?.status).toBe('healthy');
      expect(result.components['database']?.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should report degraded when an indicator is degraded', async () => {
      service.registerIndicator('database', async () => ({
        status: 'healthy',
      }));
      service.registerIndicator('cache', async () => ({
        status: 'degraded',
        details: { latency: 'high' },
      }));

      const result = await service.checkReadiness();
      expect(result.status).toBe('degraded');
      expect(result.components['cache']?.status).toBe('degraded');
    });

    it('should report unhealthy when an indicator is unhealthy', async () => {
      service.registerIndicator('database', async () => ({
        status: 'unhealthy',
        error: 'connection timeout',
      }));

      const result = await service.checkReadiness();
      expect(result.status).toBe('unhealthy');
      expect(result.components['database']?.status).toBe('unhealthy');
      expect(result.components['database']?.error).toBe('connection timeout');
    });

    it('should handle thrown exceptions in indicators gracefully', async () => {
      service.registerIndicator('failingComponent', async () => {
        throw new Error('Crash in indicator');
      });

      const result = await service.checkReadiness();
      expect(result.status).toBe('unhealthy');
      expect(result.components['failingComponent']?.status).toBe('unhealthy');
      expect(result.components['failingComponent']?.error).toBe('Crash in indicator');
    });

    it('should allow unregistering an indicator', () => {
      service.registerIndicator('temp', async () => ({ status: 'healthy' }));
      const removed = service.unregisterIndicator('temp');
      expect(removed).toBe(true);
      expect(service.unregisterIndicator('nonExistent')).toBe(false);
    });
  });
});
