# Phase 14 — Waitlist, Appointment Cancellation & Internal Refund Domain

> **Module Architecture & Specification Reference**
> **Current Version:** `1.0.0-phase14`
> **Status:** Backend Implementation Complete

---

## 1. Domain Overview

Phase 14 extends the Phase 13 appointment and availability platform with three tightly integrated modules:
1. **Appointment Cancellation Domain (14A)**: Policy-driven cancellation workflow with actor classification (`PATIENT`, `DOCTOR`, `ADMIN`, `SYSTEM`), deterministic cancellation fee calculations, slot release, and immediate cascading.
2. **Internal Refund Domain (14B)**: Provider-agnostic refund lifecycle (`REQUESTED`, `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELLED`), idempotent transaction tracking (`idempotency_key`), safe monetary representation (`Decimal(10,2)`), and preparation for Phase 19 gateway integration without premature coupling.
3. **Appointment Waitlist Domain (14C)**: Patient queueing for fully booked physicians or specific consultation offers, priority ordering (`priority DESC, joinedAt ASC`), slot matching on cancellation, temporary reservation holds (30 minutes), and acceptance/expiration transitions.

---

## 2. Cancellation Policy Specification

Commercial rules are strictly codified from `MANVIA-DOCS/09_BUSINESS/Billing.md` into the `CancellationPolicyService`:

| Scenario / Actor | Advance Notice Window | Refund Eligibility | Refund Type | Cancellation Fee |
|---|---|---|---|---|
| **Patient** | > 24 hours prior | 100% Refund | `FULL_REFUND_ADVANCE_NOTICE` | 0% |
| **Patient** | 2 hours – 24 hours prior | 50% Refund | `PARTIAL_REFUND_STANDARD_WINDOW` | 50% |
| **Patient** | < 2 hours prior | 0% Refund | `NON_REFUNDABLE_LATE_CANCELLATION` | 100% |
| **Patient** | Pre-confirmation (`REQUESTED`/`RESERVED`) | 100% Refund | `FULL_REFUND_PRE_CONFIRMATION` | 0% |
| **Doctor** | Any time | 100% Refund to Patient | `FULL_REFUND_PROVIDER_INITIATED` | 0% |
| **Admin** | Any time (Override) | 100% Refund to Patient | `FULL_REFUND_PROVIDER_INITIATED` | 0% |
| **System** | Any time | 100% Refund to Patient | `FULL_REFUND_PROVIDER_INITIATED` | 0% |

Terminal statuses (`COMPLETED`, `IN_PROGRESS`, `NO_SHOW`, `CANCELLED`, `DECLINED`, `EXPIRED`) cannot be cancelled and reject requests atomically.

---

## 3. Waitlist Lifecycle & Deterministic Ordering

### Lifecycle Transitions
```
   [ACTIVE] 
      │ (Slot freed via cancellation or doctor opening)
      ▼
   [OFFERED]  ── (Exceeds hold timeout) ──► [EXPIRED]
      │                                       │
      ├────── (Declined by patient) ──────────► [DECLINED]
      │
      ▼ (Accepted by patient)
   [FULFILLED] ──► (AppointmentsService confirms reserved appointment)
```
- In addition, an entry in `ACTIVE` or `OFFERED` status may transition to `CANCELLED` if the patient leaves the queue.

### Deterministic PostgreSQL Queueing
Queue ordering is enforced via indexed composite ordering:
```sql
CREATE INDEX "waitlist_entries_doctor_id_status_priority_joined_at_idx"
ON "waitlist_entries"("doctor_id", "status", "priority" DESC, "joined_at" ASC);
```

When an appointment slot becomes available:
1. `AppointmentsService` triggers `WaitlistService.matchAndOfferSlot()`.
2. Eligible entries are filtered by physician ID, offer type, and preferred date windows.
3. Top candidate is selected and their entry is marked `OFFERED` with a 30-minute hold reservation.
4. A temporary reservation (`SlotReservationState.HELD_IN_RESERVATION`) is created in the appointment domain.
5. If the patient accepts, the appointment is marked `CONFIRMED` and the waitlist entry becomes `FULFILLED`.
6. If the patient declines or the offer expires, the hold is released and cascaded immediately to the next candidate.

---

## 4. Refund Lifecycle & Idempotency Architecture

### Lifecycle
```
[REQUESTED] ──► [PROCESSING] ──► [SUCCEEDED]
                       │
                       └──► [FAILED]
```

### Idempotency Protection
- Unique database constraint: `CREATE UNIQUE INDEX "refunds_idempotency_key_key" ON "refunds"("idempotency_key");`
- Repetitive cancellation requests or duplicate webhooks targeting the same appointment use unique idempotency keys (e.g. `cancel_patient_{appointmentId}`).
- If an existing record with the key exists, the service returns the existing record without creating duplicate financial transactions.

---

## 5. REST API Endpoints Added

### Appointment Cancellation Endpoints
- `POST /api/v1/appointments/:appointmentId/cancel` — Patient-initiated cancellation with policy evaluation.
- `GET  /api/v1/appointments/:appointmentId/cancellation` — View cancellation record, policy breakdown, and refund status (Patient).
- `POST /api/v1/doctor/appointments/:appointmentId/cancel` — Doctor-initiated cancellation with 100% refund.
- `GET  /api/v1/doctor/appointments/:appointmentId/cancellation` — View cancellation details (Doctor).

### Waitlist Endpoints
- `POST   /api/v1/waitlist` — Join waitlist for a doctor and offer (`PATIENT`).
- `GET    /api/v1/waitlist` — List paginated waitlist entries for authenticated patient (`PATIENT`).
- `GET    /api/v1/waitlist/:id` — View single waitlist entry with queue position (`PATIENT`).
- `DELETE /api/v1/waitlist/:id` — Leave waitlist / cancel waitlist entry (`PATIENT`).
- `POST   /api/v1/waitlist/:id/accept` — Accept slot offer and finalize booking (`PATIENT`).
- `POST   /api/v1/waitlist/:id/decline` — Decline slot offer and cascade to next candidate (`PATIENT`).
- `GET    /api/v1/doctor/waitlist` — List paginated waitlist entries for assigned doctor (`DOCTOR`).

### Refund Endpoints
- `GET /api/v1/refunds` — List refunds for authenticated patient (`PATIENT`).
- `GET /api/v1/refunds/:id` — View refund details by UUID or public ID (`REF-XXXXXXXX`) with role verification (`PATIENT`, `DOCTOR`, `ADMIN`).

---

## 6. Audit & HIPAA Privacy Protections

All sensitive domain actions are logged through the structured audit system (`RefundAuditService`, `WaitlistAuditService`, `AppointmentAuditService`):
- `APPOINTMENT_CANCELLED`
- `REFUND_REQUESTED`
- `REFUND_SUCCEEDED`
- `REFUND_FAILED`
- `REFUND_ACCESSED`
- `WAITLIST_JOINED`
- `WAITLIST_OFFERED`
- `WAITLIST_ACCEPTED`
- `WAITLIST_DECLINED`
- `WAITLIST_FULFILLED`
- `WAITLIST_CANCELLED`
- `WAITLIST_EXPIRED`

Audit payloads sanitize clinical intake and PHI, exposing only resource IDs, public identifiers, timestamps, actor roles, and monetary amounts.
