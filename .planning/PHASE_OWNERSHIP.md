# MANVIA — Phase Ownership

> Version: 0.1.0-phase0
> Last Updated: 2026-09-28

---

## Ownership Rule

**One phase = one developer owner.**

The phase owner is solely responsible for:

1. **Implementation** — Writing all code for the phase.
2. **Tests** — Unit, integration, and API tests for all features in the phase.
3. **Documentation** — Updating relevant documentation for changes made.
4. **Database changes** — Writing and validating Prisma migrations for the phase.
5. **Integration** — Ensuring the phase integrates cleanly with existing code.
6. **Verification** — Running and passing all CI checks before PR.
7. **PR creation** — Creating the pull request to `backend` with proper description.

**Do NOT split one phase into multiple parallel sub-feature branches without explicit team approval.**

Rationale: Parallel branches for a single phase create merge conflicts, coordination overhead, and integration risk. MANVIA's two-developer team benefits more from clean sequential delivery than parallel chaos.

---

## Phase Ownership Registry

| Phase | Name | Owner | Start | Complete | PR | Status |
|---|---|---|---|---|---|---|
| 0 | Product and Backend Specification | CBN YENDLURI | 2026-09-28 | - | - | IN PROGRESS |
| 1 | Repository and Engineering Foundation | Vinod | - | - | - | PLANNED |
| 2 | NestJS + Fastify Foundation | DECISION REQUIRED | - | - | - | PLANNED |
| 3 | PostgreSQL + Prisma | DECISION REQUIRED | - | - | - | PLANNED |
| 4 | Identity + Authentication | DECISION REQUIRED | - | - | - | PLANNED |
| 5 | Authorization + Security | DECISION REQUIRED | - | - | - | PLANNED |
| 6 | Patient Domain | DECISION REQUIRED | - | - | - | PLANNED |
| 7 | Doctor Platform | DECISION REQUIRED | - | - | - | PLANNED |
| 8 | Doctor Verification | DECISION REQUIRED | - | - | - | PLANNED |
| 9 | Availability + Consultation Offers | DECISION REQUIRED | - | - | - | PLANNED |
| 10 | Care Relationship + Consent | DECISION REQUIRED | - | - | - | PLANNED |
| 11 | Wellness Engine | DECISION REQUIRED | - | - | - | PLANNED |
| 12 | Health Records + Health Timeline | DECISION REQUIRED | - | - | - | PLANNED |
| 13 | Pre-consultation + Appointment Engine | DECISION REQUIRED | - | - | - | PLANNED |
| 14 | Waitlist + Cancellation + Refund | DECISION REQUIRED | - | - | - | PLANNED |
| 15 | AI Companion Core | DECISION REQUIRED | - | - | - | PLANNED |
| 16 | Medical RAG + AI Safety + AI Memory | DECISION REQUIRED | - | - | - | PLANNED |
| 17 | Realtime Voice + Avatar + Human Handoff | DECISION REQUIRED | - | - | - | PLANNED |
| 18 | Notifications | DECISION REQUIRED | - | - | - | PLANNED |
| 19 | Payments + Billing + Payouts | DECISION REQUIRED | - | - | - | PLANNED |
| 20 | Admin + Production Hardening + Final Audit | DECISION REQUIRED | - | - | - | PLANNED |

---

## Phase Handoff Protocol

When a phase owner completes their work:

1. Run all tests locally: `npm run test:all`
2. Run lint and typecheck: `npm run lint && npm run typecheck`
3. Ensure all migrations apply cleanly from scratch.
4. Update relevant documentation.
5. Update this file with actual start/complete dates.
6. Create PR to `backend` with the phase PR template.
7. Assign the other developer as reviewer.
8. Address review feedback.
9. CI must be green before merge.
10. After merge, update the ROADMAP.md phase status to COMPLETE.
11. Notify the next phase owner.

---

## Developer Profiles

### CBN YENDLURI (Developer 1)
- **Role:** Backend Developer / Architecture Lead (Phase 0)
- **Primary responsibility:** Architecture decisions, Phase 0 specification
- **Contact:** DECISION REQUIRED — add GitHub username

### Vinod (Developer 2)
- **Role:** Backend Developer
- **Contact:** DECISION REQUIRED — add GitHub username

---

## Team Agreements

- Neither developer merges to `backend`, `developer`, or `main` without a passing PR review.
- If the current phase owner is blocked, they must communicate this immediately rather than branching off.
- Open decisions (OPEN_DECISIONS.md) must not be resolved unilaterally — both developers and any product stakeholders must be consulted.
- No production credentials, patient data, or real doctor data ever go in the repository.
