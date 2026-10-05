# MANVIA — Production Operations & Runbooks (M8)

## 1. Payment Operations Runbook

### 1.1 Provider Architecture
Production payments utilize `RazorpayPaymentProvider` and `RazorpayPayoutProvider` interacting with Razorpay's API and RazorpayX Payouts.

### 1.2 Payment Lifecycle & Transition Validation
1. **Order Creation:** Client requests reservation → Backend creates order via `POST /v1/orders` on Razorpay with idempotency key.
2. **Payment Execution:** Client completes UI checkout via Razorpay modal.
3. **Server Verification:** Backend verifies `razorpay_signature` via constant-time HMAC-SHA256 (`crypto.timingSafeEqual`).
4. **Authoritative Confirmation:** Database payment status transitions to `SUCCEEDED` only after backend verification or webhook receipt. Client-reported success is strictly non-authoritative.
5. **Webhook Processing:** Handled at `/api/v1/payments/webhooks/razorpay`. Webhook signatures are verified with `RAZORPAY_WEBHOOK_SECRET`. Webhook event IDs are deduplicated in PostgreSQL to prevent double-crediting or duplicate status processing.

### 1.3 Refund Operations
- Initiated via `/api/v1/refunds` by authorized patient or administrator.
- Transitions: `REQUESTED` → `PENDING` → `PROCESSED` (or `FAILED`).
- Doctor payout hold is automatically placed if a refund is approved before settlement.

---

## 2. Storage Operations Runbook

### 2.1 Private Bucket Enforcement
- Storage driver in production is configured as `s3` (AWS S3, Google Cloud Storage with S3 interoperability, or Cloudflare R2).
- Direct public access is disabled (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`).
- All health records, doctor degree certificates, medical licenses, and lab documents are stored under unique UUID prefixes: `records/{userId}/{documentId}.{ext}`.

### 2.2 Presigned URL Generation
- **Download:** Backend issues presigned GET URLs with a 15-minute expiration time.
- **Upload:** Backend issues presigned PUT URLs with enforced `Content-Type` and `Content-Length-Range` constraints.
- **Access Authorization:** Before generating a presigned URL, the backend enforces `AuthGuard`, `RolesGuard`, and `ResourceOwnerGuard` (validating patient consent or active care relationship).

### 2.3 Magic Byte Validation
- In addition to file extension checks, uploads must match validated magic bytes:
  - PDF: `%PDF-` (`0x25, 0x50, 0x44, 0x46, 0x2D`)
  - JPEG: `0xFF, 0xD8, 0xFF`
  - PNG: `0x89, 0x50, 0x4E, 0x47`

---

## 3. External Notification Operations

### 3.1 Email (Resend)
- **Delivery:** Transactional emails dispatched via `ResendEmailProvider` via HTTPS REST API.
- **Retry Policy:** Automatic retry on HTTP 429 and 5xx errors (up to 3 exponential backoff retries).
- **Privacy Constraint:** No Protected Health Information (PHI), diagnostic summaries, or sensitive prescription data may be placed in email subjects or plain-text notifications.

### 3.2 SMS (Twilio)
- **Delivery:** Dispatched via `TwilioSmsProvider` with Basic authentication.
- **Logging Rule:** All phone numbers in server logs are masked (`+91*****1234`).
- **Use Cases:** One-Time Passwords (OTP), critical appointment status alerts, doctor verification urgent updates.

### 3.3 Push Notifications (Firebase Cloud Messaging)
- **Delivery:** Dispatched to registered patient and doctor device tokens via `FcmPushProvider`.
- **Payload:** Notification titles and bodies are generic ("You have an appointment update"). Sensitive medical details are fetched inside the app over authenticated TLS.

---

## 4. AI & Realtime Operations

### 4.1 Gemini AI Provider
- Foundation model: `gemini-3.8-flash`.
- Safety Engine: Pre-execution safety filter evaluates prompts for high-risk self-harm, emergency medical symptoms, or explicit diagnosis demands.
- Medical RAG: PostgreSQL with `pgvector` retrieves curated medical guidelines with cosine similarity >= 0.70.
- Disclaimer: System prompts strictly enforce that the AI identifies as an educational wellness assistant, not a licensed medical practitioner.

### 4.2 Realtime Voice Gateway (Gemini Live)
- WebSocket gateway located at `/api/v1/ai/realtime`.
- Handles bi-directional audio streaming (PCM 16-bit / 24kHz).
- Session ownership is validated via JWT before socket upgrade.
- Supports barge-in interruption (speech interruption cancels queued downstream TTS frames).

---

## 5. Database Migration & Rollback Runbook

### 5.1 Production Migration Execution
1. Always test migrations against a recent staging snapshot before applying to production.
2. Execute migration deployment in CI/CD or controlled maintenance window:
   ```bash
   npx prisma migrate deploy
   ```
3. Check status:
   ```bash
   npx prisma migrate status
   ```

### 5.2 Rollback Procedures
- Schema migrations in MANVIA are designed to be **backward-compatible** (expand-and-contract pattern).
- If a migration fails:
  - Do not drop columns immediately.
  - Revert the application container deployment to the previous Docker image hash.
  - Apply corrective forward migration rather than hard rollback of database state.
