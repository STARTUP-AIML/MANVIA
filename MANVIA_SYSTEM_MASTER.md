# MANVIA SYSTEM MASTER

> **"Care made simpler."**
>
> Version: 0.1.0-phase0
> Status: PHASE 0 — PROJECT SPECIFICATION
> Last Updated: 2026-09-28
> Branch: feature/phase-0-project-specification

---

## What Is This Document?

`MANVIA_SYSTEM_MASTER.md` is the single authoritative entry point for the entire MANVIA system. It provides a high-level map of every domain, subsystem, and document in the repository. Every team member — backend engineer, frontend engineer, AI engineer, product owner, or operations engineer — should start here.

This document does **not** contain implementation detail. It contains orientation and links to where implementation detail lives.

---

## Table of Contents

1. [Product Summary](#1-product-summary)
2. [Core Domain Map](#2-core-domain-map)
3. [User Roles](#3-user-roles)
4. [Technology Baseline](#4-technology-baseline)
5. [Repository Structure](#5-repository-structure)
6. [Documentation Map](#6-documentation-map)
7. [Phase Roadmap](#7-phase-roadmap)
8. [Git Branch Architecture](#8-git-branch-architecture)
9. [Team Structure](#9-team-structure)
10. [Architecture Decisions Index](#10-architecture-decisions-index)
11. [Open Decisions Registry](#11-open-decisions-registry)
12. [Risk Register Summary](#12-risk-register-summary)
13. [Dependency Map](#13-dependency-map)

---

## 1. Product Summary

| Field | Value |
|---|---|
| Product Name | MANVIA |
| Tagline | "Care made simpler." |
| Category | Healthcare and Wellness Platform |
| Target Platforms | Web, Android, iOS, PWA |
| Deployment Model | Cloud-hosted SaaS |
| Architecture Style | Modular Monolith (backend) |
| Current Phase | Phase 0 — Project Specification |

MANVIA combines AI-driven wellness support with real human doctor consultations, appointment management, health records, longitudinal care journeys, consent-based data access, and a safety-first architecture.

MANVIA is designed as a **serious, production-oriented healthcare platform**. It is not a prototype or demo application.

---

## 2. Core Domain Map

```
User (Central Identity)
  |
  +-- Authentication and Security
  |     +-- Session management
  |     +-- Device management
  |     +-- Audit logging
  |
  +-- Role Profiles
  |     +-- PatientProfile
  |     +-- DoctorProfile
  |     +-- AdminProfile
  |
  +-- Care Journey (longitudinal concept)
  |     +-- AI Companion
  |     |     +-- Conversation
  |     |     +-- Voice interaction
  |     |     +-- Safety evaluation
  |     |     +-- Human escalation
  |     |
  |     +-- Wellness
  |     |     +-- Mood / Stress / Sleep / Energy
  |     |     +-- Check-ins
  |     |     +-- Journals
  |     |     +-- Trends and Insights
  |     |
  |     +-- Doctor Care
  |     |     +-- Doctor discovery
  |     |     +-- Availability
  |     |     +-- Consultation offers
  |     |     +-- Appointments (state machine)
  |     |     +-- Consultations
  |     |     +-- Follow-ups
  |     |
  |     +-- Health Records
  |     |     +-- Lab reports
  |     |     +-- Prescriptions
  |     |     +-- Consultation summaries
  |     |     +-- User-uploaded documents
  |     |
  |     +-- Health Timeline (longitudinal view)
  |
  +-- Care Relationships
  |     +-- Patient and Doctor relationships
  |     +-- Consent management
  |
  +-- Support Systems
        +-- Payments and Billing
        +-- Notifications
        +-- Safety systems
        +-- Administration
```

---

## 3. User Roles

| Role | Public ID Format | Description |
|---|---|---|
| Patient | PAT-XXXXXXXX | Primary care recipient |
| Doctor | DOC-XXXXXXXX | Licensed healthcare provider |
| Admin | Internal only | MANVIA platform administrator |

Key rules:
- One central immutable `User` identity anchors all roles.
- A single human may hold both Patient and Doctor profiles. Requests operate under an explicit `activeRole` context in JWT tokens. Switching active role context occurs via `POST /api/v1/auth/switch-role` under strict least-privilege verification.
- Doctors cannot self-verify their professional status. Doctor verification follows the canonical lifecycle: `DRAFT → SUBMITTED → UNDER_REVIEW → MORE_INFORMATION_REQUIRED → VERIFIED / REJECTED`, `VERIFIED → SUSPENDED / EXPIRED`.
- Doctor access to patient data is governed by CareRelationship + Consent + Appointment context, not role alone.
- Appointment lifecycle strictly enforces: `RESERVED → REQUESTED → CONFIRMED → IN_PROGRESS → COMPLETED` (Terminal branches: `CANCELLED`, `DECLINED`, `EXPIRED`, `NO_SHOW`). Double-booking is authoritatively prevented at the database boundary via PostgreSQL composite exclusion constraints (`EXCLUDE USING gist`), with Redis distributed locks (`Redlock`) providing load shedding.

See: [MANVIA-DOCS/02_ARCHITECTURE/Backend_Architecture.md](MANVIA-DOCS/02_ARCHITECTURE/Backend_Architecture.md)

---

## 4. Technology Baseline

| Layer | Technology | Status |
|---|---|---|
| Runtime | Node.js 24 LTS | Confirmed |
| Language | TypeScript (strict) | Confirmed |
| Framework | NestJS | Confirmed |
| HTTP Adapter | Fastify | Confirmed |
| API Style | REST + OpenAPI/Swagger | Confirmed |
| Database | PostgreSQL 18.x | Confirmed |
| ORM | Prisma 7.x | Confirmed |
| Cache | Redis | Confirmed |
| Vector Search | pgvector (initial) | Confirmed, may evolve |
| Object Storage | S3-compatible abstraction | DECISION REQUIRED for provider |
| Realtime | WebSocket / WebRTC | Confirmed approach |
| Containers | Docker | Confirmed |
| CI/CD | GitHub Actions | Confirmed |
| Testing | Vitest + Supertest | Confirmed |
| Observability | OpenTelemetry-compatible | DECISION REQUIRED for vendor |
| Error Tracking | Sentry or equivalent | DECISION REQUIRED |
| IaC | Terraform | DEFERRED to Phase 20+ |

See: [MANVIA-DOCS/02_ARCHITECTURE/System_Architecture.md](MANVIA-DOCS/02_ARCHITECTURE/System_Architecture.md)

---

## 5. Repository Structure

```
MANVIA/
+-- MANVIA_SYSTEM_MASTER.md            <- You are here
+-- README.md
+-- .planning/
|   +-- ROADMAP.md
|   +-- PHASE_OWNERSHIP.md
|   +-- OPEN_DECISIONS.md
|   +-- RISK_REGISTER.md
|   +-- PHASE_0_EXIT_CRITERIA.md
|
+-- MANVIA-DOCS/
|   +-- 01_PRODUCT/
|   +-- 02_ARCHITECTURE/
|   +-- 03_DATABASE/
|   +-- 04_API/
|   +-- 05_AI/
|   +-- 06_SECURITY/
|   +-- 07_INFRASTRUCTURE/
|   +-- 08_OPERATIONS/
|   +-- 09_BUSINESS/
|   +-- 10_HANDOVER/
|
+-- src/                               <- Backend source (Phase 1+)
    +-- config/
    +-- common/
    +-- database/
    +-- cache/
    +-- events/
    +-- health/
    +-- modules/
    +-- integrations/
    +-- workers/
```

---

## 6. Documentation Map

| Section | Key Documents |
|---|---|
| Product | PRD, MVP_Scope, User_Personas, User_Flows, Feature_Requirements |
| Architecture | System_Architecture, Backend_Architecture, AI_Architecture, Realtime_Voice_Architecture |
| Database | Database_Architecture, ER_Diagram, Data_Dictionary, Migration_Strategy |
| API | API_Overview, Authentication, Patient_API, Doctor_API, Appointment_API, Wellness_API, AI_API, Admin_API, Notification_API, Health_Records_API |
| AI | AI_Architecture, Model_Strategy, Multilingual_AI, Avatar_System, AI_Safety |
| Security | Security_Architecture, Authentication, Authorization, Data_Protection, Secrets, Incident_Response |
| Infrastructure | Hosting, Storage, Deployment |
| Operations | Testing_Strategy, Monitoring, Deployment_Runbook, Backup_Runbook, Disaster_Recovery |
| Business | Vendors, Billing, Subscriptions |
| Handover | Developer_Onboarding, Database_Handover, Infrastructure_Handover |

---

## 7. Phase Roadmap

| Phase | Name | Branch | Status |
|---|---|---|---|
| 0 | Product and Backend Specification | feature/phase-0-project-specification | IN PROGRESS |
| 1 | Repository and Engineering Foundation | feature/phase-1-backend-foundation | PLANNED |
| 2 | NestJS + Fastify Foundation | feature/phase-2-nestjs-foundation | PLANNED |
| 3 | PostgreSQL + Prisma | feature/phase-3-database | PLANNED |
| 4 | Identity + Authentication | feature/phase-4-identity-auth | PLANNED |
| 5 | Authorization + Security | feature/phase-5-authorization | PLANNED |
| 6 | Patient Domain | feature/phase-6-patient-domain | PLANNED |
| 7 | Doctor Platform | feature/phase-7-doctor-platform | PLANNED |
| 8 | Doctor Verification | feature/phase-8-doctor-verification | PLANNED |
| 9 | Availability + Consultation Offers | feature/phase-9-availability | PLANNED |
| 10 | Care Relationship + Consent | feature/phase-10-care-consent | PLANNED |
| 11 | Wellness Engine | feature/phase-11-wellness | PLANNED |
| 12 | Health Records + Health Timeline | feature/phase-12-health-records | PLANNED |
| 13 | Pre-consultation + Appointment Engine | feature/phase-13-appointments | PLANNED |
| 14 | Waitlist + Cancellation + Refund | feature/phase-14-waitlist-refund | PLANNED |
| 15 | AI Companion Core | feature/phase-15-ai-companion | PLANNED |
| 16 | Medical RAG + AI Safety + AI Memory | feature/phase-16-ai-advanced | PLANNED |
| 17 | Realtime Voice + Avatar + Human Handoff | feature/phase-17-realtime | PLANNED |
| 18 | Notifications | feature/phase-18-notifications | PLANNED |
| 19 | Payments + Billing + Payouts | feature/phase-19-payments | PLANNED |
| 20 | Admin + Production Hardening + Final Audit | feature/phase-20-production | PLANNED |

See full detail: [.planning/ROADMAP.md](.planning/ROADMAP.md)

---

## 8. Git Branch Architecture

### Long-Lived Branches

| Branch | Purpose | Protected |
|---|---|---|
| main | Production-ready code | Yes — PR only |
| backend | Completed backend phases | Yes — PR only |
| frontend | Completed frontend phases | Yes — PR only |
| developer | Full-system integration | Yes — PR only |

### Flow

```
feature/phase-X (backend)
     |
     v (PR + CI + Review)
  backend
     |
     v (PR + full test suite)
  developer
     |
     v (PR + security check + E2E)
   main
```

### Rules

- No direct commits to main, backend, frontend, or developer.
- Each phase gets exactly one feature branch.
- Do NOT split one phase into parallel sub-feature branches without explicit approval.
- CI must pass before any merge.
- At least one peer review required for merges into backend, developer, and main.

---

## 9. Team Structure

| Developer | Role | Focus |
|---|---|---|
| CBN YENDLURI | Backend Developer 1 | Phase 0 owner; architecture lead |
| Vinod | Backend Developer 2 | Phase 1 next owner |

One phase = one developer owner. The owner is responsible for implementation, tests, documentation, database changes, integration, and verification for their phase.

See: [.planning/PHASE_OWNERSHIP.md](.planning/PHASE_OWNERSHIP.md)

---

## 10. Architecture Decisions Index

| ID | Decision | Location |
|---|---|---|
| ADR-001 | Modular monolith over microservices | Backend_Architecture.md |
| ADR-002 | NestJS + Fastify over Express | Backend_Architecture.md |
| ADR-003 | PostgreSQL as primary database | Database_Architecture.md |
| ADR-004 | Prisma as ORM | Database_Architecture.md |
| ADR-005 | Provider abstraction for AI models | AI_Architecture.md |
| ADR-006 | S3-compatible object storage abstraction | Database_Architecture.md |
| ADR-007 | Redis Streams for initial event bus | Backend_Architecture.md |
| ADR-008 | REST over GraphQL | API_Overview.md |
| ADR-009 | JWT + Refresh token authentication strategy | Authentication.md |
| ADR-010 | Resource-level RBAC + consent enforcement | Authorization.md |

---

## 11. Open Decisions Registry

See full detail: [.planning/OPEN_DECISIONS.md](.planning/OPEN_DECISIONS.md)

| ID | Decision Required |
|---|---|
| OD-001 | Cloud provider selection |
| OD-002 | Object storage provider |
| OD-003 | AI provider primary selection |
| OD-004 | Payment gateway |
| OD-005 | SMS/OTP provider |
| OD-006 | Email provider |
| OD-007 | Push notification provider |
| OD-008 | Video consultation infrastructure |
| OD-009 | Observability/monitoring stack |
| OD-010 | Mobile framework (React Native vs Flutter) |
| OD-011 | Target geography and regulatory jurisdiction |
| OD-012 | Doctor verification integration approach |
| OD-013 | Multi-tenancy model for market expansion |
| OD-014 | Avatar system provider and approach |

---

## 12. Risk Register Summary

See full detail: [.planning/RISK_REGISTER.md](.planning/RISK_REGISTER.md)

| ID | Risk | Severity |
|---|---|---|
| R-001 | AI medical misrepresentation | CRITICAL |
| R-002 | Unauthorized access to health records | CRITICAL |
| R-003 | Doctor verification bypass | HIGH |
| R-004 | Double-booking in appointments | HIGH |
| R-005 | Payment idempotency failures | HIGH |
| R-006 | Compliance gaps at market launch | HIGH |
| R-007 | AI provider lock-in | MEDIUM |
| R-008 | Phase dependency bottleneck | MEDIUM |

---

## 13. Dependency Map

```
Phase 0  (Specification)
  +-- Phase 1  (Repo + tooling foundation)
        +-- Phase 2  (NestJS core)
              +-- Phase 3  (Database + Prisma)
                    +-- Phase 4  (Identity + Auth)  [BLOCKER for all protected work]
                          +-- Phase 5  (Authorization + Security)  [BLOCKER for domain APIs]
                                +-- Phase 6  (Patients)
                                +-- Phase 7  (Doctors)
                                |     +-- Phase 8  (Doctor Verification)
                                |           +-- Phase 9  (Availability + Offers)
                                |                 +-- Phase 10 (Care Relationship + Consent)
                                |                 |     +-- Phase 11 (Wellness)
                                |                 |     +-- Phase 12 (Health Records + Timeline)
                                |                 |     +-- Phase 13 (Appointments)  [BLOCKER for billing]
                                |                 |           +-- Phase 14 (Waitlist + Refund)
                                |                 |           +-- Phase 15 (AI Companion Core)
                                |                 |                 +-- Phase 16 (AI Advanced)
                                |                 |                       +-- Phase 17 (Realtime)
                                |                 +-- Phase 18 (Notifications)  [cross-cutting]
                                +-- Phase 19 (Payments)  [depends on Phase 13]
                          +-- Phase 20 (Admin + Hardening)  [final phase]
```

---

*This document is maintained by the Phase 0 owner. Update the status column at the start of each new phase.*
