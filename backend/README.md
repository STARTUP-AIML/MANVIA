# MANVIA Backend Foundation

> **Phase 6 Deliverable — Patient Domain Foundation**
> **Status:** Production-Grade Patient Domain Operational
> **Runtime:** Node.js 24 LTS | **Language:** TypeScript 5.x (Strict) | **Framework:** NestJS 11.x (Fastify Adapter) | **Database:** PostgreSQL 18.x + Prisma 7.x

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
- **Phase 4 (Completed):** Central immutable User identity, isolated PasswordCredential (Argon2id), session management & ADR-009 token family rotation with breach replay mitigation, AuthGuard & `@CurrentUser()`, AuthAuditService security event logging, versioned endpoints `/api/v1/auth/*`, and PostgreSQL migrations.
- **Phase 5 (Completed):** Authorization and security enforcement foundation (RBAC with RolesGuard, PermissionService, ResourceOwnerGuard for ownership & IDOR mitigation, PolicyGuard, active role switching, fail-closed security, 401 vs 403 enforcement, security audit integration).
- **Phase 6 (Next):** Patient Domain (PatientProfile, medical preferences, health records, wellness timeline).
- **Phase 7+:** Doctor Platform, Appointments, AI Companion, and additional business systems.

---

## 9. Identity & Authentication Architecture (Phase 4)

### 9.1 Architectural Boundaries

MANVIA maintains **one central immutable `User` identity** that anchors all platform interactions:

```
User (Central Identity)
 ├── Authentication & Credentials (password_credentials via Argon2id)
 ├── Account Lifecycle (ACTIVE, SUSPENDED, DEACTIVATED, LOCKED)
 ├── Authentication Sessions (sessions & refresh_tokens)
 ├── Security Audit Events (audit_logs)
 └── Future Role Profiles (PatientProfile in Phase 6, DoctorProfile in Phase 7)
```

- **Separation of Identity & Credentials:** Passwords are never stored on `users`; they are isolated in `password_credentials` with cascade deletion.
- **Zero Secret Leakage:** Password hashes, raw credentials, and session tokens are strictly excluded from API responses, logs, and error envelopes.
- **Atomic Operations:** Registration multi-table operations execute within `PrismaService.executeTransaction()`.

### 9.2 ADR-009: Token Rotation & Replay Attack Mitigation

- **Access Token:** Short-lived JWT (15-minute default) carrying minimal claims (`sub`, `sessionId`, `roles`, `activeRole`, `jti`).
- **Refresh Token:** 256-bit cryptographically random opaque string stored as a deterministic SHA-256 hash.
- **Token Family Tracking:** Each session maintains a token family UUID (`familyId`).
- **Replay Attack Detection:** If an already-used refresh token is presented again, the system immediately revokes the **entire token family**, revokes the session, and logs a critical forensic security audit event (`AUTH.BREACH_ATTEMPT_DETECTED`).

### 9.3 Authentication Endpoints

| Method | Endpoint                       | Protection    | Description                                        |
| ------ | ------------------------------ | ------------- | -------------------------------------------------- |
| `POST` | `/api/v1/auth/register`        | Public        | Atomically registers central identity & credential |
| `POST` | `/api/v1/auth/login`           | Public        | Authenticates credentials & issues session tokens  |
| `POST` | `/api/v1/auth/refresh`         | Public        | Rotates refresh token & issues new access JWT      |
| `POST` | `/api/v1/auth/logout`          | Bearer (Auth) | Revokes active session & invalidates token family  |
| `POST` | `/api/v1/auth/change-password` | Bearer (Auth) | Changes password & revokes existing sessions       |
| `GET`  | `/api/v1/auth/me`              | Bearer (Auth) | Resolves authenticated user identity context       |

---

## 10. Authorization & Security Foundation (Phase 5)

### 10.1 Layered Authorization Architecture

Authentication and authorization are strictly separated across all endpoints:

```
Request
  │
  ▼
AuthGuard (Phase 4: "Who is this user?")
  │
  ▼
UserContext (Sanitized Identity: id, email, roles, activeRole, sessionId)
  │
  ▼
RolesGuard / ResourceOwnerGuard / PolicyGuard (Phase 5: "What is this user allowed to do?")
  │
  ▼
Controller Action (Business Execution)
```

- **Default Deny:** Endpoints and resources deny access by default unless explicitly allowed by assigned roles, permissions, or ownership rules.
- **401 vs 403 Distinction:**
  - `401 Unauthorized`: Returned when authentication is missing, invalid, or expired.
  - `403 Forbidden`: Returned when the user is authenticated but lacks required role privileges, permissions, or resource ownership.
- **No Information Leakage:** Authorization rejections return a generic error message and never disclose whether a target resource exists.

### 10.2 Role-Based Access Control (RBAC)

- **Roles:** `PATIENT`, `DOCTOR`, `ADMIN` (anchored to the central `User` identity).
- **Permissions:** Granular enum values mapped per role via `PermissionService` (e.g. `USER_READ`, `PATIENT_PROFILE_READ`, `DOCTOR_PROFILE_READ`, `ADMIN_ACCESS`, `AUDIT_LOG_READ`).
- **Decorators:**
  - `@Roles(Role.DOCTOR, Role.ADMIN)`: Configures allowed roles for a route.
  - `@Permissions(Permission.USER_READ)`: Configures fine-grained permission requirements.
- **Active Role Validation & Switching:**
  - A user with multiple roles operates under a validated `activeRole`.
  - RolesGuard validates that `activeRole` is strictly present in `user.roles`, completely preventing client-side role spoofing and vertical privilege escalation.
  - Role switching is handled securely via `POST /api/v1/auth/switch-role`.

### 10.3 Resource Ownership & IDOR Protection

- **`ResourceOwnerGuard` & `@RequireOwnership()`:**
  - Verifies that the requesting user (`user.id`) matches the targeted resource owner parameter (`userId` or `id`).
  - Client-supplied IDs in request bodies or query strings cannot override the server-validated authenticated context.
- **Admin Access Restrictions:**
  - `ADMIN` role does **not** possess an automatic bypass for sensitive patient health records.
  - Administrative override requires explicit decorator opt-in (`@RequireOwnership({ allowAdmin: true })`) and automatically emits an auditable security event (`AUTH.ADMIN_RESOURCE_ACCESS`).

### 10.4 Extensible Policy Engine (Preparation for Phase 10)

- **`IPolicyHandler` & `PolicyGuard`:**
  - Provides a generic policy evaluation interface: `can(user, action, resource)` and `handle(context)`.
  - Establishes the exact architectural boundary required for future domain policies (e.g. `CareRelationshipPolicy` and `ConsentPolicy`) without modifying core authorization logic.

### 10.5 Authorization Endpoints

| Method | Endpoint                   | Protection    | Description                                             |
| ------ | -------------------------- | ------------- | ------------------------------------------------------- |
| `POST` | `/api/v1/auth/switch-role` | Bearer (Auth) | Switches active role and issues new access JWT          |
| `GET`  | `/api/v1/auth/permissions` | Bearer (Auth) | Returns active role and permissions for current session |

---

## 11. Patient Domain Foundation (Phase 6)

### 11.1 Architecture & Single Identity Anchor

- **Central User Anchor:** The `User` entity established in Phase 4 remains the single central authentication identity.
- **1-to-0..1 Relationship:** `User 1 ───── 0..1 PatientProfile`. The patient profile stores domain-specific demographic data without duplicating credentials, secrets, or tokens.
- **Future Multi-Role Compatibility:** The `User` model supports multi-domain participation (e.g. `PatientProfile`, and later `DoctorProfile`) without collapsing user identity into a single domain.

### 11.2 Public Patient Identifier

- **Public ID Strategy:** Format `PAT-XXXXXXXX` (e.g., `PAT-48291048`) generated via cryptographically secure random bytes (`patient-id.generator.ts`).
- **Safety:** Uniquely indexed, non-sequential, safe for exposure in client UIs, decoupled from internal UUID primary keys.

### 11.3 Security & IDOR Mitigation

- **Ownership Resolution:** Patient endpoints (`/api/v1/patients/me`) resolve the patient profile strictly through the server-side authenticated context (`req.user.id`).
- **No Client Identifiers Trusted:** Route paths and request bodies cannot specify `patientId`, `userId`, or `role` to access another patient's data.
- **Mass Assignment Protection:** NestJS global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` strictly blocks client attempts to overwrite internal IDs, timestamps, or authorization fields.
- **Role-Based Protection:** Protected by `@Roles(Role.PATIENT)` and `RolesGuard`, blocking non-patient users (403 Forbidden).

### 11.4 Audit Logging

- Patient profile creation (`PATIENT.PROFILE_CREATED`) and sensitive updates (`PATIENT.PROFILE_UPDATED`) are recorded via `AuthAuditService` with sanitized metadata (no secrets or PHI clinical details logged).

### 11.5 Patient Endpoints

| Method  | Endpoint              | Protection       | Description                                                            |
| ------- | --------------------- | ---------------- | ---------------------------------------------------------------------- |
| `POST`  | `/api/v1/patients/me` | Bearer (PATIENT) | Initializes patient profile for authenticated user identity            |
| `GET`   | `/api/v1/patients/me` | Bearer (PATIENT) | Retrieves authenticated patient's profile (404 if not yet initialized) |
| `PATCH` | `/api/v1/patients/me` | Bearer (PATIENT) | Updates permitted demographic fields                                   |
