/**
 * Vendor-Neutral OpenTelemetry-Compatible Observability Interfaces (OD-009)
 *
 * Keeps telemetry instrumentation decoupled from external observability backends
 * (e.g. Datadog, Grafana Cloud, Jaeger, CloudWatch).
 */

export interface ISpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

export interface ISpan {
  spanContext(): ISpanContext;
  setAttribute(key: string, value: string | number | boolean): this;
  setAttributes(attributes: Record<string, string | number | boolean>): this;
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): this;
  recordException(error: Error): this;
  setStatus(status: { code: 'OK' | 'ERROR'; message?: string }): this;
  end(): void;
}

export interface ITracer {
  startSpan(
    name: string,
    options?: { attributes?: Record<string, string | number | boolean> },
  ): ISpan;
  withSpan<T>(span: ISpan, fn: () => Promise<T>): Promise<T>;
}

export interface IMetricsRecorder {
  incrementCounter(name: string, value?: number, attributes?: Record<string, string>): void;
  recordHistogram(name: string, value: number, attributes?: Record<string, string>): void;
  setGauge(name: string, value: number, attributes?: Record<string, string>): void;
}

export interface ITelemetryService {
  readonly tracer: ITracer;
  readonly metrics: IMetricsRecorder;
  isInitialized(): boolean;
  shutdown(): Promise<void>;
}
