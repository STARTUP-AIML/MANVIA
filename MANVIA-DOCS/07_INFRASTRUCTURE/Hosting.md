# MANVIA — Infrastructure Architecture

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Infrastructure Philosophy

MANVIA infrastructure must be:
- **Cloud-agnostic by design** — abstraction layers allow migration between providers.
- **Reproducible** — infrastructure is code (Terraform, Phase 20+).
- **Least-privilege** — each component has only the permissions it needs.
- **Observable** — all infrastructure components emit metrics and logs.
- **Recoverable** — documented disaster recovery procedures with tested backups.

---

## 2. Cloud Provider Decision

**DECISION REQUIRED (OD-001):** Cloud provider not yet selected.

Candidates:
- Google Cloud Platform (GCP)
- Amazon Web Services (AWS)
- Azure

See OPEN_DECISIONS.md for evaluation criteria.

---

## 3. Environments

| Environment | Purpose | Access |
|---|---|---|
| development | Local developer environment | Developer only; Docker Compose |
| staging | Pre-production integration | Dev team + QA |
| production | Live user traffic | Operations team only |

Staging must mirror production as closely as possible.

No real patient data in development or staging (see Data_Protection.md).

---

## 4. Production Infrastructure Components

### 4.1 Application Servers
- Docker containers running the NestJS application.
- Horizontal scaling: multiple instances behind a load balancer.
- Health check endpoint: `/health`.
- Container registry: DECISION REQUIRED (GCR / ECR / Docker Hub).

### 4.2 Load Balancer / API Gateway
- TLS termination.
- HTTP to HTTPS redirect.
- DDoS protection: DECISION REQUIRED (Cloud provider native / Cloudflare).
- WebSocket proxying (for realtime AI voice).

### 4.3 Database
- Managed PostgreSQL service (DECISION REQUIRED: Cloud SQL / RDS / Supabase).
- Primary + read replica (for reporting and non-critical reads).
- Automated backups with point-in-time recovery.
- Private VPC — not publicly accessible.
- Connection pooling: PgBouncer or equivalent.

### 4.4 Redis
- Managed Redis service (DECISION REQUIRED: Memorystore / ElastiCache / Upstash).
- Private VPC.
- Used for: sessions, rate limiting, event bus (Redis Streams), caching.

### 4.5 Object Storage
- S3-compatible provider (DECISION REQUIRED: OD-002).
- Private buckets — no public access.
- Server-side encryption enabled.
- Signed URLs for time-limited patient file access.
- Lifecycle policies for archival/deletion per retention policy.

### 4.6 CDN
- Static assets (frontend) served via CDN.
- API is not behind CDN (healthcare data must not be cached by CDN nodes).
- DECISION REQUIRED: CDN provider.

### 4.7 Domain and DNS
- Primary domain: DECISION REQUIRED.
- API subdomain: `api.manvia.com` or equivalent.
- DNS managed by: DECISION REQUIRED (Cloudflare / Route 53 / Cloud DNS).
- DNSSEC: DECISION REQUIRED.

---

## 5. Local Development Environment

Docker Compose will provide:

```yaml
services:
  api:        # NestJS application
  postgres:   # PostgreSQL
  redis:      # Redis
  minio:      # S3-compatible object storage (local only)
  pgadmin:    # Optional: database GUI
```

Developer setup requires:
- Docker and Docker Compose installed.
- `.env` file created from `.env.example`.
- `docker-compose up` to start all services.
- `npm run db:migrate` to apply migrations.
- `npm run db:seed` to load development seed data.

---

## 6. Terraform (Phase 20+)

All production infrastructure will be managed by Terraform when Phase 20 begins.

Benefits:
- Infrastructure changes are versioned, reviewed, and tested.
- Environments are reproducible.
- Disaster recovery is faster.

Until Phase 20, infrastructure is provisioned manually with documentation in [Deployment.md](Deployment.md).

---

## 7. Disaster Recovery

**DECISION REQUIRED:** RTO and RPO targets.

Minimum requirements:
- Daily database backups (point-in-time recovery via WAL archiving preferred).
- Backups stored in a separate geographic region.
- Backup restoration tested monthly.
- Runbook for each failure scenario: database failure, application crash, object storage failure.
- See: [../08_OPERATIONS/Disaster_Recovery.md](../08_OPERATIONS/Disaster_Recovery.md)

---

*Infrastructure details will be finalized when OD-001 (cloud provider) and OD-002 (object storage) are resolved.*
