export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  status: HealthStatus;
  responseTimeMs?: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface LivenessResult {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
  version: string;
}

export interface ReadinessResult {
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  components: Record<string, ComponentHealth>;
}

export type HealthIndicator = () => Promise<ComponentHealth>;
