# MANVIA — Testing Strategy

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Testing Philosophy

- Every feature ships with tests written by the same phase owner.
- Tests are not added after the fact — they are part of phase completion criteria.
- No phase is merged to `backend` without passing CI (which includes tests).
- Test data is always synthetic. No real patient data in tests.

---

## 2. Testing Levels

### 2.1 Unit Tests
**Tool:** Vitest
**Scope:** Individual functions, services, utilities, guards — with dependencies mocked.
**Location:** `src/**/*.spec.ts`
**Coverage target:** 80% line coverage on service layer (DECISION REQUIRED — exact threshold).

What to unit test:
- Service business logic (appointment state transitions, consent evaluation, etc.)
- Guard logic (authorization decisions)
- Utility functions
- DTO validation schemas
- Event handlers

What NOT to unit test:
- Framework boilerplate (NestJS module wiring)
- Prisma model definitions

### 2.2 Integration Tests
**Tool:** Vitest + real PostgreSQL (test database)
**Scope:** Service + repository against a real database.
**Location:** `src/**/*.integration.spec.ts`

What to integration test:
- Repository queries (complex Prisma queries)
- Transaction behavior (e.g., appointment hold + slot lock)
- Database constraint enforcement (uniqueness, foreign keys)
- Migration correctness (can run fresh; can run incrementally)

**Test database isolation:** Each integration test run uses a transaction that is rolled back after each test, or a fresh test database seeded from seed scripts.

### 2.3 API Tests (End-to-End per module)
**Tool:** Supertest
**Scope:** Full HTTP request → controller → service → database → response.
**Location:** `src/**/*.e2e.spec.ts`

What to API test:
- Authentication flows (register, login, refresh, logout)
- Authorization enforcement (403 for unauthorized access)
- Appointment state machine transitions
- Error responses (correct status codes and error formats)
- Rate limiting

### 2.4 End-to-End Tests (Multi-step user journeys)
**Tool:** Supertest (for backend E2E)
**Scope:** Full user journeys across multiple API calls.
**Location:** `test/e2e/`

What to E2E test:
- Patient: register → book appointment → complete appointment → view timeline
- Doctor: register → verify → set availability → accept appointment
- Patient: AI conversation → safety trigger → escalation
- Payment: intent → confirm → refund

### 2.5 Security Tests
**Phase:** Phase 20 (plus ongoing in earlier phases for auth/authz)

What to security test:
- Authentication bypass attempts
- Authorization bypass (IDOR)
- SQL injection (via Prisma — verify parameterization)
- Rate limit bypass
- Token manipulation
- Consent bypass

### 2.6 Performance Tests
**Tool:** k6 or Artillery (DECISION REQUIRED)
**Phase:** Phase 20 before production

Endpoints to load test:
- Login
- Appointment booking (appointment hold — concurrency critical)
- Health record upload
- AI conversation message
- Doctor availability query

### 2.7 Database Migration Tests
**Phase:** Every phase with database changes

- Migrations must apply cleanly from scratch (empty DB → latest).
- Migrations must apply incrementally (v(n-1) → v(n)).
- No data loss from non-destructive migrations.
- Rollback plan documented for every destructive migration.

### 2.8 Smoke Tests
**Phase:** Every deployment to staging and production.

- `/health` returns 200.
- Login works.
- Key API endpoints respond.
- Database connectivity confirmed.

---

## 3. CI Testing Requirements by Branch

| Branch | Required Tests |
|---|---|
| Feature PR → backend | Lint, typecheck, unit tests, API tests |
| backend | All of above + integration tests + E2E tests + migration validation |
| backend → developer | Full backend test suite + Docker build |
| frontend → developer | Frontend tests + build + E2E against backend |
| developer → main | Full test suite + security check + performance validation + smoke test |

---

## 4. Test Data Strategy

- All test data is synthetic.
- Use Faker.js (or equivalent) for generating realistic but fake patient data.
- Seed scripts for development and test environments are maintained in `src/database/seeds/`.
- Database seed data is idempotent (can run multiple times safely).
- Test fixtures are co-located with the tests that use them.

**Rule:** No test may use production data, real patient names, real doctor names, or real medical records.

---

## 5. Coverage Requirements

| Layer | Target Coverage |
|---|---|
| Service layer (unit) | 80% line coverage |
| Guard layer (unit) | 90% line coverage |
| Controller layer (API test) | All happy paths + major error paths |
| Critical paths (E2E) | 100% of user journeys defined in MVP |

Coverage requirements are enforced by Vitest coverage configuration. CI fails if thresholds are not met.

---

## 6. Test Naming Conventions

```typescript
// Unit test
describe('AppointmentsService', () => {
  describe('createHold', () => {
    it('should create a slot hold for an available slot', async () => { ... });
    it('should throw ConflictException if slot is already held', async () => { ... });
    it('should expire the hold after TTL', async () => { ... });
  });
});

// E2E test
describe('Appointment Booking Journey', () => {
  it('patient can book, hold expires, patient re-books successfully', async () => { ... });
});
```

---

*Testing discipline is non-negotiable. A feature without tests is a feature that will break in production.*
