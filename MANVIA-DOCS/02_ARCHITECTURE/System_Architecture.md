# MANVIA — System Architecture

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Architecture Style

MANVIA uses a **Modular Monolith** backend architecture.

### Why Modular Monolith?

**Problem:** Healthcare platforms often start with microservices prematurely, which adds distributed systems complexity (service discovery, inter-service auth, network latency, distributed tracing, independent deployments) before the team has the data volume or operational maturity to justify it.

**Decision:** Modular monolith — a single deployable NestJS application with well-defined internal module boundaries that enforce domain isolation without distributed overhead.

**Alternatives considered:**

| Alternative | Reason Not Chosen |
|---|---|
| Microservices from day 1 | Two-developer team; no DevOps team; massive coordination overhead |
| Simple monolith (no module boundaries) | Would become unmaintainable; hard to extract later |
| Serverless (Lambda/Cloud Run per function) | Cold start latency unacceptable for realtime AI; poor local development |

**Trade-offs:**
- Pro: Single deployment, simple debugging, shared transactions, no network overhead between modules.
- Con: Scaling requires scaling the whole app (acceptable for current scale); extraction to services later requires effort.

**Future migration path:** Module boundaries are designed so any module can be extracted into a standalone microservice if demand requires. The event-driven internal architecture (Redis Streams) means decoupling is already partially in place.

**ADR Reference:** ADR-001

---

## 2. High-Level System Diagram

```
                          CLIENTS
          +----------+  +----------+  +----------+
          |  iOS App |  |Android App|  |  Web App |
          +----------+  +----------+  +----------+
                    |         |         |
                    v         v         v
              +--------------------------------+
              |        API Gateway / LB        |
              |   (TLS termination, rate limit)|
              +--------------------------------+
                              |
                              v
              +--------------------------------+
              |      MANVIA Backend            |
              |   NestJS + Fastify             |
              |   Modular Monolith             |
              |                                |
              |  +----------+ +-----------+    |
              |  | REST API | | WebSocket |    |
              |  | /api/v1  | | (realtime)|    |
              |  +----------+ +-----------+    |
              |                                |
              |  Modules: Identity, Auth,      |
              |  Patients, Doctors, Wellness,  |
              |  Appointments, AI, Records,    |
              |  Consent, Payments, etc.       |
              +--------------------------------+
                    |         |         |
            +-------+    +----+    +----+
            v            v         v
    +----------+  +----------+  +----------+
    |PostgreSQL|  |  Redis   |  |  Object  |
    |  (primary|  | (cache + |  |  Storage |
    |  store)  |  |  events) |  |  (S3-   |
    |+pgvector |  +----------+  | compat) |
    +----------+                +----------+
          |
          v
   +------------+
   | AI Provider|
   | (abstracted|
   | Gemini /   |
   | OpenAI /   |
   | other)     |
   +------------+
```

---

## 3. Component Architecture

### 3.1 API Layer

- **Framework:** NestJS on Fastify
- **Protocol:** HTTP/1.1 and HTTP/2 (Fastify supports both)
- **API style:** REST with OpenAPI documentation
- **Versioning:** `/api/v1` prefix; additive versioning strategy
- **WebSocket:** Fastify WebSocket adapter for realtime AI voice and notifications

### 3.2 Application Layer (Modules)

Each module owns:
- Its domain entities (Prisma models)
- Its service layer (business logic)
- Its repository layer (database access via Prisma)
- Its controllers (HTTP entry points)
- Its DTOs (data transfer objects with validation)
- Its guards (module-specific authorization)
- Its events (published to event bus)
- Its tests

Module dependency rules:
- Modules depend on shared `common/` utilities and `database/` only.
- Modules must NOT directly import another module's repository.
- Cross-module communication goes through events or dedicated service interfaces.

### 3.3 Data Layer

| Store | Purpose | Technology |
|---|---|---|
| Primary database | All transactional data | PostgreSQL 18.x |
| ORM | Schema management, migrations, queries | Prisma 7.x |
| Cache | Sessions, temporary state, rate limit counters | Redis |
| Event bus | Internal async events (initial) | Redis Streams |
| Vector store | AI embeddings for RAG | pgvector extension |
| Object storage | Health records, documents, media | S3-compatible (provider TBD) |

### 3.4 Integrations Layer

All third-party integrations live in `src/integrations/` and are accessed only through defined interfaces. No module imports an integration SDK directly.

```
src/integrations/
  ai/           -- AI provider abstraction
  speech/       -- STT/TTS provider abstraction
  avatar/       -- Avatar provider abstraction
  payments/     -- Payment gateway abstraction
  email/        -- Email provider abstraction
  sms/          -- SMS provider abstraction
  push/         -- Push notification provider abstraction
  storage/      -- Object storage provider abstraction
```

### 3.5 Workers Layer

Background processing (document indexing, event processing, scheduled tasks) runs in `src/workers/`. Initially these are in-process workers within the modular monolith. They can be extracted to separate processes if needed.

---

## 4. Deployment Architecture

**DECISION REQUIRED:** Cloud provider (OD-001)

The following is designed to be cloud-agnostic:

```
Production Environment:
+------------------------------------------+
| Cloud Provider (TBD)                      |
|                                           |
| +------------------+  +----------------+ |
| | App Server(s)    |  | Managed        | |
| | Docker container |  | PostgreSQL     | |
| | NestJS + Fastify |  | (primary)      | |
| | Horizontal scale |  +----------------+ |
| +------------------+                     |
|                        +----------------+ |
| +------------------+  | Managed Redis  | |
| | Load Balancer    |  | (cache+events) | |
| | TLS termination  |  +----------------+ |
| +------------------+                     |
|                        +----------------+ |
| +------------------+  | Object Storage | |
| | CDN              |  | (S3-compat)    | |
| | (static assets)  |  +----------------+ |
| +------------------+                     |
+------------------------------------------+
```

**Environments:**
- `development` — local Docker Compose
- `staging` — mirrors production, used for integration testing
- `production` — locked down, monitored, audited

---

## 5. Realtime Architecture

MANVIA requires realtime capability for:
- AI voice interaction (bidirectional streaming)
- AI text streaming (SSE or WebSocket)
- Live notifications
- Appointment status updates

**Approach:**
- WebSocket connections managed by NestJS Gateway (Fastify adapter)
- Reconnection handled client-side with exponential backoff
- AI voice streaming: WebSocket or WebRTC — DECISION REQUIRED based on provider capability (OD-003, OD-014)
- Notifications: WebSocket for in-app real-time; async for push/email/SMS

---

## 6. Event Architecture

### 6.1 Internal Events (Redis Streams)

**ADR-007:** Redis Streams are used as the initial internal event bus.

**Why not Kafka?**
- Kafka requires separate infrastructure, ZooKeeper/KRaft management, and adds operational complexity.
- For a two-developer team building a modular monolith, Kafka is premature.
- Redis is already required for caching, so Redis Streams adds no new infrastructure dependency.

**Migration path:** If event volume outgrows Redis Streams (high throughput, complex replay requirements, multiple consumer groups at scale), migrate to Kafka or Cloud Pub/Sub in Phase 20+.

**Trade-off:** Redis Streams lacks Kafka's extreme durability guarantees. For critical events (payment, consent), ensure the system is designed to tolerate duplicate delivery (idempotent handlers).

### 6.2 Core Domain Events

| Event | Publisher | Subscribers |
|---|---|---|
| AppointmentRequested | appointments | notifications, payments, audit |
| AppointmentConfirmed | appointments | notifications, health-timeline, audit |
| AppointmentDeclined | appointments | notifications, audit |
| AppointmentCancelled | appointments | notifications, payments, audit |
| ConsultationCompleted | consultations | health-records, health-timeline, notifications, audit |
| DoctorVerified | doctor-verification | notifications, audit |
| ConsentGranted | consent | health-records, audit |
| ConsentRevoked | consent | health-records, care-relationships, audit |
| HealthRecordUploaded | health-records | health-timeline, audit |
| PaymentSucceeded | payments | appointments, notifications, audit |
| PaymentRefunded | payments | notifications, audit |
| AIHandoffRequested | ai | appointments, notifications, audit |
| NotificationRequested | multiple | notifications |
| SafetyEventDetected | ai-safety | audit, notifications |

---

## 7. Security Architecture Overview

See detailed doc: [../06_SECURITY/Security_Architecture.md](../06_SECURITY/Security_Architecture.md)

Key principles:
- Authentication: JWT (short-lived access token + refresh token rotation)
- Authorization: Role + resource-level guards; consent enforcement
- Transport: TLS everywhere
- Secrets: Never in source code; environment variables only
- Audit: All sensitive operations logged with actor, action, resource, timestamp
- Input validation: class-validator on all DTOs
- Rate limiting: On all public and auth endpoints

---

## 8. Observability Architecture

**DECISION REQUIRED:** Vendor selection (OD-009)

Architecture (vendor-agnostic):

```
Application Code
   |
   v (OpenTelemetry SDK)
OTel Collector
   |
   +-- Traces  --> [Tracing backend: Jaeger / Datadog / GCP Trace]
   +-- Metrics --> [Metrics backend: Prometheus / Datadog / GCP Monitoring]
   +-- Logs    --> [Log backend: Loki / Datadog / GCP Logging]
```

Additionally:
- Structured JSON logs via pino (Fastify default)
- Error tracking: Sentry or equivalent (DECISION REQUIRED)
- AI cost and token observability: integrated in AI module

---

## 9. Architecture Challenges and Decisions

### Challenge 1: Appointment concurrency (double-booking)

Without proper locking, two patients could simultaneously book the same doctor slot.

**Decision:** Use a time-limited slot HOLD mechanism backed by a PostgreSQL row lock or Redis lock. The hold is created in an atomic transaction. The uniqueness constraint on (doctor_id, slot_start, status IN [HELD, REQUESTED, CONFIRMED]) prevents double-booking at the database level.

### Challenge 2: AI provider coupling

Direct use of OpenAI or Gemini SDKs throughout the codebase would make switching providers expensive.

**Decision (ADR-005):** All AI interaction goes through a provider abstraction layer. Only `src/integrations/ai/` imports provider-specific SDKs. All modules interact with the `AIOrchestrator` service, not with provider SDKs.

### Challenge 3: Health record binary storage

Storing large binary files (PDFs, DICOM, images) in PostgreSQL is expensive, slow to back up, and hard to scale.

**Decision (ADR-006):** Health records are stored in S3-compatible object storage. PostgreSQL stores only metadata (filename, type, size, storage key, access policy). Binary data never enters the PostgreSQL row.

### Challenge 4: Sequential phase delivery

Twenty backend phases delivered by two developers is a long timeline. Phase dependencies mean a defect in Phase 4 (auth) could cascade to all later phases.

**Decision:** Front-load architectural decisions in Phase 0. Define exit criteria for every phase. Phase owner is responsible for tests and documentation, not just code.

---

*Updated at the end of each phase with implemented vs. specified decisions.*
