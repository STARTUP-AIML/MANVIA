# MANVIA — Database Layer Architecture (Phase 3 Foundation)

> **Phase 3 Baseline:** PostgreSQL 18.x (`pgvector/pgvector:pg18`), Prisma 7.x

---

## 1. Overview & Architectural Boundaries

PostgreSQL is the single authoritative consistency boundary for the MANVIA healthcare platform. It provides ACID transactions, relational integrity, exclusion constraints (e.g. double-booking prevention), and long-term persistence. Redis is strictly a secondary store for caching and rate limiting, never replacing PostgreSQL as the source of truth.

In strict compliance with Phase 3 specifications, this layer establishes **infrastructure only**. No business domain models (User, Patient, Doctor, Appointment, HealthRecord, etc.) exist in this phase; future domain phases (Phase 4+) will author their respective models and migrations on top of this foundation.

### Data Access Architecture Convention

All future business domain modules must follow this unidirectional boundary:

```text
Controller
    ↓
Domain Service
    ↓
Repository / Data Access Boundary (ITransactionalRepository)
    ↓
PrismaService
    ↓
PostgreSQL 18.x
```

- **No Direct Prisma Instantiation:** Controllers and services must **never** instantiate `new PrismaClient()`. All database operations are mediated by the global `PrismaService`.
- **Repository Pattern:** Domain repositories implement `ITransactionalRepository` and accept an optional `TransactionClient` so that services can coordinate multi-repository atomic transactions.

---

## 2. Prisma 7.x Configuration & Client Lifecycle

### Prisma 7 Architecture

Prisma 7 separates CLI configuration from schema definitions:

1. `prisma/schema.prisma` declares data models and datasource provider (`postgresql`). Datasource URLs are no longer declared in the schema file.
2. `prisma.config.ts` manages environment variables and datasource URLs for Prisma CLI and migration commands.
3. At runtime, `PrismaService` connects via `@prisma/adapter-pg` backed by a managed `pg.Pool`.

### Connection Pooling & Lifecycle

`PrismaService` manages connection pooling via `pg.Pool`:

- `DATABASE_POOL_MIN`: Minimum idle pool connections (default: `2`).
- `DATABASE_POOL_MAX`: Maximum active pool connections (default: `10`).
- `DATABASE_CONNECTION_TIMEOUT_MS`: Connection acquisition timeout (default: `10000ms`).

### Lifecycle Integration

- **`onModuleInit`**: Establishes connection via `$connect()`. Logs sanitized connection target (never credentials). In production, fails fast if database is unreachable.
- **`onApplicationShutdown`**: Drains connection pool (`pool.end()`) and disconnects Prisma (`$disconnect()`) cleanly upon `SIGTERM` or `SIGINT`.

---

## 3. Database Health & Readiness

Health monitoring distinguishes between liveness and readiness:

- **`GET /health` / `GET /health/live`**: Process liveness probe. Returns 200 OK immediately if the Fastify process is responsive, even if the database is temporarily unreachable.
- **`GET /health/ready`**: Application readiness probe. Executes a lightweight database connectivity check (`SELECT 1`). Returns 200 with `components.database.status = "healthy"` when reachable; returns 503 Service Unavailable if unreachable.

---

## 4. Transaction Strategy

Interactive transactions are executed using `PrismaService.executeTransaction` or `prisma.$transaction`:

```typescript
const result = await this.prisma.executeTransaction(async (tx) => {
  // 1. Atomic operation A using tx
  // 2. Atomic operation B using tx
  return value;
});
```

### Transaction Rules

1. **Atomicity**: Multi-entity mutations that represent a single business event (e.g., booking appointment + creating audit event + reserving slot) must execute within a transaction.
2. **No External Network Calls**: Never perform external HTTP requests (Stripe, Twilio, SendGrid, S3 uploads) inside a database transaction block. Perform external calls before or after the transaction boundary.
3. **Transaction Timeout**: Transactions must remain short-lived (< 5000ms) to prevent PostgreSQL connection pool exhaustion and table lock contention.

---

## 5. Migration Workflow

Migrations must always be executed through Prisma Migrate:

| Operation              | Command                     | Environment                |
| ---------------------- | --------------------------- | -------------------------- |
| Generate Prisma Client | `npm run db:generate`       | All environments           |
| Apply Dev Migrations   | `npm run db:migrate`        | Local development only     |
| Deploy Migrations      | `npm run db:migrate:deploy` | Staging / Production CI/CD |
| Check Migration Status | `npm run db:migrate:status` | All environments           |
| Validate Schema        | `npm run db:validate`       | CI and pre-commit          |

> **Safety Rule**: `prisma db push` must NEVER be used in production. Migrations must be version-controlled SQL files in `prisma/migrations/`.

---

## 6. Local Development with Docker

To start the local PostgreSQL 18 development database:

```bash
# 1. Start PostgreSQL 18 container
docker compose -f docker-compose.dev.yml up -d postgres

# 2. Verify container is healthy
docker compose -f docker-compose.dev.yml ps

# 3. Generate Prisma client
npm run db:generate

# 4. Run tests
npm test
```
