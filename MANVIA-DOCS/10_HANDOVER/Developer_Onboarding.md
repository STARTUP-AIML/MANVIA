# MANVIA — Developer Onboarding Guide

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Welcome to the Engineering Team

Welcome to MANVIA! This guide walks backend and full-stack engineers through establishing a local development environment and understanding our engineering conventions.

---

## 2. Prerequisites & Tooling

Ensure your workstation has the following installed:
* **Node.js:** v24.x LTS (recommended to manage via `nvm` or `fnm`)
* **Package Manager:** `npm` (v10+)
* **Docker & Docker Compose:** Docker Desktop or Colima for local PostgreSQL 18 & Redis instances
* **Git:** Configured with your GPG or SSH signing key
* **Database Client:** pgAdmin, DBeaver, or TablePlus

---

## 3. Local Environment Setup in 5 Steps

### Step 1: Clone Repository & Switch to Feature Branch
```bash
git clone git@github.com:manvia-health/manvia.git
cd manvia
git checkout feature/phase-1-backend-foundation
```

### Step 2: Configure Environment Variables
Copy the sample environment file:
```bash
cp .env.example .env.local
```
Key local settings:
```ini
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manvia_dev?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret-dev-key-change-in-prod-min-32-chars
JWT_REFRESH_SECRET=super-secret-refresh-key-change-in-prod-min-32-chars
```

### Step 3: Launch Local Backing Services (Docker Compose)
```bash
docker compose -f docker-compose.dev.yml up -d
```
This starts PostgreSQL 18 with `pgvector` enabled and Redis 7.

### Step 4: Install Dependencies & Run Database Migrations
```bash
npm install
npx prisma migrate dev
npm run seed
```

### Step 5: Start the NestJS Development Server
```bash
npm run start:dev
```
Access the interactive OpenAPI Swagger UI at `http://localhost:3000/docs`.

---

## 4. Coding Standards & Git Workflow

* **TypeScript Strictness:** No `any`. Strict null checks are enforced by `tsconfig.json`.
* **Testing:** Every new endpoint or service method requires accompanying unit/integration tests written with Vitest:
  ```bash
  npm run test
  npm run test:e2e
  ```
* **Git Commit Conventions:** Follow Conventional Commits:
  * `feat(auth): implement refresh token rotation`
  * `fix(appointments): resolve redis slot lock ttl race condition`
  * `test(wellness): add edge case tests for negative sleep hours`
* **Branch Policy:** All development happens on the designated phase branch (`feature/phase-X-...`). PRs target `backend`. Direct pushes to protected branches are blocked.
