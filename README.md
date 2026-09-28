# MANVIA — "Care made simpler."

> **MANVIA** is a mission-critical, enterprise healthcare and wellness platform designed to bridge empathetic, multi-modal AI companionship with verified clinical care delivery.

---

## 🌟 Executive Summary

MANVIA provides a longitudinal care ecosystem combining:
1. **AI Companion & Wellness Engine:** Multi-metric tracking (mood, sleep, stress, energy), natural full-duplex realtime voice, and 3D visual avatar interactions.
2. **Clinical Doctor Consultations:** Verified doctor discovery, conflict-free appointment scheduling, distributed slot locking, and tele-consultation workflows.
3. **Health Records & Unified Timeline:** Encrypted lab report storage (AES-256-GCM envelope encryption), digital prescription signing, and chronological timeline feeds.
4. **Safety-First Medical Guardrails:** Non-diagnostic clinical safety boundaries, sub-350ms crisis intervention overrides, and granular patient consent controls.

---

## 🏛️ System Master & Architecture Index

The repository maintains an exhaustive technical blueprint:

* **Authoritative Master Blueprint:** [`MANVIA_SYSTEM_MASTER.md`](MANVIA_SYSTEM_MASTER.md)
* **Roadmap & Phase Execution:** [`.planning/ROADMAP.md`](.planning/ROADMAP.md)
* **Risk Register & Mitigations:** [`.planning/RISK_REGISTER.md`](.planning/RISK_REGISTER.md)
* **Phase Ownership Matrix:** [`.planning/PHASE_OWNERSHIP.md`](.planning/PHASE_OWNERSHIP.md)
* **Open Technical Decisions:** [`.planning/OPEN_DECISIONS.md`](.planning/OPEN_DECISIONS.md)

---

## 📚 Technical Documentation (`MANVIA-DOCS/`)

| Section | Documents |
|---|---|
| **01 Product** | [PRD](MANVIA-DOCS/01_PRODUCT/PRD.md) • [MVP Scope](MANVIA-DOCS/01_PRODUCT/MVP_Scope.md) • [User Personas](MANVIA-DOCS/01_PRODUCT/User_Personas.md) • [User Flows](MANVIA-DOCS/01_PRODUCT/User_Flows.md) • [Feature Requirements](MANVIA-DOCS/01_PRODUCT/Feature_Requirements.md) |
| **02 Architecture** | [System Architecture](MANVIA-DOCS/02_ARCHITECTURE/System_Architecture.md) • [Backend Architecture](MANVIA-DOCS/02_ARCHITECTURE/Backend_Architecture.md) • [Realtime Voice](MANVIA-DOCS/02_ARCHITECTURE/Realtime_Voice_Architecture.md) |
| **03 Database** | [Database Architecture](MANVIA-DOCS/03_DATABASE/Database_Architecture.md) • [ER Diagram](MANVIA-DOCS/03_DATABASE/ER_Diagram.md) • [Data Dictionary](MANVIA-DOCS/03_DATABASE/Data_Dictionary.md) • [Migration Strategy](MANVIA-DOCS/03_DATABASE/Migration_Strategy.md) |
| **04 API** | [API Overview](MANVIA-DOCS/04_API/API_Overview.md) • [Authentication](MANVIA-DOCS/04_API/Authentication.md) • [Patient API](MANVIA-DOCS/04_API/Patient_API.md) • [Doctor API](MANVIA-DOCS/04_API/Doctor_API.md) • [Appointment API](MANVIA-DOCS/04_API/Appointment_API.md) • [Wellness API](MANVIA-DOCS/04_API/Wellness_API.md) • [AI Gateway API](MANVIA-DOCS/04_API/AI_API.md) |
| **05 AI System** | [AI Architecture](MANVIA-DOCS/05_AI/AI_Architecture.md) • [Model Strategy](MANVIA-DOCS/05_AI/Model_Strategy.md) • [AI Safety](MANVIA-DOCS/05_AI/AI_Safety.md) • [Multilingual AI](MANVIA-DOCS/05_AI/Multilingual_AI.md) • [Avatar System](MANVIA-DOCS/05_AI/Avatar_System.md) |
| **06 Security** | [Security Architecture](MANVIA-DOCS/06_SECURITY/Security_Architecture.md) • [Authorization](MANVIA-DOCS/06_SECURITY/Authorization.md) • [Data Protection](MANVIA-DOCS/06_SECURITY/Data_Protection.md) • [Secrets Management](MANVIA-DOCS/06_SECURITY/Secrets.md) • [Incident Response Plan](MANVIA-DOCS/06_SECURITY/Incident_Response.md) |
| **07 Infrastructure** | [Hosting Architecture](MANVIA-DOCS/07_INFRASTRUCTURE/Hosting.md) • [Object Storage](MANVIA-DOCS/07_INFRASTRUCTURE/Storage.md) • [Deployment Pipeline](MANVIA-DOCS/07_INFRASTRUCTURE/Deployment.md) |
| **08 Operations** | [Testing Strategy](MANVIA-DOCS/08_OPERATIONS/Testing_Strategy.md) • [Monitoring & Observability](MANVIA-DOCS/08_OPERATIONS/Monitoring.md) • [Deployment Runbook](MANVIA-DOCS/08_OPERATIONS/Deployment_Runbook.md) • [Backup Runbook](MANVIA-DOCS/08_OPERATIONS/Backup_Runbook.md) • [Disaster Recovery](MANVIA-DOCS/08_OPERATIONS/Disaster_Recovery.md) |
| **09 Business** | [Vendors Register](MANVIA-DOCS/09_BUSINESS/Vendors.md) • [Billing & Payouts](MANVIA-DOCS/09_BUSINESS/Billing.md) • [Subscriptions](MANVIA-DOCS/09_BUSINESS/Subscriptions.md) |
| **10 Handover** | [Developer Onboarding](MANVIA-DOCS/10_HANDOVER/Developer_Onboarding.md) • [Database Handover](MANVIA-DOCS/10_HANDOVER/Database_Handover.md) • [Infrastructure Handover](MANVIA-DOCS/10_HANDOVER/Infrastructure_Handover.md) |

---

## 🛠️ Technology Baseline

* **Runtime:** Node.js 24 LTS
* **Language:** TypeScript 5.x (Strict mode)
* **Framework:** NestJS 11.x (Fastify adapter for maximum throughput)
* **Primary Database:** PostgreSQL 18.x + `pgvector`
* **ORM:** Prisma 7.x
* **Cache & Distributed Locks:** Redis 7.x
* **Object Storage:** AWS S3 / S3-Compatible with Object Lock & KMS Encryption
* **Realtime Audio & WebSocket:** Fastify WebSocket + WebRTC
* **Testing:** Vitest, Supertest, Testcontainers

---

## 🚀 Getting Started

To onboard as a developer on Phase 1+, follow the [Developer Onboarding Guide](MANVIA-DOCS/10_HANDOVER/Developer_Onboarding.md):

```bash
# 1. Switch to feature branch
git checkout feature/phase-1-backend-foundation

# 2. Copy environment file
cp .env.example .env.local

# 3. Spin up local PostgreSQL 18 & Redis
docker compose -f docker-compose.dev.yml up -d

# 4. Install dependencies & run migrations
npm install
npx prisma migrate dev
npm run seed

# 5. Start development server
npm run start:dev
```

---

## ⚖️ Governance & Compliance Readiness

MANVIA is designed and architected with compliance-readiness principles aligned with:
* **HIPAA** Security, Privacy, and Breach Notification frameworks (45 CFR Part 160 and Part 164)
* **GDPR** Article 9 principles for processing special categories of personal health data
* **ISO/IEC 27001** Information Security Management standards

> *Note: MANVIA does not claim formal statutory certification until a launch jurisdiction (OD-011) is confirmed and official third-party compliance audits are completed.*

---

*Copyright © 2026 MANVIA Health Technologies. All rights reserved.*
