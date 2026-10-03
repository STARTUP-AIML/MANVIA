# MANVIA Prisma Schema & Migrations Directory

> **Phase 3 Baseline:** PostgreSQL 18.x, Prisma 7.x

## Structure

- `schema.prisma`: Authoritative Prisma data schema (declares generator and datasource provider `postgresql`).
- `../prisma.config.ts`: Prisma 7 configuration file declaring datasource URL for CLI operations (`prisma migrate`, `prisma validate`, `prisma studio`).
- `migrations/`: Version-controlled SQL migration directory (populated by future domain phases).

## Guidelines for Phase 4+ (Domain Implementations)

1. **No Manual Schema Modifications in Production**: Always run `npm run db:migrate` in local development to generate declarative, reversible SQL migrations.
2. **PostgreSQL Extensions**: When adding vector embeddings in AI phases, declare `extensions = [pgvector]` in `schema.prisma`.
3. **Double Booking Prevention**: Composite exclusion constraints must be written in custom migration SQL (`EXCLUDE USING gist`) as specified in ADR-003.
4. **Never Bypass PrismaService**: Always inject `PrismaService` from `@manvia/backend` rather than creating independent `PrismaClient` instances.
