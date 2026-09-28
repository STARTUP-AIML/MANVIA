# MANVIA — API Architecture Overview

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. API Design Philosophy

### ADR-008: REST over GraphQL

**Problem:** Some complex healthcare platforms consider GraphQL for flexible querying.

**Decision:** REST API with OpenAPI 3.x documentation.

**Rationale for REST in healthcare context:**
- Every endpoint is explicitly definable with a security policy. With GraphQL, field-level consent enforcement is complex.
- REST endpoints are easier to rate-limit, version, and audit.
- OpenAPI tooling generates SDK clients, documentation, and validation automatically.
- REST is team-familiar; GraphQL learning curve adds no clear benefit.

**Trade-off:** Over-fetching is possible. Mitigated by sparse fieldsets and well-designed response shapes.

---

## 2. Base URL

```
Production:   https://api.manvia.com/api/v1
Staging:      https://api-staging.manvia.com/api/v1
Development:  http://localhost:3000/api/v1
```

---

## 3. API Conventions

### 3.1 HTTP Status Codes

| Code | Meaning | Usage |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST creating a resource |
| 204 | No Content | Successful DELETE or action with no response body |
| 400 | Bad Request | Validation failure, malformed request |
| 401 | Unauthorized | Not authenticated or token expired |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate request (appointment double-booking, etc.) |
| 422 | Unprocessable Entity | Business rule violation (doctor not verified, etc.) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error (always logged, never reveals internals) |
| 503 | Service Unavailable | Planned maintenance or circuit breaker open |

### 3.2 Standard Error Format

```json
{
  "statusCode": 400,
  "error": "VALIDATION_FAILED",
  "message": "Request validation failed",
  "details": [
    {
      "field": "email",
      "message": "must be a valid email address"
    }
  ],
  "requestId": "req_01HXYZ",
  "timestamp": "2026-09-28T16:34:00.000Z"
}
```

### 3.3 Pagination

Cursor-based pagination for list endpoints (preferred for healthcare timelines and large datasets):

**Request:**
```
GET /api/v1/health-records?limit=20&cursor=eyJpZCI6IjEyMyJ9
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "cursor": "eyJpZCI6IjEyMyJ9",
    "nextCursor": "eyJpZCI6IjE0MyJ9",
    "hasMore": true
  }
}
```

Offset pagination only for admin list views where cursor pagination is impractical:

```json
{
  "data": [...],
  "pagination": {
    "total": 1250,
    "page": 3,
    "limit": 20,
    "totalPages": 63
  }
}
```

### 3.4 Filtering and Sorting

```
GET /api/v1/doctors?specialty=cardiology&language=hi&sortBy=name&sortOrder=asc
GET /api/v1/appointments?status=CONFIRMED&from=2026-09-01&to=2026-09-30
```

All filter parameters are documented per endpoint in OpenAPI spec.

### 3.5 Request IDs and Correlation

Every response includes:
```
X-Request-ID: req_01HXYZ        (generated per request)
X-Correlation-ID: corr_01HXYZ  (propagated through the entire call chain)
```

Clients should include `X-Request-ID` in support requests.

### 3.6 Idempotency

For mutating requests that must be idempotent (payment creation, appointment booking):

```
POST /api/v1/appointments/requests
Idempotency-Key: client_generated_uuid_v4
```

If the same key is sent twice, the second request returns the result of the first without re-processing.

### 3.7 Authentication Header

```
Authorization: Bearer <access_token>
```

### 3.8 API Versioning Strategy

- Version prefix in URL: `/api/v1/`
- Additive changes (new optional fields, new endpoints) are non-breaking and do not require a version bump.
- Breaking changes (removed fields, changed behavior) require a new major version: `/api/v2/`.
- v1 is maintained for a minimum of 12 months after v2 release.
- Deprecation notices are communicated via `Deprecation` and `Sunset` response headers.

---

## 4. API Endpoint Map

### 4.1 Health Check

```
GET    /health                          -- Public health check
GET    /api/v1/health                   -- Authenticated health check (includes DB, Redis)
```

### 4.2 Authentication

```
POST   /api/v1/auth/register            -- Patient or doctor registration
POST   /api/v1/auth/login               -- Login with email + password
POST   /api/v1/auth/refresh             -- Refresh access token
POST   /api/v1/auth/logout              -- Logout current session
POST   /api/v1/auth/logout/all          -- Logout all sessions
POST   /api/v1/auth/verify-email        -- Email verification
POST   /api/v1/auth/resend-verification -- Resend verification email
POST   /api/v1/auth/forgot-password     -- Initiate password reset
POST   /api/v1/auth/reset-password      -- Complete password reset
```

### 4.3 Patient Endpoints

```
GET    /api/v1/patients/me              -- Get own patient profile
PATCH  /api/v1/patients/me             -- Update own patient profile
DELETE /api/v1/patients/me             -- Account deletion request (LEGAL REVIEW REQUIRED)

GET    /api/v1/patients/:patientId      -- Admin only
```

### 4.4 Doctor Endpoints

```
GET    /api/v1/doctors                  -- Public: list verified doctors
GET    /api/v1/doctors/:doctorId        -- Public: doctor profile
GET    /api/v1/doctors/me               -- Authenticated doctor: own profile
PATCH  /api/v1/doctors/me              -- Authenticated doctor: update profile

GET    /api/v1/doctors/:doctorId/availability -- Public: available slots
GET    /api/v1/doctors/:doctorId/offers       -- Public: consultation offers
```

### 4.5 Doctor Verification

```
GET    /api/v1/doctor-verification/me          -- Doctor: own verification status
POST   /api/v1/doctor-verification/submit      -- Doctor: submit verification
POST   /api/v1/doctor-verification/documents   -- Doctor: upload verification documents
GET    /api/v1/doctor-verification/:id         -- Admin: get submission
PATCH  /api/v1/doctor-verification/:id/review  -- Admin: update status
POST   /api/v1/doctor-verification/:id/approve -- Admin: approve
POST   /api/v1/doctor-verification/:id/reject  -- Admin: reject
POST   /api/v1/doctor-verification/:id/request-info -- Admin: request more info
POST   /api/v1/doctor-verification/:id/suspend -- Admin: suspend
```

### 4.6 Availability

```
GET    /api/v1/availability             -- Doctor: own availability
POST   /api/v1/availability/slots       -- Doctor: create slot
PATCH  /api/v1/availability/slots/:id  -- Doctor: update slot
DELETE /api/v1/availability/slots/:id  -- Doctor: remove slot
POST   /api/v1/availability/exceptions  -- Doctor: add exception (day off, etc.)
```

### 4.7 Consultation Offers

```
GET    /api/v1/consultation-offers      -- Doctor: own offers
POST   /api/v1/consultation-offers      -- Doctor: create offer
PATCH  /api/v1/consultation-offers/:id -- Doctor: update offer
DELETE /api/v1/consultation-offers/:id -- Doctor: deactivate offer
```

### 4.8 Appointments

```
POST   /api/v1/appointments/holds           -- Patient: hold a slot
DELETE /api/v1/appointments/holds/:holdId   -- Patient: release hold
POST   /api/v1/appointments/requests        -- Patient: request appointment (Idempotency-Key required)
GET    /api/v1/appointments                 -- Patient or Doctor: own appointments
GET    /api/v1/appointments/:id             -- Get appointment details
POST   /api/v1/appointments/:id/accept      -- Doctor: accept appointment
POST   /api/v1/appointments/:id/decline     -- Doctor: decline
POST   /api/v1/appointments/:id/cancel      -- Patient or Doctor: cancel
POST   /api/v1/appointments/:id/complete    -- Doctor: mark completed
POST   /api/v1/appointments/:id/no-show     -- Doctor: mark no-show
POST   /api/v1/appointments/:id/reschedule  -- DECISION REQUIRED: full flow
```

### 4.9 Consultations

```
GET    /api/v1/consultations/:id             -- Get consultation
POST   /api/v1/consultations/:id/summary     -- Doctor: add consultation summary
GET    /api/v1/consultations/:id/summary     -- Patient or Doctor: get summary
```

### 4.10 Care Relationships

```
GET    /api/v1/care-relationships            -- Patient: own relationships
GET    /api/v1/care-relationships/:id        -- Get relationship
POST   /api/v1/care-relationships/:id/end    -- End a care relationship
```

### 4.11 Consent

```
GET    /api/v1/consents                      -- Patient: own consents
POST   /api/v1/consents                      -- Patient: grant consent
GET    /api/v1/consents/:id                  -- Get consent
DELETE /api/v1/consents/:id                  -- Patient: revoke consent
```

### 4.12 Wellness

```
POST   /api/v1/wellness/check-ins            -- Patient: submit check-in
GET    /api/v1/wellness/check-ins            -- Patient: own check-ins
GET    /api/v1/wellness/trends               -- Patient: trend analysis
POST   /api/v1/wellness/journals             -- Patient: journal entry
GET    /api/v1/wellness/journals             -- Patient: own journals
```

### 4.13 Health Records

```
POST   /api/v1/health-records/upload         -- Patient or Doctor: upload record
GET    /api/v1/health-records                -- Patient: own records
GET    /api/v1/health-records/:id            -- Get record metadata
GET    /api/v1/health-records/:id/download   -- Get signed download URL
POST   /api/v1/health-records/:id/share      -- Patient: share with doctor
DELETE /api/v1/health-records/:id            -- Patient: soft delete
```

### 4.14 Health Timeline

```
GET    /api/v1/health-timeline               -- Patient: own timeline
GET    /api/v1/health-timeline/events/:id    -- Get timeline event
```

### 4.15 AI Companion

```
POST   /api/v1/ai/conversations              -- Patient: start conversation
GET    /api/v1/ai/conversations              -- Patient: own conversations
GET    /api/v1/ai/conversations/:id          -- Get conversation
POST   /api/v1/ai/conversations/:id/messages -- Patient: send message
POST   /api/v1/ai/conversations/:id/stream   -- Patient: send message (streaming)
POST   /api/v1/ai/conversations/:id/end      -- End conversation
POST   /api/v1/ai/handoff                    -- Trigger human escalation
POST   /api/v1/ai/feedback                   -- Patient: feedback on AI response
```

### 4.16 Payments

```
POST   /api/v1/payments/intent               -- Create payment intent (Idempotency-Key required)
POST   /api/v1/payments/confirm              -- Confirm payment
GET    /api/v1/payments/:id                  -- Get payment status
GET    /api/v1/payments                      -- Patient: own payments
POST   /api/v1/payments/webhooks/:gateway    -- Incoming payment webhook (no auth; HMAC verification)
GET    /api/v1/invoices                      -- Patient: own invoices
GET    /api/v1/invoices/:id                  -- Get invoice
GET    /api/v1/invoices/:id/download         -- Signed PDF download URL
```

### 4.17 Notifications

```
GET    /api/v1/notifications                 -- User: own notifications
PATCH  /api/v1/notifications/:id/read        -- Mark notification read
POST   /api/v1/notifications/read-all        -- Mark all read
GET    /api/v1/notifications/preferences     -- Get preferences
PATCH  /api/v1/notifications/preferences     -- Update preferences
```

### 4.18 Admin

```
GET    /api/v1/admin/users                   -- List all users
GET    /api/v1/admin/users/:id               -- Get user
PATCH  /api/v1/admin/users/:id/status        -- Suspend/activate user
GET    /api/v1/admin/doctors/pending         -- List doctors pending verification
GET    /api/v1/admin/audit-logs              -- Query audit logs
GET    /api/v1/admin/safety-events           -- Query AI safety events
POST   /api/v1/admin/system-config           -- Update system config
```

---

## 5. WebSocket Events

### 5.1 AI Voice Stream

Connection: `wss://api.manvia.com/api/v1/ai/voice`

Events (server to client):
```json
{ "type": "AUDIO_CHUNK", "data": "<base64>" }
{ "type": "STATE_CHANGE", "state": "SPEAKING" }
{ "type": "TRANSCRIPT", "text": "...", "role": "ASSISTANT" }
{ "type": "SAFETY_FLAG", "level": "HIGH" }
{ "type": "HANDOFF_INITIATED" }
```

Events (client to server):
```json
{ "type": "AUDIO_CHUNK", "data": "<base64>" }
{ "type": "INTERRUPT" }
{ "type": "END_VOICE" }
```

### 5.2 Notifications

Connection: `wss://api.manvia.com/api/v1/notifications/stream`

Events (server to client):
```json
{ "type": "NOTIFICATION", "id": "...", "category": "APPOINTMENT", "message": "Your appointment is confirmed." }
{ "type": "APPOINTMENT_STATUS", "appointmentId": "...", "status": "CONFIRMED" }
```

---

## 6. OpenAPI Documentation

The Swagger UI is available at:
- Development: `http://localhost:3000/api/docs`
- Staging: `https://api-staging.manvia.com/api/docs` (authentication required)
- Production: OpenAPI spec is available; Swagger UI is disabled in production for security.

---

*Endpoint implementation begins in Phase 4 (auth) and subsequent domain phases. This document defines the contract.*
