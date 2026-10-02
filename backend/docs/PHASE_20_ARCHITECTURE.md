# MANVIA Phase 20 — Admin Platform, Production Hardening & Final Backend Audit

> Version: 0.1.0-phase20  
> Status: PHASE 20 COMPLETE — FINAL BACKEND RELEASE  
> Date: 2026-09-30  
> Scope: Platform Administration, Governance, Security Hardening, Production Configuration, Data Integrity & Operational Observability.

---

## 1. Architectural Executive Summary

Phase 20 delivers the unified administrative platform, operational resilience infrastructure, and security hardening for MANVIA. It serves as the final backend phase uniting Domains 0 through 19 under strict healthcare governance, least-privilege administrative access, immutable audit logging, and production readiness.

### Key Architectural Invariants

1. **No Default Unrestricted Clinical Access:** Administrative access does not grant silent or blanket visibility into confidential patient clinical records. Clinical record access is gated behind an explicit, emergency **Break-Glass Clinical Incident Workflow** requiring formal justification, incident ticket tracking, and immutable audit logging.
2. **Strict RBAC & Administrative Security Gate:** All admin endpoints reside under `/api/v1/admin/*` and require an authenticated session with active role `ADMIN` (`AdminAuthGuard`). Non-admin attempts (including authenticated patients or physicians) receive HTTP `403 Forbidden`.
3. **Emergency Platform Kill Switches:** Centralized, thread-safe runtime kill switches (`SystemKillSwitchService`) allow administrators to immediately isolate critical subsystems (e.g., `REALTIME_VOICE_GATEWAY`, `AI_COMPANION`, `PAYMENTS_GATEWAY`, `NOTIFICATIONS_DISPATCH`, `APPOINTMENT_BOOKING`) in the event of upstream outages or safety anomalies, without restarting services.
4. **Session Revocation on Account Suspension:** Updating a user's status to `SUSPENDED`, `LOCKED`, or `DEACTIVATED` immediately and atomically revokes all active Redis/PostgreSQL user sessions in a single database transaction. Self-lockout or suspension of administrative accounts is strictly prohibited.
5. **Zero 5xx Detail Leakage in Production:** The `GlobalExceptionFilter` guarantees that when `NODE_ENV === 'production'`, any internal server error (`statusCode >= 500`) has its message sanitized to `"Internal server error"`, strips all internal error details, and never returns stack traces.
6. **Production Configuration Validation:** The environment validator (`EnvSchema`) enforces that production deployments fail fast at boot if placeholder or dev-only JWT secrets are detected.
7. **Operational Health & Memory Observability:** The `/health/ready` probe reports process heap and RSS memory consumption (`heapUsedMb`, `heapTotalMb`, `rssMb`) in addition to PostgreSQL connectivity checks.

---

## 2. Admin Platform Domain Map

```
AdminModule (/api/v1/admin)
  ├── AdminAuthGuard (Ensures activeRole === 'ADMIN')
  ├── AdminUsersController (/admin/users)
  │     ├── GET /                     (List users with role, status, search filters)
  │     ├── GET /:userId              (Detailed account overview and profile links)
  │     └── POST /:userId/status      (Update status; atomic session revocation)
  ├── AdminOversightController (/admin)
  │     ├── GET /patients             (Patient directory oversight)
  │     ├── GET /doctors              (Doctor directory and verification oversight)
  │     ├── GET /appointments         (System-wide appointment schedule monitoring)
  │     ├── GET /care-relationships   (Care bonds and consent status oversight)
  │     ├── GET /payments/overview    (Financial metrics, refunds, payouts summary)
  │     └── GET /notifications/overview (Channel delivery metrics)
  ├── AdminAuditController (/admin/audit-logs)
  │     └── GET /                     (Paginated query over immutable audit logs)
  ├── AdminAISafetyController (/admin/ai)
  │     ├── GET /safety-events        (Safety classifications and emergency interventions)
  │     ├── GET /human-handoffs       (AI-to-human clinical escalation queue)
  │     └── POST /human-handoffs/:id/adjudicate (Triage, doctor assignment, resolution)
  ├── AdminSystemController (/admin/system)
  │     ├── GET /status               (Operational status and active kill switches)
  │     └── POST /kill-switches       (Emergency subsystem toggle with mandatory justification)
  └── AdminClinicalIncidentController (/admin/clinical-incidents)
        └── POST /break-glass         (Audited emergency patient clinical record access)
```

---

## 3. Security Hardening Specifications

### 3.1 Account Lifecycle & Session Governance

- Transitions between `ACTIVE`, `SUSPENDED`, `LOCKED`, and `DEACTIVATED` require a mandatory reason (minimum 5 characters).
- Suspension or deactivation executes within a transaction:
  ```ts
  await tx.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), expiresAt: new Date() },
  });
  ```
- Administrators cannot suspend or deactivate their own active administrative account (`ConflictError`).

### 3.2 Break-Glass Emergency Clinical Access

- Admin endpoints do not expose direct medical record browsing.
- Accessing a patient's health records requires:
  - `patientId`: Valid UUID v4.
  - `incidentTicketId`: Formal IT/clinical ticket ID (minimum 5 characters).
  - `justification`: Detailed clinical rationale (minimum 20 characters).
  - `acknowledgedTerms: true`: Explicit acceptance of immutable audit logging.
- Upon authorization, creates an audit log with action `ADMIN.BREAK_GLASS_CLINICAL_ACCESS`, recording actor ID, patient ID, client IP address, user agent, and timestamp.

### 3.3 Subsystem Kill Switches

- Subsystems managed:
  - `REALTIME_VOICE_GATEWAY`
  - `AI_COMPANION`
  - `PAYMENTS_GATEWAY`
  - `NOTIFICATIONS_DISPATCH`
  - `APPOINTMENT_BOOKING`
- Toggling a switch requires an explicit justification (minimum 10 characters) and records an immutable audit trail (`ADMIN.SYSTEM_KILL_SWITCH_TOGGLED`).

---

## 4. Production Hardening Checklist

| Hardening Item             | Implementation Detail                                                                                        | Status      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------- |
| **Secret Validation**      | Zod `superRefine` in `src/config/env.ts` rejecting placeholder JWT secrets in `production`                   | Implemented |
| **Error Masking**          | `GlobalExceptionFilter` forcing generic message and stripping `details` on all 5xx responses in `production` | Implemented |
| **Information Disclosure** | Stack traces suppressed across all production paths                                                          | Implemented |
| **Health Observability**   | `/health/ready` exposes PostgreSQL database ping + memory heap metrics                                       | Implemented |
| **Audit Resiliency**       | `AdminAuditService` safely validates actor existence, logging unlinked actors without FK exceptions          | Implemented |
| **Database Migrations**    | Cumulative schema deployed cleanly via `prisma migrate deploy` (14 migrations)                               | Verified    |

---

## 5. Verification Matrix

The complete test suite verifies all Phase 0–20 domains:

- **Unit Tests:** `test/unit/` (108 test files)
- **Integration Tests:** `test/integration/` (15 test files)
- **E2E Tests:** `test/e2e/` (16 test files)
- **Total Tests:** 1,152 passing tests (0 failures)
- **Code Coverage:** Statement, branch, function, and line coverage exceed platform thresholds.
