# MANVIA POST-AUDIT EXECUTION RULES

MANVIA is NOT being rebuilt from scratch.

## SOURCE OF TRUTH

Use the MANVIA Post-Audit Product Completion & Website Master Plan as the planning source.

Execution flow:

CURRENT → MISSING → BUILD → INTEGRATE → POLISH → TEST → DEMO → PRODUCTION

## NEVER

- Rebuild existing foundations unnecessarily.
- Use mock data to hide backend failures.
- Trust caller-supplied identity headers.
- Bypass authorization.
- Put secrets in frontend `VITE_*` variables.
- Replace PostgreSQL correctness with Redis/distributed locks.
- Claim mocked providers are production implementations.
- Invent API contracts.
- Commit, push, or create PR unless explicitly requested.

## FEATURE TRACEABILITY

Every feature must trace:

DB
→ Repository/Service
→ Controller/API
→ DTO
→ Frontend API client
→ Hook/State
→ Component
→ Page
→ User journey
→ Authorization
→ Tests/E2E

## COMPLETION REQUIREMENTS

A feature is not complete until it has:

- Durable backend behavior.
- Correct API contract.
- Correct authorization.
- Frontend integration where applicable.
- Loading state.
- Empty state.
- Error state.
- Appropriate automated tests.
- E2E coverage where required.
- Documentation.

## POST-AUDIT EXECUTION ORDER

### M1 — TRUSTED AUTHENTICATION

Authenticated identity and authorization trust boundary.

### M2 — DOCTORS + AVAILABILITY

Durable doctors, verification, availability, consultation offers.

### M3 — CARE + WELLNESS + RECORDS

Care relationships, consent, wellness, health records, timeline and storage.

### M4 — APPOINTMENTS

Transactional appointment booking and lifecycle correctness.

### M5 — COMMERCE + NOTIFICATIONS

Waitlist, cancellation, refunds, payments, billing, payouts and notifications.

### M6 — AI + REALTIME

AI provider integration, RAG, safety, memory, realtime voice and human handoff.

### M7 — GOVERNANCE + RELEASE VALIDATION

Admin, security, audit, E2E, observability and release validation.

### M8 — PRODUCT + PRODUCTION

Product polish, production infrastructure, operational readiness and final integration.

## DEPENDENCY RULE

Work only on the current milestone.

Do not implement downstream functionality before its upstream dependency is stable.

Do not parallelize feature work against unresolved ownership, persistence or authorization contracts.

## CURRENT PRIORITY

M1 is currently active.

M1 must establish a trusted authenticated identity boundary.

Production authorization must derive identity from verified authentication/session context.

Caller-supplied identity headers such as:

- `x-user-id`
- `x-user-role`
- `x-active-role`

must never be treated as authoritative identity.

E2E tests must use the application's trusted authentication mechanism.

## AGENT RULES

Before modifying code:

1. Inspect the existing implementation.
2. Identify the actual root cause.
3. Make the smallest correct change.
4. Preserve existing working functionality.
5. Do not introduce unrelated refactoring.

After implementation:

- Run relevant tests.
- Run typecheck.
- Run lint.
- Run build.
- Run E2E where applicable.
- Report changed files.
- Report tests and results.
- Report remaining failures.

DO NOT commit.
DO NOT push.
DO NOT create a PR.

The developer/team lead performs Git operations separately.  