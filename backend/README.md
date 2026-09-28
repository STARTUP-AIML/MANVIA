# MANVIA Backend Foundation

> **Phase 1 Deliverable — Repository and Engineering Foundation**  
> **Status:** Operational Baseline  
> **Runtime:** Node.js 24 LTS | **Language:** TypeScript 5.x (Strict)

---

## 1. Subsystem Overview

`backend/` contains the server-side code for the MANVIA platform. It is structured as a modular monolith in preparation for Phase 2 (NestJS + Fastify Foundation).

### Directory Structure

```
backend/
├── src/
│   ├── config/            # Strongly-typed environment variables (Zod)
│   ├── common/            # Error hierarchy, storage & observability interfaces
│   ├── health/            # Liveness and readiness health service
│   ├── database/          # Database connection boundary (Phase 3)
│   ├── cache/             # Redis cache & distributed lock interfaces
│   ├── events/            # Domain event bus abstractions
│   ├── modules/           # Domain business modules (Phase 4+)
│   ├── integrations/      # Third-party service adapters
│   ├── workers/           # Background job consumers
│   └── index.ts           # Foundation HTTP server & lifecycle bootstrap
├── test/
│   ├── unit/              # Isolated logic unit tests
│   ├── integration/       # Subsystem integration tests
│   └── e2e/               # HTTP API end-to-end tests
├── prisma/                # Prisma schema anchor (Phase 3 owns schema)
├── scripts/               # Maintenance and environment verification scripts
├── Dockerfile             # Multi-stage production container definition
├── .dockerignore          # Docker build exclusion rules
├── .env.example           # Sanitized environment variable template
├── tsconfig.json          # Strict production TypeScript compiler options
├── tsconfig.build.json    # Lean build compiler options (excluding tests)
├── eslint.config.mjs      # Modern ESLint 9 flat configuration
├── .prettierrc.json       # Code formatting rules
└── vitest.config.ts       # Test runner & coverage thresholds
```

---

## 2. Prerequisites

- **Node.js**: `v24.x` LTS (enforced by `backend/scripts/check-node-version.js`)
- **Package Manager**: `npm` `10+` (or `11+`)
- **Docker & Docker Compose**: For local PostgreSQL 18 & Redis 7 containers

---

## 3. Local Setup & Quickstart

```bash
# 1. From repository root or backend/ directory, install dependencies:
npm install

# 2. Configure environment file
cp .env.example .env

# 3. Start backing services (PostgreSQL + pgvector and Redis)
docker compose -f ../docker-compose.dev.yml up -d

# 4. Run in watch development mode
npm run dev

# 5. Access health checks
curl http://localhost:3000/health
curl http://localhost:3000/health/readiness
```

---

## 4. Available Scripts

| Command                    | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `npm run dev`              | Runs the development server with file watch (`tsx`) |
| `npm run build`            | Compiles TypeScript into `dist/`                    |
| `npm run start`            | Runs the compiled production server                 |
| `npm run lint`             | Runs ESLint 9 flat config across `src` and `test`   |
| `npm run lint:fix`         | Automatically fixes auto-fixable lint issues        |
| `npm run format`           | Formats all files with Prettier                     |
| `npm run format:check`     | Verifies formatting without modifying files         |
| `npm run typecheck`        | Validates TypeScript types without emitting code    |
| `npm test`                 | Runs the Vitest test suite                          |
| `npm run test:unit`        | Runs unit tests only                                |
| `npm run test:integration` | Runs integration tests only                         |
| `npm run test:e2e`         | Runs end-to-end API tests                           |
| `npm run test:cov`         | Generates test coverage report                      |

---

## 5. Docker Workflow

```bash
# Build multi-stage production image
docker build -t manvia-backend:latest .

# Run production container
docker run -p 3000:3000 --env-file .env.example manvia-backend:latest
```

---

## 6. Architecture Boundaries

- **Phase 1 (Completed):** Repository foundation, strict TypeScript, Vitest, ESLint, Prettier, Docker, CI, environment validation, health check service, storage abstraction interface.
- **Phase 2 (Upcoming):** NestJS framework initialization, Fastify HTTP adapter, Swagger/OpenAPI, global exception filters, request correlation ID middleware.
- **Phase 3 (Upcoming):** PostgreSQL schema design, Prisma client generation, database migrations, pgvector initialization.
- **Phase 4+:** Domain business modules (Identity, Patients, Doctors, Appointments, AI Companion, etc.).
