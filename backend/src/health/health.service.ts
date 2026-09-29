import { Injectable } from '@nestjs/common';
import type {
  ComponentHealth,
  HealthIndicator,
  HealthStatus,
  LivenessResult,
  ReadinessResult,
} from './health.interface.js';

@Injectable()
export class HealthService {
  private readonly indicators = new Map<string, HealthIndicator>();
  private readonly startTime = Date.now();
  private readonly version: string;

  constructor(version = '0.1.0') {
    this.version = version;
  }

  /**
   * Register a dependency health indicator (e.g. database, redis, storage).
   */
  public registerIndicator(name: string, indicator: HealthIndicator): void {
    this.indicators.set(name, indicator);
  }

  /**
   * Unregister an indicator (primarily for testing).
   */
  public unregisterIndicator(name: string): boolean {
    return this.indicators.delete(name);
  }

  /**
   * Evaluates process liveness.
   * Returns fast static response indicating process responsiveness.
   */
  public checkLiveness(): LivenessResult {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.version,
    };
  }

  /**
   * Evaluates system readiness by executing all registered component indicators.
   */
  public async checkReadiness(): Promise<ReadinessResult> {
    const components: Record<string, ComponentHealth> = {};
    let overallStatus: HealthStatus = 'healthy';

    for (const [name, indicator] of this.indicators.entries()) {
      const start = Date.now();
      try {
        const result = await indicator();
        const duration = Date.now() - start;

        components[name] = {
          ...result,
          responseTimeMs: duration,
        };

        if (result.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
          overallStatus = 'degraded';
        }
      } catch (err) {
        const duration = Date.now() - start;
        const errorMessage = err instanceof Error ? err.message : 'Unknown health check failure';

        components[name] = {
          status: 'unhealthy',
          responseTimeMs: duration,
          error: errorMessage,
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      components,
    };
  }
}
