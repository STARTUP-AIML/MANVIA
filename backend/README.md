# MANVIA Backend Foundation

> **Phase 2 Deliverable — NestJS + Fastify Backend Foundation**  
> **Status:** Production-Grade Application Foundation Operational  
> **Runtime:** Node.js 24 LTS | **Language:** TypeScript 5.x (Strict) | **Framework:** NestJS 11.x (Fastify Adapter)

---

## 1. Subsystem Overview

`backend/` contains the server-side code for the MANVIA platform, architected as a modular monolith in NestJS utilizing Fastify for high-throughput HTTP performance.

### Directory Structure

```
backend/
├── src/
│   ├── config/            # Strongly-typed environment variables (Zod) & Swagger configuration
│   ├── common/            # Error hierarchy, exception filter, validation pipe, request correlation & logging
│   │   ├── decorators/    # @RequestId() parameter decorator
│   │   ├── dto/           # Infrastructure validation DTOs
│   │   ├── errors/        # AppError hierarchy (ValidationError, NotFoundError, etc.)
│   │   ├── filters/       # GlobalExceptionFilter (RFC 7807/standardized error envelope)
│   │   ├── interceptors/  # LoggingInterceptor (redacted structured HTTP logging)
│   │   ├── interfaces/    # Storage abstraction interface
│   │   ├── observability/ # Telemetry interface
│   │   └── pipes/         # Global ValidationPipe (whitelist, forbidNonWhitelisted, transform)
│   ├── health/            # Liveness, readiness, and overall health service & endpoints
│   ├── database/          # PostgreSQL 18 + Prisma 7 database module, PrismaService, transactions & health
│   ├── cache/             # Redis cache & distributed lock abstractions (Phase 2/3)
│   ├── events/            # Domain event bus abstractions
│   ├── modules/           # Domain business modules (Phase 4+)
│   ├── integrations/      # Third-party service adapters
│   ├── workers/           # Background job consumers
│   ├── app.controller.ts  # Platform root metadata & api/v1 baseline endpoints
│   ├── app.module.ts      # NestJS root application module
│   ├── main.ts            # FastifyAdapter bootstrap, Helmet security, CORS, Swagger & shutdown hooks
│   └── index.ts           # Re-exports main.js for entrypoint backwards compatibility
├── test/
│   ├── unit/              # Isolated logic unit tests (env, error, health, filter, pipe, request-id, logging, database)
│   ├── integration/       # Subsystem integration tests (foundation, swagger, database)
│   └── e2e/               # HTTP API end-to-end tests (health, api, validation)
├── prisma/                # Prisma 7 schema & migrations directory
├── prisma.config.ts       # Prisma 7 CLI configuration & migration datasource
├── scripts/               # Maintenance and environment verification scripts
├── Dockerfile             # Multi-stage production container definition
├── .dockerignore          # Docker build exclusion rules
├── .env.example           # Sanitized environment variable template
├── tsconfig.json          # Strict production TypeScript compiler options
├── tsconfig.build.json    # Lean build compiler options (excluding tests)
├── eslint.config.mjs      # Modern ESLint 9 flat configuration
├── .prettierrc.json       # Code formatting rules
└── vitest.config.ts       # Test runner with swc compiler & coverage thresholds
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
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready

# 6. Access OpenAPI / Swagger UI
open http://localhost:3000/docs
```

---

## 4. Endpoints Baseline (Phase 2)

| Method | Endpoint        | Description                                                |
| ------ | --------------- | ---------------------------------------------------------- |
| `GET`  | `/`             | Platform root metadata and system status                   |
| `GET`  | `/api/v1`       | API v1 baseline status and prefix confirmation             |
| `GET`  | `/health`       | Overall system health check                                |
| `GET`  | `/health/live`  | Process liveness probe (alias: `/health/liveness`)         |
| `GET`  | `/health/ready` | Traffic readiness probe (alias: `/health/readiness`)       |
| `GET`  | `/docs`         | Interactive Swagger / OpenAPI documentation (configurable) |

All future business endpoints automatically inherit the `/api/v1/` route prefix via NestJS `app.setGlobalPrefix('api/v1')`.

---

## 5. Security & Request Correlation

- **Security Headers:** `@fastify/helmet` enforces HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, and customized Content Security Policy for Swagger UI.
- **CORS:** Environment-configurable via `CORS_ALLOWED_ORIGINS`. In production, strict origin validation is enforced.
- **Request Correlation:** Every incoming request receives or generates a cryptographically secure UUID stamped into `X-Request-ID` and `X-Correlation-ID` response headers.
- **Global Validation:** Configured with `whitelist: true`, `forbidNonWhitelisted: true`, and implicit/explicit type transformation.
- **Global Exception Filter:** All errors follow the canonical MANVIA error envelope format (`statusCode`, `error`, `message`, `details`, `requestId`, `timestamp`). Stack traces are stripped in production.
- **Safe Logging:** Structured logging using request correlation; credentials, authorization headers, passwords, and healthcare data are strictly redacted.

---

## 6. Available Scripts

| Command                     | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `npm run dev`               | Runs the development server with file watch (`tsx`)        |
| `npm run build`             | Generates Prisma client and compiles TypeScript to `dist/` |
| `npm run start`             | Runs the compiled production server (`dist/main.js`)       |
| `npm run db:generate`       | Generates Prisma 7 client from schema                      |
| `npm run db:migrate`        | Runs Prisma migrations in development                      |
| `npm run db:migrate:deploy` | Applies pending Prisma migrations in production            |
| `npm run db:migrate:status` | Checks Prisma migration status                             |
| `npm run db:validate`       | Validates `prisma/schema.prisma` integrity                 |
| `npm run lint`              | Runs ESLint 9 flat config across `src` and `test`          |
| `npm run lint:fix`          | Automatically fixes auto-fixable lint issues               |
| `npm run format`            | Formats all files with Prettier                            |
| `npm run format:check`      | Verifies formatting without modifying files                |
| `npm run typecheck`         | Validates TypeScript types without emitting code           |
| `npm test`                  | Runs the Vitest test suite                                 |
| `npm run test:unit`         | Runs unit tests only                                       |
| `npm run test:integration`  | Runs integration tests only                                |
| `npm run test:e2e`          | Runs end-to-end API tests                                  |
| `npm run test:cov`          | Generates test coverage report                             |

---

## 7. Docker Workflow

```bash
# Start local PostgreSQL 18 & Redis development services
docker compose -f ../docker-compose.dev.yml up -d

# Build multi-stage production image
docker build -t manvia-backend:latest .

# Run production container
docker run -p 3000:3000 --env-file .env.example manvia-backend:latest
```

---

## 8. Architecture Boundaries

- **Phase 1 (Completed):** Repository foundation, strict TypeScript, Vitest, ESLint, Prettier, Docker, CI, environment validation, health check service, storage abstraction interface.
- **Phase 2 (Completed):** NestJS application bootstrap, Fastify HTTP adapter, global ValidationPipe, GlobalExceptionFilter, request correlation ID (`X-Request-ID`), Helmet security baseline, environment-driven CORS, health endpoints (`/health`, `/health/live`, `/health/ready`), Swagger/OpenAPI (`/docs`), graceful shutdown hooks.
- **Phase 3 (Completed):** PostgreSQL 18.x (`pgvector/pgvector:pg18`), Prisma 7.x client lifecycle, `PrismaService`, `DatabaseModule`, connection pooling (`pg.Pool`), transaction execution foundation, database health/readiness probe, migration tooling (`db:generate`, `db:migrate`, `db:validate`), Docker PostgreSQL 18 container setup.
- **Phase 4+:** Domain business modules (Identity, Authentication, Patients, Doctors, Appointments, AI Companion, etc.).
