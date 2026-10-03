# MANVIA — Observability, Telemetry & Monitoring Architecture

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Observability Pillars

MANVIA monitors four core pillars:
1. **Metrics:** Quantitative rates, latencies, error percentages, and saturation (Prometheus / Datadog).
2. **Structured Logs:** High-context JSON logs with automatic PHI scrubbing and correlation IDs (Pino).
3. **Distributed Tracing:** End-to-end request tracing spanning client, gateway, NestJS modules, Redis, and DB queries (OpenTelemetry / Jaeger).
4. **Alerting & Synthetic Probing:** Automated notifications dispatched to PagerDuty and Slack for SLO degradation.

---

## 2. Structured Logging & PHI Masking

Logs are emitted in NDJSON (Newline Delimited JSON) format. **Strict Rule:** Patient medical records, symptoms, notes, and full names must NEVER be emitted in plain text logs.

### Standard Log Envelope
```json
{
  "timestamp": "2026-09-28T22:30:15.120Z",
  "level": "info",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "userId": "a3b89012-c456-4789-8901-234567890123",
  "userRole": "PATIENT",
  "context": "AppointmentService",
  "message": "Appointment slot reserved successfully",
  "appointmentId": "APT-18294719",
  "latencyMs": 42
}
```

### Pino PHI Redaction Configuration
The global logger enforces automated redaction for sensitive keys:
```typescript
redact: {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    '*.password',
    '*.passwordHash',
    '*.journalReflection',
    '*.clinicalNotes',
    '*.prescriptions',
    '*.token'
  ],
  censor: '[REDACTED_PHI]'
}
```

---

## 3. Golden Signals & Key Metrics

| Metric | Type | Target SLO | Alert Condition |
|---|---|---|---|
| **API Latency (p95)** | Histogram | < 150ms | > 300ms for 3 consecutive minutes |
| **API Latency (p99)** | Histogram | < 300ms | > 600ms for 3 consecutive minutes |
| **HTTP 5xx Error Rate** | Counter | < 0.05% | > 1.0% in 5-minute rolling window |
| **AI Voice Latency** | Histogram | < 800ms | > 1200ms end-to-end |
| **DB Connection Pool** | Gauge | < 70% | > 85% pool exhaustion |
| **Redis Memory Saturation** | Gauge | < 75% | > 85% memory used |

---

## 4. Alert Routing & On-Call Escalation Matrix

* **P1 (Page immediately - 24/7):**
  * HTTP 5xx rate > 2% across platform.
  * Database primary unreachable or replica lag > 60 seconds.
  * AI crisis safety pipeline error rate > 0.1%.
  * PagerDuty triggers call to Primary On-Call Engineer. Escalates to Lead Architect after 10 minutes if unacknowledged.
* **P2 (Slack #alerts-high - Business hours):**
  * Third-party payment gateway or SMS delivery latency spike.
  * Disk usage > 80% on log volume.
* **P3 (Ticket / Backlog):**
  * Transient non-critical third-party API warnings.
