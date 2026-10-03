# MANVIA — Phase Roadmap

> Status: Phase 0 In Progress
> Last Updated: 2026-09-28

---

## Backend Phases

### Phase 0 — Product and Backend Specification
**Branch:** `feature/phase-0-project-specification`
**Owner:** CBN YENDLURI
**Status:** IN PROGRESS

**Deliverables:**
- MANVIA_SYSTEM_MASTER.md
- Complete documentation package (MANVIA-DOCS/)
- .planning/ governance files
- Architecture decisions (ADRs 001–010)
- Database conceptual architecture
- API architecture
- Security architecture
- AI architecture
- Phase roadmap (this document)

**Exit criteria:**
- All 30 Phase 0 deliverables listed in the specification are complete.
- No major domain is undocumented.
- No unsupported compliance claims exist.
- No production secrets exist in the repository.
- PR review by Vinod before merge to backend.

---

### Phase 1 — Repository and Engineering Foundation
**Branch:** `feature/phase-1-backend-foundation`
**Owner:** Vinod
**Status:** PLANNED
**Depends on:** Phase 0 merged to backend

**Deliverables:**
- Git repository governance (.gitignore, .gitattributes, branch protection rules)
- Repository configuration and conventions
- Coding standards document (ESLint, Prettier configs)
- Husky pre-commit hooks
- GitHub Actions: lint, typecheck, unit test workflow (minimal skeleton)
- EditorConfig
- Conventional Commits configuration
- Security: `.env.example` with all required env vars documented (no real secrets)
- CODEOWNERS
- PR template
- Issue templates
- Contribution guidelines

**Exit criteria:**
- CI passes on PR creation.
- Pre-commit hooks enforce lint and type-check.
- No secrets in repository.

---

### Phase 2 — NestJS + Fastify Foundation
**Branch:** `feature/phase-2-nestjs-foundation`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 1

**Deliverables:**
- NestJS project initialized with Fastify adapter
- Project structure per approved module architecture
- Global exception filter
- Global validation pipe (class-validator + class-transformer)
- Request ID middleware (correlation ID)
- Health check endpoint (`/health`)
- OpenAPI/Swagger setup
- API versioning (`/api/v1`)
- Basic rate limiting
- CORS configuration
- Helmet security headers
- Environment configuration module (Joi/Zod validation)
- Logging (structured JSON, pino via Fastify)
- OpenTelemetry instrumentation (skeleton)
- Generic object storage abstraction module (`StorageService` interface + local filesystem / MinIO driver) to support early document uploads
- Docker and docker-compose for local development
- Basic unit test scaffolding

**Exit criteria:**
- App starts with `npm run dev`.
- `/health` returns 200.
- `/api` returns Swagger UI.
- All lint and type checks pass.
- Docker builds successfully.

---

### Phase 3 — PostgreSQL + Prisma
**Branch:** `feature/phase-3-database`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 2

**Deliverables:**
- Prisma schema (initial — Identity, User, PatientProfile, DoctorProfile, AdminProfile)
- Database connection and Prisma client module
- Initial migration with versioned raw SQL migration support for PostgreSQL advanced extensions (pgvector, GiST exclusion constraints, range types, partial indexes)
- Database health check
- Seed scripts for development (synthetic data only)
- Database transaction helper
- Connection pooling configuration (PgBouncer standardized for staging/prod; direct connection for local dev)
- Redis connection module
- Test database configuration
- Migration CI step

**Exit criteria:**
- Prisma migrations run cleanly.
- Database health check passes.
- Seed data loads without error.
- No real patient data in development.

---

### Phase 4 — Identity + Authentication
**Branch:** `feature/phase-4-identity-auth`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 3

**Deliverables:**
- User identity model (immutable core User)
- Public identifier generation (PAT-XXXXXXXX, DOC-XXXXXXXX)
- Registration flow (patient and doctor)
- Login (email + password minimum; OTP DECISION REQUIRED)
- JWT access token + refresh token
- Refresh token rotation
- Token blacklist/revocation (Redis-backed)
- Session model
- Device model
- Logout (single device, all devices)
- Password policy enforcement
- Rate limiting on auth endpoints
- Auth audit logging
- Unit and integration tests

**NOTE:** Do NOT implement social/OAuth in Phase 4 unless it becomes a blocker. Mark as DEFERRED.

**Exit criteria:**
- Registration works.
- Login returns valid JWT.
- Refresh token rotation works.
- Logout invalidates tokens.
- Auth audit logs are written.

---

### Phase 5 — Authorization + Security
**Branch:** `feature/phase-5-authorization`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 4

**Deliverables:**
- RBAC guard (Role-based access control)
- Resource-level access guard
- Ownership guard
- Consent-aware access guard (skeleton — full consent in Phase 10)
- CareRelationship-aware guard (skeleton — full relationships in Phase 10)
- Audit interceptor (logs who accessed what)
- Security event logging
- Input sanitization
- SQL injection protection (Prisma provides this, but verify)
- Security headers audit
- Secrets management documentation
- Unit tests for guards

**Exit criteria:**
- Unauthorized requests are rejected with 401/403.
- Audit logs record access events.
- Resource owner can access own data; non-owner cannot.

---

### Phase 6 — Patient Domain
**Branch:** `feature/phase-6-patient-domain`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 5

**Deliverables:**
- PatientProfile CRUD
- Patient-specific API endpoints
- Patient public identifier (PAT-XXXXXXXX)
- Patient search (admin only)
- Patient data export (DECISION REQUIRED — right to data portability)
- Patient deletion / anonymization policy (LEGAL REVIEW REQUIRED)
- Unit and integration tests

---

### Phase 7 — Doctor Platform
**Branch:** `feature/phase-7-doctor-platform`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 5

**Deliverables:**
- DoctorProfile CRUD
- Doctor public identifier (DOC-XXXXXXXX)
- Doctor discovery API (public listing of verified doctors)
- Relational Specialty model (`specialties`, `doctor_specialties`) for managed medical taxonomies
- Relational Language model (`languages`, `doctor_languages`) for searchable multi-language profiles
- Doctor search and filter
- Doctor professional registration record (separate from MANVIA ID)
- Unit and integration tests

---

### Phase 8 — Doctor Verification
**Branch:** `feature/phase-8-doctor-verification`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 7

**Deliverables:**
- Doctor verification lifecycle state machine:
  - `DRAFT → SUBMITTED → UNDER_REVIEW → MORE_INFORMATION_REQUIRED → VERIFIED / REJECTED`
  - `VERIFIED → SUSPENDED / EXPIRED`
- Verification document upload using the generic `StorageService` abstraction introduced in Phase 2
- Admin review workflow (audited manual verification queue)
- Notification on status change (skeleton, full notifications in Phase 18)
- Audit trail for all verification state changes
- A doctor cannot self-approve
- Unit and integration tests

---

### Phase 9 — Availability + Consultation Offers
**Branch:** `feature/phase-9-availability`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 8

**Deliverables:**
- Doctor availability model (slots, recurring, exceptions)
- Availability CRUD for doctors
- Consultation offer model (30 min, 45 min, first consultation, follow-up, etc.)
- Consultation offer CRUD
- Public availability query (patient-facing)
- Timezone handling strategy (DECISION REQUIRED — store UTC, display local)
- Slot hold mechanism (prevent race conditions)
- Unit and integration tests

---

### Phase 10 — Care Relationship + Consent
**Branch:** `feature/phase-10-care-consent`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 9

**Deliverables:**
- CareRelationship model with full lifecycle
- Consent model (grant, review, revoke, expiry, scope, purpose)
- Consent enforcement in authorization guards (completing skeleton from Phase 5)
- CareRelationship enforcement in authorization guards
- Consent audit log
- Unit and integration tests

---

### Phase 11 — Wellness Engine
**Branch:** `feature/phase-11-wellness`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 10

**Deliverables:**
- Wellness check-in model (mood, stress, sleep, energy)
- Journal model
- Wellness trends API
- Wellness insights (rule-based, NOT diagnostic)
- Disclaimer: wellness insights are not medical advice
- Unit and integration tests

---

### Phase 12 — Health Records + Health Timeline
**Branch:** `feature/phase-12-health-records`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 10

**Deliverables:**
- Health record model (lab report, prescription, consultation summary, uploaded document)
- Secure file upload to object storage (via abstraction)
- Access control on records (consent-enforced)
- Record sharing model
- Health timeline model
- Timeline event types (wellness, appointment, consultation, record upload, consent event, etc.)
- Timeline API
- Audit log for record access
- Retention policy skeleton (LEGAL REVIEW REQUIRED)
- Unit and integration tests

---

### Phase 13 — Pre-consultation + Appointment Engine
**Branch:** `feature/phase-13-appointments`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 12

**Deliverables:**
- Authoritative appointment lifecycle state machine:
  - Happy Path: `RESERVED → REQUESTED → CONFIRMED → IN_PROGRESS → COMPLETED`
  - Cancellation / Terminal: `CANCELLED`, `DECLINED`, `EXPIRED`, `NO_SHOW`
  - Distinct Slot Availability states: `AVAILABLE`, `HELD_IN_RESERVATION`, `BOOKED`
- Pre-consultation intake form model
- Appointment reservation & hold mechanism (10-minute TTL)
- Payment abstraction (`PaymentService` interface) + Mock/Deferred Payment Provider & Event Simulator (enabling reservation hold, payment simulation, and appointment confirmation testing prior to Phase 19)
- Doctor accept / decline flow
- Appointment cancellation with policy enforcement
- No-show handling
- Double-booking prevention: PostgreSQL composite exclusion constraints (`EXCLUDE USING gist`) as the authoritative consistency boundary, backed by Redis distributed locks (`Redlock`) for load shedding
- Appointment audit log
- Unit and integration tests

**CRITICAL:** Double-booking prevention requires database-level exclusion constraints in PostgreSQL. Redis distributed locking acts as an optimization to shed database load, not a substitute for ACID consistency boundaries.

---

### Phase 14 — Waitlist + Cancellation + Refund
**Branch:** `feature/phase-14-waitlist-refund`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 13

**Deliverables:**
- Waitlist model
- Waitlist queue management
- Cancellation policy model
- Refund eligibility logic (policy-based calculation and simulated refund events; actual external payment gateway integration executed in Phase 19)
- Unit and integration tests

---

### Phase 15 — AI Companion Core
**Branch:** `feature/phase-15-ai-companion`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 13 (for escalation pathway)

**Deliverables:**
- AI provider abstraction (AIProvider, AIModel, AIRequest, AIResponse, AIStream)
- Conversation model
- Message model
- Text conversation API
- System instruction / prompt layer
- Multilingual support skeleton
- AI memory model (short-term session)
- Feedback model
- AI always identified as AI (never as human doctor)
- Basic safety content filter
- Human escalation trigger
- Unit and integration tests

---

### Phase 16 — Medical RAG + AI Safety + AI Memory
**Branch:** `feature/phase-16-ai-advanced`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 15

**Deliverables:**
- Medical document ingestion pipeline (for RAG)
- pgvector integration for embeddings (using raw SQL migration scripts for pgvector indexing)
- Retrieval pipeline
- RAG-augmented response generation
- Persistent AI memory model
- AI safety engine (risk detection, crisis pathway with SLA measured from VAD utterance completion)
- Safety event logging
- Emergency resource configuration (geography-verified — LEGAL REVIEW REQUIRED)
- AI observability (token usage, cost tracking, latency)
- Provider failover skeleton
- Unit and integration tests

---

### Phase 17 — Realtime Voice + Avatar + Human Handoff
**Branch:** `feature/phase-17-realtime`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 16

**Deliverables:**
- WebSocket connection management
- Voice activity detection (VAD) integration (DECISION REQUIRED for provider)
- Streaming audio pipeline supporting low-latency native realtime audio (direct WebSocket / WebRTC where supported)
- Barge-in handling (< 150ms playback buffer cancellation)
- AI voice state machine (IDLE, LISTENING, PROCESSING, SPEAKING, INTERRUPTED, PAUSED, MUTED, RECONNECTING, ERROR, HANDOFF_TO_HUMAN)
- Avatar integration (DECISION REQUIRED for provider)
- Human handoff protocol (AI to doctor appointment flow)
- Reconnection handling
- Latency measurement instrumentation:
  - VAD endpoint detection latency (200–300ms window)
  - Time to first response / first audio token latency (p50 target: < 600ms, p95 target: < 1000ms under benchmarked network conditions)
  - Barge-in interruption cancellation latency (< 150ms)
- Unit and integration tests

---

### Phase 18 — Notifications
**Branch:** `feature/phase-18-notifications`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 4 (auth context for delivery)

**NOTE:** Notifications is cross-cutting but cannot be fully implemented until the core entities (appointments, consultations, etc.) exist. Implement the notification engine in Phase 18 and back-fill events from earlier phases.

**Deliverables:**
- Notification model
- In-app notification delivery
- Push notification integration (DECISION REQUIRED for provider)
- Email notification integration (DECISION REQUIRED for provider)
- SMS notification integration (DECISION REQUIRED for provider)
- Notification preferences model
- Notification audit log
- Privacy: notifications must not expose sensitive health content in push/SMS payloads
- Unit and integration tests

---

### Phase 19 — Payments + Billing + Payouts
**Branch:** `feature/phase-19-payments`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** Phase 13 (appointments), Phase 14 (refunds)

**Deliverables:**
- Payment gateway integration (DECISION REQUIRED for provider)
- Payment intent model
- Payment confirmation flow
- Refund flow
- Invoice model
- Doctor payout model
- Webhook handling (idempotent)
- Cancellation policy enforcement
- No-show fee handling
- Financial audit log
- Unit and integration tests

**NOTE:** Payment integration has significant legal and financial compliance implications. LEGAL REVIEW REQUIRED before implementation.

---

### Phase 20 — Admin + Production Hardening + Final Audit
**Branch:** `feature/phase-20-production`
**Owner:** DECISION REQUIRED
**Status:** PLANNED
**Depends on:** All previous phases

**Deliverables:**
- Admin module (user management, doctor verification management, system configuration)
- Production environment configuration
- Security audit
- Penetration testing preparation (DECISION REQUIRED for vendor)
- Performance testing
- Final API documentation review
- Disaster recovery runbook validation
- Production deployment runbook
- Monitoring and alerting configuration
- Final compliance review preparation (LEGAL REVIEW REQUIRED)
- Final backend audit checklist sign-off

---

## Frontend Phases (Planning Level Only)

Frontend phases are to be defined separately once the mobile/web framework decision is made (OD-010).

At minimum, frontend must cover:
- Authentication flows
- Patient portal (AI companion, wellness, appointments, health records, timeline)
- Doctor portal (availability, appointments, consultations, verification)
- Admin portal
- Realtime AI voice and avatar experience
- Notifications
- Responsive web and native mobile

DEFERRED: Frontend phase numbering and ownership to be defined after OD-010 and OD-011 are resolved.

---

*Updated at the start of each phase by the phase owner.*
