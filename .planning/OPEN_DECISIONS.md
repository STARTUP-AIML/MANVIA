# MANVIA — Open Decisions Registry

> Version: 0.1.0-phase0
> Last Updated: 2026-09-28

All architectural, product, and infrastructure decisions that have not yet been finalized are tracked here. These decisions block or constrain specific phases.

Format: Each entry includes the decision ID, description, affected phases, options, recommendation (if any), and resolution status.

**DECISION REQUIRED** = Must be resolved before the phase that depends on it begins.
**DEFERRED** = Intentionally deferred; does not block current phases.

---

## Infrastructure and Cloud

### OD-001 — Cloud Provider Selection
**Status:** DECISION REQUIRED before Phase 8 (production credential storage)
**Affected phases:** 2, 3, 8, 12, 17, 19, 20

Which cloud provider(s) will host MANVIA in production?

**Options:**
- Google Cloud Platform (GCP) — Strong AI integration via Vertex AI / Gemini
- AWS — Broadest service ecosystem, strong healthcare compliance tooling
- Azure — Good compliance, Microsoft ecosystem
- Multi-cloud or hybrid — More complexity, higher cost

**Considerations:**
- If AI provider is Google Gemini, GCP reduces egress costs and latency.
- Healthcare compliance frameworks (BAA agreements, data protection addenda) vary by provider.
- Developer familiarity matters.

**LEGAL / REGULATORY REVIEW REQUIRED:** Cloud provider must offer a BAA or equivalent data processing agreement appropriate to target jurisdiction once confirmed.

**Resolution:** NOT YET RESOLVED

---

### OD-002 — Object Storage Provider
**Status:** DECISION REQUIRED before Phase 8 (doctor verification document uploads) and Phase 12 (clinical health records)
**Affected phases:** 2, 8, 12, 16, 20

Which S3-compatible object storage service will store doctor credentials, health records, media, and AI documents?

**Options:**
- AWS S3
- Google Cloud Storage (GCS)
- Cloudflare R2 (no egress fees)
- Azure Blob Storage
- Self-hosted MinIO (development/staging/local Docker)

**Recommendation:** Define a generic `StorageService` abstraction interface in Phase 2 with a local/MinIO driver for development. This decouples Phase 8 (doctor verification document uploads) and Phase 12 (health records) from the final cloud infrastructure provider decision.

**Resolution:** NOT YET RESOLVED

---

### OD-009 — Observability and Monitoring Stack
**Status:** DECISION REQUIRED before Phase 2 (initial instrumentation setup)
**Affected phases:** 2, 20

What observability vendor / stack will MANVIA use?

**Options:**
- Datadog — Full-stack, expensive at scale
- Grafana Cloud + Prometheus + Loki + Tempo — Open-source stack, lower cost
- GCP Operations Suite (if GCP chosen)
- AWS CloudWatch (if AWS chosen)
- New Relic
- OpenTelemetry collector + vendor-agnostic approach (recommended)

**Recommendation:** Use OpenTelemetry SDK throughout the codebase. Choose vendor in Phase 2 or Phase 20. This keeps instrumentation decoupled from vendor.

**Resolution:** NOT YET RESOLVED

---

## AI and Machine Learning

### OD-003 — Primary AI Provider Selection
**Status:** DECISION REQUIRED before Phase 15
**Affected phases:** 15, 16, 17

Which AI model provider will be the primary provider for MANVIA AI?

**Options:**
- Google Gemini (via Vertex AI or Gemini API)
- OpenAI (GPT-4 family, o-series, realtime API)
- Anthropic Claude
- Medical-specialized models (for RAG and clinical reasoning)
- Self-hosted open-source models

**Architecture rule:** The AI provider abstraction (AIProvider interface) must be implemented regardless of choice, so no phase code is coupled to one provider.

**Considerations:**
- Realtime voice: OpenAI Realtime API has native voice support; Gemini Live also supports this.
- Medical RAG: may require different model than general conversation.
- Cost: token costs at scale are material.
- Data residency: LEGAL / REGULATORY REVIEW REQUIRED for where prompts and responses are processed.

**Resolution:** NOT YET RESOLVED

---

### OD-014 — Avatar System Provider and Approach
**Status:** DECISION REQUIRED before Phase 17
**Affected phases:** 17

What technology will power the MANVIA AI avatar?

**Options:**
- HeyGen (streaming avatar API)
- D-ID (streaming avatar)
- Convai (gaming-style avatar with voice)
- Synthesia
- Custom WebGL / Three.js avatar (full control, high dev cost)
- No avatar initially (voice only first)

**Recommendation:** Evaluate latency requirements against available providers. Custom avatar is expensive but gives full brand control. Streaming avatar APIs have latency limitations that must be measured against UX requirements.

**Resolution:** NOT YET RESOLVED

---

### OD-012 — Doctor Verification Integration
**Status:** DECISION REQUIRED before Phase 8
**Affected phases:** 8

How will MANVIA verify doctor credentials?

**Options:**
- Manual review by MANVIA admin (document upload + admin approval)
- Integration with national medical council API (country-specific — DECISION REQUIRED for jurisdiction)
- Third-party identity and credential verification service
- Hybrid: document upload + manual admin review initially, API integration later

**Recommendation:** Start with manual admin review (document upload workflow). This is the safest initial approach that does not depend on API availability. Automate later when jurisdiction is confirmed.

**LEGAL / REGULATORY REVIEW REQUIRED:** What constitutes valid verification in the target jurisdiction?

**Resolution:** NOT YET RESOLVED

---

## Payments

### OD-004 — Payment Gateway
**Status:** DECISION REQUIRED before Phase 19
**Affected phases:** 19

Which payment gateway will process MANVIA consultation payments?

**Options (India focus):**
- Razorpay — Common in India, good APIs
- Stripe — International, strong developer experience
- PayU — India-focused
- CCAvenue — India-focused

**Considerations:**
- Target geography (OD-011) determines eligible providers.
- Doctor payout support (to bank accounts) required.
- Refund API support required.
- Webhook reliability required for idempotent processing.

**LEGAL / REGULATORY REVIEW REQUIRED:** Payment regulations and escrow requirements for healthcare platforms vary by jurisdiction.

**Resolution:** NOT YET RESOLVED

---

## Communications

### OD-005 — SMS/OTP Provider
**Status:** DECISION REQUIRED before Phase 4 (if OTP-based auth is required)
**Affected phases:** 4, 18

**Options:**
- Twilio
- AWS SNS
- Exotel (India)
- MSG91 (India)
- Fast2SMS (India)

**Resolution:** NOT YET RESOLVED

---

### OD-006 — Email Provider
**Status:** DECISION REQUIRED before Phase 18
**Affected phases:** 4, 18

**Options:**
- SendGrid
- AWS SES
- Postmark
- Resend

**Recommendation:** Postmark for transactional, low-volume start. Move to AWS SES at scale for cost.

**Resolution:** NOT YET RESOLVED

---

### OD-007 — Push Notification Provider
**Status:** DECISION REQUIRED before Phase 18
**Affected phases:** 18

**Options:**
- Firebase Cloud Messaging (FCM) — Android and web
- Apple Push Notification service (APNs) — iOS
- Expo Notifications (if React Native is chosen for mobile)
- OneSignal (abstraction over FCM + APNs)

**Note:** FCM and APNs are required for mobile regardless. The question is whether a unified API (like OneSignal or Expo) is used on top.

**Resolution:** NOT YET RESOLVED

---

### OD-008 — Video Consultation Infrastructure
**Status:** DECISION REQUIRED before Phase 13 (if in-app video is required for MVP)
**Affected phases:** 13, 17

Will MANVIA provide in-app video consultations, or link out to an external tool?

**Options:**
- Twilio Video
- ZEGOCLOUD (popular in Asia)
- Daily.co
- 100ms
- Agora
- Zoom SDK
- Link out to Zoom/Google Meet (simplest)

**Recommendation:** For MVP, consider linking to an external meeting (Google Meet / Zoom) to avoid video infrastructure complexity. Build native video in a later phase. This is a significant risk reduction.

**DECISION REQUIRED:** Is native in-app video part of MVP scope?

**Resolution:** NOT YET RESOLVED

---

## Platform and Jurisdiction

### OD-010 — Mobile Framework
**Status:** DECISION REQUIRED before frontend phases begin
**Affected phases:** Frontend Phase 1+

**Options:**
- React Native — JavaScript/TypeScript, shares code with web React
- Flutter — Dart, excellent performance, growing ecosystem
- Native (Swift + Kotlin) — Best performance, two separate codebases

**Considerations:**
- React Native allows more web code sharing if the web frontend uses React.
- Flutter has better performance consistency across platforms.
- Native gives best user experience but doubles the mobile development effort.

**Resolution:** NOT YET RESOLVED

---

### OD-011 — Target Geography and Regulatory Jurisdiction
**Status:** DECISION REQUIRED before Phase 8 and Phase 19
**Affected phases:** 8, 16, 18, 19, 20

Which country or countries will MANVIA launch in?

**Why this matters:**
- Doctor verification requirements differ by country.
- Payment regulations differ.
- Data residency requirements differ.
- Emergency resources (crisis lines) must be verified for the jurisdiction.
- Telemedicine regulations differ.
- Tax treatment of healthcare services differs.

**LEGAL / REGULATORY REVIEW REQUIRED:** Before any production launch, full regulatory analysis is required for the target jurisdiction.

**Resolution:** NOT YET RESOLVED

---

### OD-013 — Multi-tenancy Model
**Status:** DEFERRED
**Affected phases:** Future

If MANVIA expands to multiple markets or operates as a white-label platform, will it be multi-tenant?

**Options:**
- Single tenant (one database, one deployment) — current design
- Multi-tenant with schema isolation
- Multi-tenant with row-level isolation
- Separate deployments per market

**Resolution:** DEFERRED — not relevant until market 2+ is planned.

---

## Authentication

### OD-015 — Social OAuth / Single Sign-On
**Status:** DEFERRED for Phase 4; revisit in Phase 5
**Affected phases:** 4

Should MANVIA support Google, Apple, or other OAuth providers for login?

**Options:**
- Email + password only (Phase 4 minimum)
- Email + OTP (passwordless)
- Google OAuth
- Apple Sign-In (required by Apple App Store for apps with social login)
- All of the above

**Recommendation:** Implement email + password in Phase 4. Add OTP and OAuth in Phase 5 or later. Apple Sign-In will be required if Google OAuth is implemented on iOS.

**Resolution:** DEFERRED

---

### OD-016 — Connection Pooling
**Status:** DECISION REQUIRED before Phase 3 production configuration
**Affected phases:** 3

Which database connection pooling approach will be used?

**Options:**
- PgBouncer (external, battle-tested)
- Prisma Accelerate (cloud-based connection pooling)
- Supabase connection pooler (if Supabase is used)
- Direct Prisma connections with pool configuration (acceptable for low scale)

**Recommendation:** Start with direct Prisma connection pool for development. Configure PgBouncer for staging and production.

**Resolution:** NOT YET RESOLVED

---

*This file must be reviewed and updated before each new phase begins. Unresolved decisions blocking the next phase must be escalated to the product owner immediately.*
