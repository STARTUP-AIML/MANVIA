# MANVIA — Risk Register

> Version: 0.1.0-phase0
> Last Updated: 2026-09-28

Severity levels: CRITICAL / HIGH / MEDIUM / LOW
Status: OPEN / MITIGATED / ACCEPTED / CLOSED

---

## CRITICAL Risks

### R-001 — AI Medical Misrepresentation
**Severity:** CRITICAL
**Status:** OPEN — requires ongoing architectural enforcement

**Description:**
MANVIA AI could be perceived by users as providing medical diagnosis or treatment advice. If a user acts on AI output as if it were professional medical advice, and harm results, this creates severe liability.

**Impact:**
- Legal liability for personal injury.
- Regulatory action.
- Reputational destruction.
- Platform shutdown.

**Mitigations:**
- The system must always clearly identify the AI as an AI, not a human doctor.
- UI must clearly distinguish "Talk to MANVIA AI" from "Consult a Real Doctor."
- AI system prompts must explicitly prohibit diagnostic claims.
- AI safety engine must detect crisis/urgent signals and escalate.
- All AI responses must include appropriate disclaimers.
- AI must never prescribe, diagnose, or recommend specific medications.
- LEGAL / REGULATORY REVIEW REQUIRED before any clinical-adjacent AI feature goes to production.

**Phase responsibility:** Phase 15 (AI core), Phase 16 (safety engine), all AI phases.

---

### R-002 — Unauthorized Access to Health Records
**Severity:** CRITICAL
**Status:** OPEN — architectural mitigation in design

**Description:**
Health records contain the most sensitive data in MANVIA. A breach of health records — whether through misconfigured access control, SQL injection, privilege escalation, or storage misconfiguration — would be catastrophic.

**Impact:**
- Patient privacy violation.
- Regulatory action (data protection laws).
- Criminal liability in some jurisdictions.
- Reputational destruction.

**Mitigations:**
- Resource-level access control enforced in every API (Phase 5).
- CareRelationship + Consent enforcement before any record access (Phase 10).
- Object storage must not be publicly accessible.
- Records must be encrypted at rest and in transit.
- Audit log every health record access.
- Penetration testing before production launch (Phase 20).
- Secrets management — no credentials in code.
- Regular access control reviews.

**Phase responsibility:** Phase 5, Phase 10, Phase 12, Phase 20.

---

## HIGH Risks

### R-003 — Doctor Verification Bypass
**Severity:** HIGH
**Status:** OPEN — lifecycle design mitigates

**Description:**
If a doctor can reach "verified" status without proper credential review, unqualified individuals could provide medical consultations through MANVIA.

**Impact:**
- Patient harm from unqualified medical advice.
- Legal liability.
- Regulatory shutdown.

**Mitigations:**
- Doctors cannot self-approve verification. Only MANVIA admin can approve.
- Verification state machine enforced at the code level.
- All state transitions are audit-logged with actor, timestamp, and reason.
- Consultation access requires APPROVED verification status.
- Regular audit of approved doctor credentials.
- LEGAL / REGULATORY REVIEW REQUIRED: Verification standards must meet jurisdiction requirements.

**Phase responsibility:** Phase 8.

---

### R-004 — Appointment Double-Booking
**Severity:** HIGH
**Status:** OPEN — transactional design required

**Description:**
Race conditions in the appointment booking flow could result in two patients booking the same doctor time slot simultaneously.

**Impact:**
- Broken patient and doctor experience.
- Payment disputes.
- Trust damage.

**Mitigations:**
- Time-limited slot HOLD mechanism (slot is "locked" during booking process).
- Database-level uniqueness constraints on slot + doctor combinations.
- Transactional locking during hold creation.
- Idempotency on booking requests.
- Automatic hold expiry for abandoned booking flows.

**Phase responsibility:** Phase 13.

---

### R-005 — Payment Idempotency Failures
**Severity:** HIGH
**Status:** OPEN — design required

**Description:**
If payment webhook processing is not idempotent, duplicate webhook delivery could result in double-charging or double-refunding patients.

**Impact:**
- Financial loss (company or patient).
- Payment dispute volume.
- Trust damage.

**Mitigations:**
- Store payment provider event IDs and deduplicate before processing.
- All payment state transitions must be idempotent.
- Webhook signing verification (HMAC from payment provider).
- Financial audit log for every state change.
- Alerts on unexpected payment state transitions.

**Phase responsibility:** Phase 19.

---

### R-006 — Compliance Gaps at Market Launch
**Severity:** HIGH
**Status:** OPEN — requires legal engagement

**Description:**
Telemedicine, health data processing, and payment processing are heavily regulated. Launching without verified compliance could result in regulatory enforcement action.

**Impact:**
- Regulatory fines.
- Forced shutdown.
- Criminal liability for directors.

**Mitigations:**
- Engage legal counsel specializing in healthcare technology before launch.
- Do not claim compliance certifications that have not been formally obtained.
- Implement compliance-readiness architecture now (audit logs, data minimization, consent, encryption).
- Document all LEGAL / REGULATORY REVIEW REQUIRED items in this registry.
- Jurisdiction selection (OD-011) must be resolved before any compliance work begins.
- Emergency resources (crisis lines) must be verified for target geography before production.

**LEGAL / REGULATORY REVIEW REQUIRED:** This risk cannot be fully mitigated without legal counsel.

---

### R-007 — Phase Dependency Bottleneck
**Severity:** MEDIUM
**Status:** OPEN — accepted risk of sequential delivery

**Description:**
MANVIA's phase architecture is strictly sequential. If one phase is delayed or produces defects that require rework, all subsequent phases are delayed.

**Impact:**
- Extended time to market.
- Developer frustration.
- Budget overrun.

**Mitigations:**
- Clear exit criteria for each phase (see ROADMAP.md).
- Phase review before PR merge.
- Phase estimates should include buffer for rework.
- Architecture decisions front-loaded in Phase 0 to reduce rework risk.
- Any phase that introduces breaking changes must define a migration path.

---

## MEDIUM Risks

### R-008 — AI Provider Lock-in
**Severity:** MEDIUM
**Status:** MITIGATED by design

**Description:**
If the codebase is tightly coupled to one AI provider (e.g., directly importing OpenAI SDK everywhere), switching providers later becomes expensive.

**Impact:**
- High migration cost if provider pricing or availability changes.
- Inability to use specialized models for specific tasks.

**Mitigations:**
- AI provider abstraction (AIProvider interface) is a first-class architectural requirement.
- No module outside the integrations/ai layer should import provider SDK directly.
- All AI calls go through the abstraction layer.

**Phase responsibility:** Phase 15.

---

### R-009 — Data Retention and Deletion Complexity
**Severity:** MEDIUM
**Status:** OPEN

**Description:**
Health data retention requirements are jurisdiction-specific and can range from 5 to 20+ years. Implementing user "right to deletion" requests while maintaining medical record integrity is legally and technically complex.

**Mitigations:**
- Design data models with soft delete and anonymization from the start.
- Do not design hard-delete for health records without legal guidance.
- Retention policy model should be configurable, not hard-coded.
- LEGAL / REGULATORY REVIEW REQUIRED before implementing deletion workflows.

---

### R-010 — Real-time Voice Latency Expectations
**Severity:** MEDIUM
**Status:** OPEN

**Description:**
The specified realtime voice state machine has demanding latency requirements (VAD latency, barge-in, end-of-speech detection, time to first response). Current AI provider APIs may not meet these requirements for all geographies.

**Impact:**
- Poor user experience.
- Feature that cannot be launched.

**Mitigations:**
- Do not promise specific latency figures in user-facing communications.
- Measure all latency metrics before committing to realtime voice as a feature.
- Design fallback to text-based interaction if voice latency is unacceptable.
- Phase 17 must include explicit latency benchmarking.

---

### R-011 — Realtime Video Infrastructure Complexity
**Severity:** MEDIUM
**Status:** OPEN

**Description:**
Building native in-app video consultation adds significant infrastructure complexity, cost, and maintenance burden.

**Mitigations:**
- Consider linking to external video tools (Google Meet / Zoom) for MVP.
- Build native video only when volume justifies the infrastructure investment.
- Evaluate provider SLAs carefully (ZEGOCLOUD, Twilio Video, etc.).

---

### R-012 — Mobile Framework Decision Delay
**Severity:** MEDIUM
**Status:** OPEN

**Description:**
Frontend phases cannot begin until the mobile framework decision (OD-010) is made. Delaying this decision delays frontend work.

**Mitigation:** Resolve OD-010 before backend Phase 4 is complete so frontend work can begin in parallel with backend phases 5+.

---

## LOW Risks

### R-013 — PostgreSQL 18.x Stability
**Severity:** LOW
**Status:** ACCEPTED

**Description:**
PostgreSQL 18.x is a recent major release. While PostgreSQL is extremely stable software, running a bleeding-edge major version in production carries some risk.

**Mitigation:** Monitor PostgreSQL 18.x release notes. If significant bugs are discovered, design allows downgrade to PostgreSQL 16 LTS without architecture changes (Prisma abstracts the version).

---

### R-014 — Prisma 7.x API Stability
**Severity:** LOW
**Status:** ACCEPTED

**Description:**
Prisma 7.x is a recent major version. API changes between major Prisma versions have historically required migration work.

**Mitigation:** Pin the exact Prisma version in package.json. Review changelog before upgrading. Prisma migrations are the source of truth for schema changes.

---

*This risk register must be reviewed at the start of each phase. New risks identified during implementation must be added here.*
