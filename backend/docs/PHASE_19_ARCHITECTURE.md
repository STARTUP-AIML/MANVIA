# MANVIA Payments, Billing & Doctor Payouts Architecture (Phase 19)

**Product:** MANVIA — _Care made simpler._  
**Domain:** Financial Domain (Payments, Payment Attempts, Provider Abstraction, Webhook Ingestion, Invoicing, Refunds Integration, Doctor Payouts, Fee/Commission Abstraction, Append-Only Ledger, Reconciliation, Audit Logging, Concurrency & Idempotency)

---

## 1. Architectural Overview & Boundary Decoupling

Phase 19 implements a production-grade, centralized, and provider-agnostic financial domain for MANVIA.

### Critical Decoupling Rule

MANVIA strictly owns its internal financial domain. External payment gateways (e.g. Razorpay, Stripe, Adyen) must **never** be the source of truth for appointments, payment states, invoices, refunds, or doctor payouts. Furthermore, the `AppointmentService` is strictly decoupled from payment providers:

```
MANVIA API (Controllers)
      ↓
PaymentsService / DoctorPayoutService / PaymentWebhookService
      ↓
Payment Domain Entities & State Machines
      ↓
Provider Adapter Interface (IPaymentProvider, IPayoutProvider)
      ↓
External Payment Gateway (Simulated / Razorpay / Stripe)
      ↓
Gateway Callback / Webhook Response
      ↓
PaymentWebhookService (Signature Verification & Atomic DB Transaction)
      ↓
Invoice Generation / Refund Execution / Doctor Payout Ledger
```

**Anti-Pattern Explicitly Prohibited:**
`AppointmentService` -> Direct Gateway SDK Call (e.g. `razorpay.orders.create`)

**MANVIA Architecture Enforced:**
`AppointmentService` -> `PaymentsService` -> `IPaymentProvider` -> External Gateway

---

## 2. Domain Entities & Database Schema

### 2.1 Monies & Representation Rule

**Money must NEVER use floating-point representation.**

- All internal calculations in `CurrencyUtil` operate on integer minor units (cents, paise).
- Stored in PostgreSQL with exact `Decimal(10, 2)` types, preventing IEEE 754 precision loss.
- Formatted as 2-decimal strings (`"150.00"`) across API DTOs and entity models.

### 2.2 Core Financial Models

1. **`Payment`**: Represents the primary financial transaction associated with an appointment.
   - `id`, `publicPaymentId` (`PAY-YYYYMM-XXXXXXXX`), `appointmentId`, `patientId`, `doctorId`, `amount`, `currency`, `status`, `provider`, `providerPaymentId`, `idempotencyKey`, `paidAt`, `failedAt`, `failureReason`, `metadata`.
2. **`PaymentAttempt`**: Tracks distinct attempts for a single payment. Allows auditable multi-attempt payment flows without overwriting prior failures.
   - `id`, `publicAttemptId` (`ATT-YYYYMM-XXXXXXXX`), `paymentId`, `provider`, `providerAttemptId`, `amount`, `status`, `failureCode`, `failureReason`, `startedAt`, `completedAt`, `metadata`.
3. **`PaymentWebhookEvent`**: Stores raw gateway webhook receipts for signature verification, tamper-proofing, deduplication, and replay audits.
   - `id`, `provider`, `providerEventId`, `eventType`, `payloadHash`, `receivedAt`, `processedAt`, `processingStatus`, `failureReason`, `payload`.
4. **`Invoice`**: Finalized, human-facing billing documents issued upon payment success.
   - `id`, `invoiceNumber` (`INV-YYYYMM-XXXXXXXX`), `paymentId`, `appointmentId`, `patientId`, `doctorId`, `subtotal`, `taxes`, `discount`, `platformFee`, `total`, `currency`, `status`, `issuedAt`, `paidAt`.
5. **`DoctorPayout`**: Financial disbursement domain model for doctor earnings.
   - `id`, `publicPayoutId` (`PO-YYYYMM-XXXXXXXX`), `doctorId`, `appointmentId`, `paymentId`, `grossAmount`, `platformFee`, `taxWithheld`, `providerFee`, `netAmount`, `currency`, `status`, `provider`, `providerPayoutId`, `scheduledAt`, `processedAt`, `failedAt`, `failureReason`.
6. **`FinancialTransaction`**: Append-only ledger recording all money movements (CREDIT/DEBIT) with timestamps, reference IDs, and balances.

---

## 3. Financial State Machines

### 3.1 Payment State Machine

```
   CREATED
      ↓
   PENDING
      ↓
  PROCESSING
   ↙      ↘
SUCCEEDED   FAILED
   |
CANCELLED / EXPIRED (from PENDING only)
```

**Terminal State Protection:**

- Once a payment reaches `SUCCEEDED`, it is **immutable** against state regressions. A delayed or out-of-order `FAILED` webhook event is rejected by domain guards.
- Transitions from `SUCCEEDED` to `FAILED` throw a `DomainError`.

### 3.2 Payment Attempt Lifecycle

```
INITIATED -> PROCESSING -> SUCCEEDED | FAILED | TIMED_OUT | ABANDONED
```

### 3.3 Doctor Payout Lifecycle

```
PENDING (Created on payment success)
   ↓
ELIGIBLE (Evaluated by PayoutEligibilityService: Appointment COMPLETED, Doctor VERIFIED, No Holds)
   ↓
PROCESSING (Disbursement initiated with IPayoutProvider)
   ↓
PAID (Confirmed by Provider) / FAILED
```

---

## 4. Provider Abstraction

Phase 19 defines clean TypeScript interfaces isolating external dependencies:

```typescript
export interface IPaymentProvider {
  readonly providerName: string;
  createPaymentSession(params: CreatePaymentSessionParams): Promise<PaymentSessionResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
  fetchPayment(providerPaymentId: string): Promise<ProviderPaymentDetails>;
  refundPayment(params: RefundPaymentParams): Promise<ProviderRefundResult>;
  verifyWebhookSignature(rawPayload: string | Buffer, signature: string, secret?: string): boolean;
  parseWebhookEvent(payload: Record<string, unknown>): ProviderWebhookEvent;
}
```

- **`SimulatedPaymentProvider`**: Production-ready reference implementation providing HMAC-SHA256 signature verification, deterministic checkout sessions, and webhook payload parsing.
- **Future Gateway Adapters**: Razorpay, Stripe, Cashfree, or Adyen plug into `IPaymentProvider` without altering any core payments, appointments, or billing logic.

---

## 5. Webhook Architecture & Idempotency

Gateway webhooks arrive at:
`POST /api/v1/payments/webhooks/:provider`

Processing pipeline:

1. **Signature Verification**: Validates HMAC signature using provider secret. Rejects invalid signatures with 401/400.
2. **Payload Hashing**: Computes SHA-256 hash of payload.
3. **Idempotency Guard**: Checks `(provider, providerEventId)` against `PaymentWebhookEvent`. If already processed, returns HTTP 200 immediately without reprocessing.
4. **State Transition Validation**: Validates current internal payment status against incoming transition.
5. **Atomic Execution**: In a single database transaction:
   - Updates `Payment` state (`SUCCEEDED` / `FAILED`).
   - Updates `PaymentAttempt`.
   - Generates immutable `Invoice` if `SUCCEEDED`.
   - Records CREDIT in `FinancialTransaction` append-only ledger.
   - Initializes `DoctorPayout` record in `PENDING` state.
   - Emits `PAYMENT_SUCCEEDED` domain event to `IEventBus`.
   - Marks `PaymentWebhookEvent` as `PROCESSED`.

---

## 6. Doctor Payout Domain & Eligibility Service

Doctor payouts are calculated via `PricingService` using configurable fee strategies:

- Gross Amount: $150.00
- Platform Fee (15% default): $22.50
- Provider Gateway Fee (2.5% default): $3.75
- Tax Withheld (Jurisdiction-aware default 0%): $0.00
- Net Doctor Disbursement: $123.75

### Eligibility Evaluation (`PayoutEligibilityService`)

A payout can only transition from `PENDING` to `ELIGIBLE` when:

1. Associated `Payment` is in `SUCCEEDED` status.
2. Associated `Appointment` is in `COMPLETED` status.
3. Doctor profile is verified (`DoctorVerificationStatus.APPROVED`).
4. No active cancellation or refund has been requested or approved.
5. Dispute hold window has lapsed.

Disbursement can only be initiated by authorized `ADMIN` role actors via `POST /api/v1/payouts/:id/process`.

---

## 7. Security, PCI Compliance & Data Protection

1. **Zero Raw Card Data**: MANVIA does not store PANs, expiration dates, CVVs, or bank credentials. All checkout flows utilize provider-hosted or tokenized checkouts.
2. **Cryptographic Webhook Signatures**: Constant-time HMAC comparison prevents timing attacks.
3. **Audit Trail**: Every financial operation (initiation, attempt, webhook receipt, verification, refund, invoice, payout) is recorded in `PaymentAuditService`.
4. **Resource-Based Authorization**:
   - `PATIENT`: Can initiate and view only their own payments, attempts, and invoices.
   - `DOCTOR`: Can view only their own consultations, invoices, and payouts. Cannot modify amounts or initiate payouts.
   - `ADMIN`: Full access to reconciliation, payout execution, and cross-entity auditing.

---

## 8. Unresolved Business / Legal / Commercial Decisions

The following commercial decisions are intentionally abstracted and require formal business/legal sign-off before production launch:

1. **Platform Fee Model**: Fixed percentage (e.g. 15%) vs tiered commission based on doctor specialty or volume.
2. **Taxes & Withholding (TDS/GST)**: Configured with a pluggable strategy pending final tax advisory per operational jurisdiction.
3. **Gateway Partner Selection**: Abstraction layer prepared; final contract terms with Razorpay/Stripe pending.
4. **Dispute Settlement Window**: Holding period before payout transition to `ELIGIBLE` (currently configurable, defaulted to immediate on appointment completion for testing).
