# MANVIA — Backend Architecture

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Technology Stack

| Component | Technology | Version | Decision Status |
|---|---|---|---|
| Runtime | Node.js | 24 LTS | Confirmed |
| Language | TypeScript | 5.x (strict) | Confirmed |
| Framework | NestJS | Latest stable | Confirmed |
| HTTP Adapter | Fastify | Latest stable | Confirmed |
| ORM | Prisma | 7.x | Confirmed |
| Validation | class-validator + class-transformer | Latest | Confirmed |
| Testing | Vitest + Supertest | Latest | Confirmed |
| Logging | Pino (via Fastify) | Built-in | Confirmed |
| Linting | ESLint + Prettier | Latest | Confirmed |

---

## 2. Module Architecture

### ADR-001: Modular Monolith Over Microservices

**Problem:** Microservices would add distributed systems complexity (service mesh, inter-service auth, network latency, distributed transactions, independent deployments) that a two-developer team cannot sustain.

**Decision:** Modular monolith. One NestJS application. All modules share one process, one deployment, one database. Module boundaries are enforced through code conventions and NestJS module system.

**Trade-off:** Cannot independently scale individual modules. Acceptable at current scale; architecture supports future extraction.

---

### 2.1 Module Directory Structure

```
src/
+-- main.ts                          -- Application bootstrap
+-- app.module.ts                    -- Root module
+-- app.controller.ts                -- Root health check
|
+-- config/                          -- Configuration module
|   +-- app.config.ts
|   +-- database.config.ts
|   +-- redis.config.ts
|   +-- jwt.config.ts
|   +-- ai.config.ts
|   +-- storage.config.ts
|   +-- validation.schema.ts         -- Joi/Zod env validation
|
+-- common/                          -- Shared utilities
|   +-- decorators/
|   +-- filters/                     -- Global exception filters
|   +-- guards/                      -- Base guards
|   +-- interceptors/                -- Logging, response transform
|   +-- middleware/                  -- Request ID, correlation ID
|   +-- pipes/                       -- Global validation pipe
|   +-- dto/                         -- Shared DTOs (pagination, error)
|   +-- types/                       -- Shared TypeScript types
|   +-- utils/                       -- Pure utility functions
|   +-- constants/
|
+-- database/                        -- Prisma client module
|   +-- database.module.ts
|   +-- prisma.service.ts
|
+-- cache/                           -- Redis client module
|   +-- cache.module.ts
|   +-- redis.service.ts
|
+-- events/                          -- Internal event bus
|   +-- events.module.ts
|   +-- events.service.ts            -- Redis Streams publisher
|   +-- events.consumer.ts           -- Redis Streams consumer
|
+-- health/                          -- Health check endpoint
|   +-- health.module.ts
|   +-- health.controller.ts
|
+-- modules/
|   +-- identity/                    -- Central user identity
|   +-- authentication/              -- JWT, sessions, refresh tokens
|   +-- users/                       -- User management (admin)
|   +-- patients/                    -- Patient profiles
|   +-- doctors/                     -- Doctor profiles
|   +-- doctor-verification/         -- Verification lifecycle
|   +-- specialties/                 -- Medical specialties reference
|   +-- languages/                   -- Language preferences reference
|   +-- availability/                -- Doctor availability slots
|   +-- consultation-offers/         -- Consultation products
|   +-- care-relationships/          -- Patient-doctor relationships
|   +-- wellness/                    -- Wellness check-ins, journals
|   +-- health-records/              -- Medical documents
|   +-- health-timeline/             -- Longitudinal care timeline
|   +-- consultations/               -- Consultation records
|   +-- pre-consultation/            -- Intake forms
|   +-- appointments/                -- Appointment state machine
|   +-- waitlist/                    -- Waitlist management
|   +-- follow-ups/                  -- Follow-up consultations
|   +-- payments/                    -- Payment processing
|   +-- refunds/                     -- Refund management
|   +-- invoices/                    -- Invoice generation
|   +-- payouts/                     -- Doctor payouts
|   +-- notifications/               -- Notification delivery
|   +-- ai/                          -- AI conversation orchestration
|   +-- ai-safety/                   -- AI safety engine
|   +-- realtime/                    -- WebSocket gateway
|   +-- media/                       -- Media file management
|   +-- consent/                     -- Consent management
|   +-- support/                     -- Support ticket system
|   +-- audit/                       -- Audit log
|   +-- security/                    -- Security event management
|   +-- admin/                       -- Admin operations
|
+-- integrations/                    -- Third-party integrations
|   +-- ai/                          -- AI provider adapters
|   |   +-- ai.interface.ts          -- AIProvider interface
|   |   +-- gemini.adapter.ts        -- Google Gemini adapter
|   |   +-- openai.adapter.ts        -- OpenAI adapter
|   |   +-- ai-orchestrator.service.ts
|   |
|   +-- speech/                      -- STT/TTS adapters
|   +-- avatar/                      -- Avatar provider adapters
|   +-- payments/                    -- Payment gateway adapters
|   |   +-- payment.interface.ts
|   |   +-- razorpay.adapter.ts      -- (if selected)
|   |   +-- stripe.adapter.ts        -- (if selected)
|   |
|   +-- email/                       -- Email provider adapters
|   +-- sms/                         -- SMS provider adapters
|   +-- push/                        -- Push notification adapters
|   +-- storage/                     -- Object storage adapters
|       +-- storage.interface.ts
|       +-- s3.adapter.ts
|       +-- gcs.adapter.ts
|       +-- local.adapter.ts         -- For development
|
+-- workers/                         -- Background processors
    +-- document-indexer.worker.ts
    +-- notification-sender.worker.ts
    +-- event-processor.worker.ts
```

---

### 2.2 Module Internal Structure

Each feature module follows this pattern:

```
modules/appointments/
+-- appointments.module.ts
+-- appointments.controller.ts       -- HTTP endpoints
+-- appointments.service.ts          -- Business logic
+-- appointments.repository.ts       -- Database access (Prisma)
+-- appointments.events.ts           -- Events published by this module
+-- dto/
|   +-- create-appointment.dto.ts
|   +-- update-appointment.dto.ts
|   +-- appointment-response.dto.ts
+-- guards/
|   +-- appointment-owner.guard.ts
+-- types/
|   +-- appointment.types.ts
+-- tests/
    +-- appointments.service.spec.ts
    +-- appointments.controller.spec.ts
    +-- appointments.e2e-spec.ts
```

---

## 3. Key Architectural Patterns

### 3.1 Repository Pattern

All database access goes through a dedicated repository class. Services never import `PrismaService` directly.

**Why:** Isolates the ORM from business logic, making unit testing easier (mock the repository) and future ORM changes localized.

### 3.2 Provider Abstraction Pattern

All third-party integrations are behind an interface. Only the integrations layer imports vendor SDKs.

```typescript
// integrations/ai/ai.interface.ts
interface AIProvider {
  generateText(request: AIRequest): Promise<AIResponse>;
  streamText(request: AIRequest): AsyncIterable<AIStreamChunk>;
  generateEmbedding(text: string): Promise<number[]>;
}
```

### 3.3 Guard Hierarchy

Authorization is layered:

1. `JwtAuthGuard` — Is the user authenticated?
2. `RolesGuard` — Does the user have the required role?
3. `ResourceOwnerGuard` — Does the user own this specific resource?
4. `CareRelationshipGuard` — Does a valid care relationship exist?
5. `ConsentGuard` — Does explicit consent exist for this access?

Not every endpoint requires all five. The combination is defined per endpoint via decorators.

### 3.4 Audit Interceptor

A global `AuditInterceptor` records every mutating request to the audit log:
- Actor (user ID, role)
- Action (HTTP method + endpoint)
- Resource (entity type + ID)
- Outcome (success/failure)
- Timestamp
- Correlation ID

### 3.5 Request Correlation

Every request receives a `X-Request-ID` (client-provided or generated) and `X-Correlation-ID` (generated per request chain). These are propagated through all logs, events, and outgoing requests.

---

## 4. ADR-002: NestJS + Fastify over Express

**Problem:** The HTTP adapter choice affects performance and ecosystem compatibility.

**Decision:** NestJS with Fastify adapter.

**Why Fastify over Express:**
- 2–3x higher throughput in benchmarks.
- Built-in JSON schema validation (faster than Express + Joi).
- Better async error handling.
- Native Pino logging.
- TypeScript types included.

**Trade-off:** Some Express middleware packages do not work with Fastify. This is acceptable because MANVIA will use NestJS interceptors and pipes instead of raw middleware where possible.

**Alternative considered:** Hono + manual structure — rejected because NestJS's decorator-based DI, module system, and testing utilities significantly reduce boilerplate for a complex domain.

---

## 5. ADR-007: Redis Streams as Initial Event Bus

**Problem:** Modules need to communicate asynchronously without tight coupling.

**Decision:** Redis Streams for internal events, initially.

**Why not Kafka:** Kafka adds dedicated infrastructure (brokers, ZooKeeper/KRaft), complex local development setup, and steep learning curve. Redis is already a project dependency for caching.

**Why not in-process EventEmitter:** In-process events are lost on crash. Redis Streams persists messages and supports consumer groups for reliable delivery.

**Trade-off:** Redis Streams does not have Kafka's replay depth, partition semantics, or extreme throughput. For MANVIA's initial scale, Redis Streams is sufficient.

**Migration path:** Extract to Kafka or Cloud Pub/Sub when events exceed Redis Streams capacity or when operational maturity allows.

---

## 6. Authentication Strategy

See detail: [../../04_API/Authentication.md](../../04_API/Authentication.md)

### ADR-009: JWT + Refresh Token Rotation

**Problem:** Stateless JWT access tokens cannot be revoked if compromised. Long-lived tokens increase attack surface. Fully stateless auth conflicts with healthcare security requirements.

**Decision:**
- Short-lived access token: 15 minutes
- Long-lived refresh token: 7–30 days (configurable)
- Refresh tokens stored in database (allows revocation)
- Refresh token rotation: each use issues a new refresh token and invalidates the old one
- Token family tracking: if a reused refresh token is detected, revoke the entire family (breach detection)
- Active tokens tracked in Redis for fast revocation lookup

**Why not sessions only:** Sessions require sticky sessions or shared session store; JWT + Redis revocation gives more flexibility for horizontal scaling.

**Why not purely stateless JWT:** Cannot revoke on logout or on suspected compromise. Unacceptable for a healthcare platform.

---

## 7. Authorization Strategy

See detail: [../../06_SECURITY/Authorization.md](../../06_SECURITY/Authorization.md)

### ADR-010: Resource-Level RBAC + Consent Enforcement

**Problem:** Role-based access alone is insufficient. A doctor's role does not grant access to every patient's data. Access must be governed by the specific relationship between the doctor and patient.

**Decision:** Three-layer authorization:
1. **Role** — Is the user a patient, doctor, or admin?
2. **Resource ownership / relationship** — Does this user have a relationship to this specific resource?
3. **Consent** — Has explicit consent been granted for this type of access?

All three must pass for sensitive health data access. Role alone is never sufficient.

---

## 8. API Design

See detail: [../../04_API/API_Overview.md](../../04_API/API_Overview.md)

### ADR-008: REST over GraphQL

**Problem:** Some teams consider GraphQL for complex healthcare APIs to allow flexible client queries.

**Decision:** REST with OpenAPI documentation.

**Why REST:**
- Healthcare APIs benefit from explicit, auditable endpoints. Each endpoint has a clear security policy.
- GraphQL's flexible querying makes it harder to enforce field-level consent policies.
- REST is simpler to rate-limit, version, and audit.
- The team's expertise is in REST.
- OpenAPI tooling is mature and well-supported by NestJS.

**Trade-off:** Some over-fetching/under-fetching vs. GraphQL. Mitigated by well-designed response DTOs with projection support where needed.

---

## 9. Error Handling Strategy

### Global Error Format

All API errors return:

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Validation failed",
  "details": [
    { "field": "email", "message": "must be a valid email" }
  ],
  "requestId": "req_abc123",
  "timestamp": "2026-09-28T16:34:00Z"
}
```

### Error Codes

Internal errors have semantic codes:
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_TOKEN_EXPIRED`
- `APPOINTMENT_DOUBLE_BOOKING`
- `CONSENT_NOT_GRANTED`
- `DOCTOR_NOT_VERIFIED`
- etc.

These codes allow clients to handle errors programmatically without parsing message strings.

### Exception Filter

A global NestJS `ExceptionFilter` catches all unhandled exceptions, logs them, strips internal details from responses, and returns the standardized error format.

---

## 10. Testing Architecture

See detail: [../../06_SECURITY/Security_Architecture.md](../../06_SECURITY/Security_Architecture.md) (security tests) and individual phase documentation.

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | Service logic, guards, utilities |
| Integration | Vitest + Prisma test DB | Repository + service with real DB |
| API | Supertest | Full HTTP request through controller |
| E2E | Supertest + test DB | Multi-step user journeys |
| Performance | k6 or Artillery | Load testing key endpoints |
| Security | Manual + automated scanner | Phase 20 |

---

## 11. Configuration and Secrets

- All configuration through environment variables.
- Env vars validated at startup via Joi schema.
- No default secrets in code.
- `.env.example` documents all required variables with descriptions and example formats.
- `.env` files are gitignored.
- Secrets management in production: DECISION REQUIRED (AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault).

---

*This document is the definitive backend architectural specification. All architectural deviations must be documented as new ADRs or amendments to existing ones.*
