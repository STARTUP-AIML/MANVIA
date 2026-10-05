# MANVIA — Production Infrastructure Architecture (M8)

## 1. Architectural Overview

MANVIA is engineered as a modular monolith adhering to high-reliability healthcare standards. The production runtime isolates untrusted public clients, protects private medical data, ensures transactional correctness via PostgreSQL, and provides low-latency caching and distributed locking through Redis.

```
                    ┌─────────────────────────┐
                    │    Cloudflare CDN / DNS │
                    │   (DDoS, TLS 1.3, WAF)  │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
       ┌──────────────────┐            ┌──────────────────┐
       │ Frontend (React) │            │ Backend Gateway  │
       │ Edge CDN Hosting │            │ Cloud Run (Fastify)
       └──────────────────┘            └────────┬─────────┘
                                                │
          ┌─────────────────────┬───────────────┴──────────────┬─────────────────────┐
          │                     │                              │                     │
          ▼                     ▼                              ▼                     ▼
┌───────────────────┐ ┌───────────────────┐  ┌───────────────────┐ ┌───────────────────┐
│ Managed Postgres  │ │   Managed Redis   │  │ S3 / GCS Storage  │ │ External Providers│
│ (Cloud SQL / RDS) │ │  (Memorystore)    │  │ (Private Buckets) │ │ - Razorpay (Pay)  │
│  - pgvector       │ │  - Rate Limiting  │  │  - Encrypted      │ │ - Resend (Email)  │
│  - ACID Source    │ │  - Redlock Locks  │  │  - Presigned URLs │ │ - Twilio (SMS)    │
│  - Zero Mocks     │ │  - Session Cache  │  │  - Magic Byte Val │ │ - FCM (Push)      │
└───────────────────┘ └───────────────────┘  └───────────────────┘ │ - Gemini AI/Live  │
                                                                   └───────────────────┘
```

---

## 2. Infrastructure Components

### 2.1 Backend Runtime
- **Hosting Engine:** Google Cloud Run (or AWS ECS Fargate) managed container runtime.
- **Process Model:** Single-process Node.js 24 LTS running Fastify with NestJS modular architecture.
- **Container Footprint:** Hardened multi-stage Alpine Linux container (`node:24-alpine`) running under unprivileged user `manvia:1001`.
- **Scaling Limits:**
  - Minimum instances: 2 (high availability across availability zones).
  - Maximum instances: 20 (autoscaled on CPU utilization > 70% or concurrent requests > 80).
- **Probes:**
  - Liveness: `GET /health/live` (HTTP 200, fast process loop check).
  - Readiness: `GET /health/ready` (evaluates PostgreSQL connection, Redis ping, heap memory).

### 2.2 Relational Database (Source of Truth)
- **Engine:** PostgreSQL 18+ with `pgvector` extension enabled.
- **Authority:** Authoritative source of truth for users, credentials, appointments, payments, refunds, care relationships, consent, doctor verifications, and audit logs.
- **Connection Management:** Prisma Client connected through PgBouncer / Google Cloud SQL Auth Proxy with connection pooling (`DATABASE_POOL_MIN=2`, `DATABASE_POOL_MAX=20`).
- **Data Protection:** Managed automatic daily backups, Point-In-Time-Recovery (PITR) with 7-day retention window, customer-managed encryption keys (CMEK) at rest, TLS 1.3 enforced in transit.

### 2.3 Distributed Cache & Redlock (Redis)
- **Engine:** Managed Redis 7+ (Google Cloud Memorystore / Upstash / AWS ElastiCache).
- **Role:** Distributed rate limiting (`RateLimitGuard`), transient session cache, distributed resource locking (`ILock` Redlock algorithm for appointment reservation double-booking prevention).
- **Correctness Rule:** Redis is strictly non-authoritative. Financial transactions, appointments, and consents must persist directly to PostgreSQL before returning success.

### 2.4 Durable Object Storage
- **Engine:** S3-compatible cloud object storage (AWS S3, Google Cloud Storage with S3 Interoperability, Cloudflare R2).
- **Driver:** `S3StorageService` utilizing AWS Signature Version 4 (SigV4).
- **Security:**
  - All storage buckets are strictly **private** with public access prevention (PAP) enforced.
  - Zero direct public URLs for medical documents or verification uploads.
  - Secure time-limited presigned download and upload URLs (TTL: 15 minutes).
  - Magic byte validation prevents MIME type spoofing (PDF: `%PDF-`, JPEG: `FF D8 FF`, PNG: `89 50 4E 47`).

### 2.5 Frontend Delivery
- **Hosting:** Cloudflare Pages or Cloud Storage + Cloud CDN.
- **Delivery:** Globally distributed edge CDN with gzip/brotli compression.
- **Secrets Boundary:** Client bundle contains exclusively `VITE_` prefixed public variables (`VITE_API_BASE_URL`, `VITE_APP_NAME`, `VITE_APP_ENV`). No secrets or API keys are bundled into client assets.

---

## 3. Network Architecture & Security Perimeters

### 3.1 Domain & TLS Configuration
- **Primary Domain:** `manvia.health` (managed via Cloudflare DNS).
- **API Domain:** `api.manvia.health` (routed to Backend Container Gateway).
- **Web App Domain:** `app.manvia.health` (routed to Frontend CDN).
- **TLS Requirement:** TLS 1.3 enforced. All plain HTTP requests are permanently redirected (`301 Moved Permanently`) to HTTPS.
- **HSTS:** `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` header applied.

### 3.2 CORS Production Allowlist
- **Rule:** Wildcards (`*`) are strictly prohibited in production.
- **Configured Origins:** `https://manvia.health`, `https://app.manvia.health`.
- **Allowed Methods:** `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- **Allowed Headers:** `Content-Type, Authorization, X-Request-ID, X-Correlation-ID, X-Device-Type, X-Device-Name`.
- **Credentials:** `credentials: true` supported with secure `SameSite=Strict; Secure; HttpOnly` cookies where sessions are used.

### 3.3 Rate Limiting & Throttling
- **Engine:** `RateLimitGuard` using `RedisCacheService`.
- **Authentication Endpoints:**
  - `POST /api/v1/auth/login`: 10 requests / 60s per IP (brute-force defense).
  - `POST /api/v1/auth/register`: 15 requests / 60s per IP (registration abuse defense).
  - `POST /api/v1/auth/refresh`: 30 requests / 60s per IP.
- **Transactional Endpoints:**
  - `POST /api/v1/appointments/reserve`: 20 requests / 60s per user or IP.
  - `POST /api/v1/payments`: 20 requests / 60s per user or IP.
  - `POST /api/v1/refunds`: 10 requests / 60s per user or IP.
- **Violation Response:** HTTP 429 Too Many Requests with `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers.
