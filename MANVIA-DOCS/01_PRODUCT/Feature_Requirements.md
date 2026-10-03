# MANVIA — Feature Requirements & Acceptance Matrix

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Traceability Matrix Overview

This document defines functional requirements (FR) and non-functional requirements (NFR) mapped to Phase Roadmap deliverables. Every pull request in Phases 1 through 20 must satisfy the corresponding acceptance criteria defined below.

---

## 2. Functional Requirements by Domain

### Domain 1: Identity, Authentication & Consent (Phases 4, 5, 10)

| Requirement ID | Title | Description | Acceptance Criteria |
|---|---|---|---|
| **FR-AUTH-01** | Multi-Role User Anchor | One physical user account can maintain both Patient and Doctor profile roles. | • System models `User` as root identity with 1:1 or 1:N role bindings.<br>• Session payload differentiates current active role context. |
| **FR-AUTH-02** | Secure Refresh Rotation | Issue short-lived access JWT (15 min) and single-use rotating refresh tokens (7 days). | • Reusing an already invalidated refresh token triggers family invalidation and terminates all active user sessions.<br>• Token stored with hashed fingerprint. |
| **FR-CONS-01** | Granular Patient Consent | Patient must grant explicit, revokable consent before a doctor or caregiver accesses health records. | • Doctor cannot query records without an active `CareRelationship` or confirmed appointment consent token.<br>• Revocation takes effect immediately for future reads. |

---

### Domain 2: Doctor Platform & Verification (Phases 7, 8, 9)

| Requirement ID | Title | Description | Acceptance Criteria |
|---|---|---|---|
| **FR-DOC-01** | Professional Credential Intake | Collect medical registration number, state council, degrees, and document uploads. | • S3 documents uploaded using presigned URLs with strict MIME type validation (PDF, JPG, PNG only, max 10MB).<br>• Initial state defaults to `PENDING_VERIFICATION`. |
| **FR-DOC-02** | Administrator Verification Gate | Only verified doctors appear in public directory search or can publish availability schedules. | • Unverified doctor calling `POST /api/v1/doctor/availability` receives HTTP 403 Forbidden.<br>• Audit trail logs admin ID, timestamp, and notes. |
| **FR-DOC-03** | Conflict-Free Slot Generation | Support recurring and ad-hoc consultation availability with custom buffer times. | • Overlapping slots for the same doctor are rejected at DB schema level (exclusion constraint or unique slot window). |

---

### Domain 3: Appointment & Consultation Engine (Phases 13, 14)

| Requirement ID | Title | Description | Acceptance Criteria |
|---|---|---|---|
| **FR-APT-01** | Slot Locking & Anti-Double-Booking | Two patients booking the same doctor slot concurrently must never result in dual confirmations. | • Slot reservation acquires an atomic distributed lock via Redis with a 10-minute TTL.<br>• PostgreSQL composite exclusion constraints enforce the authoritative consistency boundary.<br>• Second concurrent request receives HTTP 409 Conflict with remaining slot alternatives. |
| **FR-APT-02** | State Machine Rigor | Appointment state follows: `RESERVED` -> `REQUESTED` -> `CONFIRMED` -> `IN_PROGRESS` -> `COMPLETED`. Terminal branches: `CANCELLED`, `DECLINED`, `EXPIRED`, `NO_SHOW`. Slot availability (`AVAILABLE`, `HELD_IN_RESERVATION`, `BOOKED`) is tracked distinctly. | • Disallowed transitions (e.g. `COMPLETED` -> `CANCELLED`) throw explicit domain exceptions.<br>• Unconfirmed reservations transition to `EXPIRED` at 10-minute TTL expiration.<br>• Doctor declines move state to `DECLINED` and release slot to `AVAILABLE`. |
| **FR-APT-03** | Automated Waitlist Promotion | When an appointment is cancelled, the first eligible waitlisted patient is notified and given an exclusive 15-minute booking window. | • Cron/Worker evaluates waitlist queue and fires high-priority push notification and SMS. |

---

### Domain 4: Wellness Tracking & Health Timeline (Phases 11, 12)

| Requirement ID | Title | Description | Acceptance Criteria |
|---|---|---|---|
| **FR-WELL-01** | Multi-Metric Check-ins | Log mood (1-5), stress (1-5), sleep hours, energy, and free-text reflection. | • Idempotency key prevents duplicate check-ins within the same hour.<br>• Aggregated analytics endpoint computes rolling 7-day and 30-day moving averages. |
| **FR-REC-01** | Health Record Encryption & Metadata | Store lab reports, clinical notes, and prescriptions with AES-256-GCM metadata encryption. | • File storage path contains zero PII.<br>• Access attempts are logged in `AuditLog` table with IP and client user agent. |
| **FR-TIME-01** | Longitudinal Unified Timeline | Chronologically merge doctor consultations, lab results, prescriptions, and wellness milestones. | • Cursor-based pagination (`limit=20`, `before_cursor`).<br>• Response time under 150ms for 1,000+ historical events. |

---

### Domain 5: AI Companion, Safety & Realtime Audio (Phases 15, 16, 17)

| Requirement ID | Title | Description | Acceptance Criteria |
|---|---|---|---|
| **FR-AI-01** | Non-Diagnostic Boundary Guard | The AI companion must never diagnose illnesses or prescribe controlled medications. | • Pre-flight and post-flight safety classifiers intercept diagnostic claims.<br>• Enforces mandatory non-diagnostic disclaimers. |
| **FR-AI-02** | Realtime Crisis Intercept | Severe self-harm or psychiatric crisis triggers hardcoded hotline response within 350ms of VAD endpointing / utterance completion. | • Bypass LLM generation entirely on crisis keyword/semantic vector hit.<br>• Dispatch hardcoded crisis response and present 988/local hotline cards within 350ms of detected utterance completion. |
| **FR-AI-03** | Low-Latency Full-Duplex Voice | Bidirectional audio streaming over WebSocket / native WebRTC engineered for natural conversational cadence. | • VAD silence detection window 200–300ms.<br>• Benchmarked target latency: Time to first audio token (p50 < 600ms, p95 < 1000ms on broadband/4G).<br>• Client audio interruption (barge-in) cancels server playback buffer in < 150ms. |

---

## 3. Non-Functional Requirements (NFR)

* **NFR-PERF-01 (API Latency):** 99% of non-AI REST API requests must respond in under 200ms at peak load (500 RPS).
* **NFR-SEC-01 (Data at Rest):** Database columns containing sensitive PHI (notes, diagnostic tags) must utilize AES-256 field-level encryption.
* **NFR-SEC-02 (TLS & Transport):** All external traffic must terminate on TLS 1.3 with HSTS enabled (max-age=31536000).
* **NFR-AVAIL-01 (Uptime):** Backend architecture designed for 99.95% availability with multi-AZ failover for PostgreSQL and Redis.
* **NFR-COMP-01 (Auditability):** Every administrative write and clinical record access must generate an immutable audit log retained for 7 years.
