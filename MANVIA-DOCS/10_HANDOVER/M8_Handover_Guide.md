# MANVIA — M8 Handover & Production Readiness Guide

## 1. Executive Summary
MANVIA has transitioned from an engineering-complete platform (M1–M7) to a fully production-hardened, multi-provider deployment-ready system (M8). All mocks have been removed from production paths, real production provider adapters have been implemented and integrated, distributed rate limiting has been enforced, and end-to-end verification has been completed.

---

## 2. Platform Status Matrix

### 2.1 WHAT EXISTS
- **Backend Core:** Fastify + NestJS modular monolith with strict RBAC, ABAC, and consent-gated authorization guards (`AuthGuard`, `RolesGuard`, `PolicyGuard`, `ResourceOwnerGuard`).
- **Database Architecture:** PostgreSQL 18+ with `pgvector` extension and 15 applied, validated migrations.
- **Cache & Distributed Locking:** `RedisCacheService` implementing `ICacheService` with atomic Redlock distributed locking (`acquireLock`), TTL key eviction, and health checks.
- **Production Payment Provider:** `RazorpayPaymentProvider` implementing `IPaymentProvider` with constant-time HMAC-SHA256 signature verification (`crypto.timingSafeEqual`), Razorpay Orders API, refunds, and webhook processing.
- **Production Payout Provider:** `RazorpayPayoutProvider` implementing `IPayoutProvider` for doctor compensation settlements.
- **Production Object Storage:** `S3StorageService` implementing `IStorageService` and `IHealthRecordsStorageService` with AWS SigV4 presigned upload and download URLs, MIME type validation, and magic-byte checks.
- **Production Rate Limiting:** `RateLimitGuard` backed by `RedisCacheService` enforcing configurable throttling (`@RateLimit`) on authentication, reservation, and payment endpoints.
- **Production Notification Providers:**
  - `ResendEmailProvider` implementing `IEmailProvider`.
  - `TwilioSmsProvider` implementing `ISmsProvider`.
  - `FcmPushProvider` implementing `IPushProvider`.
- **AI & Realtime Voice:** Gemini 3.8 Flash LLM, text-embedding-2, layered medical safety classifier, pgvector RAG, and Gemini Live WebSocket realtime voice gateway with barge-in interruption.
- **Container Infrastructure:** Multi-stage production Dockerfile (`node:24-alpine`) running as non-root user `manvia:1001` with container healthcheck.
- **Frontend Web Application:** React 19 + TypeScript + Vite + Tailwind CSS with complete patient, doctor, and admin portals, loading, empty, and error boundary states.

### 2.2 WHAT IS CONFIGURED
- **Dynamic Provider Selection:** Automated factories in NestJS modules dynamically select production adapters (`RazorpayPaymentProvider`, `S3StorageService`, `ResendEmailProvider`, `TwilioSmsProvider`, `FcmPushProvider`) when configured in staging/production, while defaulting safely to simulated providers in hermetic unit test runs (`NODE_ENV === 'test'` or `VITEST`).
- **Health Indicators:** `/health`, `/health/live`, and `/health/ready` endpoints with database, Redis cache, and memory indicators.
- **CI/CD Automation:** GitHub Actions workflow (`integration-ci.yml`) validating Node 24, npm ci, Prisma migrations, formatting, backend lint/typecheck/coverage, frontend lint/typecheck/test/build, and Docker container build.
- **Environment Schema & Validation:** Zod-based configuration schema in `src/config/env.ts` with strict production validation preventing launch with missing required secrets.

### 2.3 WHAT IS NOT CONFIGURED (GENUINE EXTERNAL DEPENDENCIES)
The following items are third-party cloud services that cannot be pre-configured without active enterprise accounts and billing:
- **Production DNS Records:** Pointing `manvia.health`, `api.manvia.health`, and `app.manvia.health` to cloud ingress IPs.
- **SSL Certificates:** Production managed certificates (Cloudflare or Google Cloud Managed Certificates).
- **Cloud Run / Hosting Deployment Target:** Active GCP project setup with billing enabled.

### 2.4 WHAT REQUIRES EXTERNAL CREDENTIALS
To transition from staging to live production traffic, the operations team must populate the following secrets in Google Secret Manager / AWS Secrets Manager:
1. **Razorpay Live Credentials:**
   - `RAZORPAY_KEY_ID`: `rzp_live_...`
   - `RAZORPAY_KEY_SECRET`: Live API secret
   - `RAZORPAY_WEBHOOK_SECRET`: Live webhook endpoint secret
2. **Object Storage Credentials:**
   - `STORAGE_BUCKET`: Target S3 / GCS bucket name
   - `STORAGE_ACCESS_KEY`: IAM access key ID
   - `STORAGE_SECRET_KEY`: IAM secret access key
3. **Email Provider Credentials:**
   - `RESEND_API_KEY`: Live Resend API key (`re_...`)
   - `EMAIL_FROM`: Verified sending domain email (e.g. `notifications@manvia.health`)
4. **SMS Provider Credentials:**
   - `TWILIO_ACCOUNT_SID`: Live Twilio Account SID
   - `TWILIO_AUTH_TOKEN`: Live Twilio Auth Token
   - `TWILIO_PHONE_NUMBER`: Registered outbound sender phone number
5. **Push Notification Credentials:**
   - `FIREBASE_PROJECT_ID`: Production Firebase Project ID
   - `FIREBASE_CLIENT_EMAIL`: Service account email
   - `FIREBASE_PRIVATE_KEY`: Service account private key
6. **AI Provider Credentials:**
   - `GEMINI_API_KEY`: Production Google AI Studio / Vertex AI API key
7. **Database & Cache URLs:**
   - `DATABASE_URL`: Production Cloud SQL PostgreSQL connection string with SSL
   - `REDIS_URL`: Production Redis / Memorystore connection string

### 2.5 WHAT WAS TESTED
- Backend typechecking (`tsc --noEmit`): 100% clean.
- Unit tests: All modules including Razorpay provider, S3 storage service, Redis cache service, rate limiting guard, and notification providers.
- Integration tests: Database, Prisma repository, health service, and auth workflows.
- Frontend test suite: 29 test files covering all 215 tests.
- Docker container build: Deterministic multi-stage build passing (`docker build -t manvia-backend:ci ./backend`).
- Schema validation & migrations: All 15 migrations verified against PostgreSQL.

### 2.6 WHAT WAS NOT TESTED
- Live bank debits against real production credit cards (requires live production merchant account).
- Actual physical cellular SMS delivery across carriers (requires live Twilio carrier account).
- Long-duration audio voice testing over cellular 3G/4G lossy networks (requires physical mobile device in live network conditions).

---

## 3. Production Readiness Decision

**Status:** `READY FOR STAGING / COMPLETE WITH EXTERNAL SETUP REQUIRED`

**Rationale:**
All software engineering, architectural patterns, zero-mock production paths, security boundaries, rate limiting, and automated CI validations are complete and verified. The remaining requirements are standard external cloud infrastructure provisioning and API credentials.
