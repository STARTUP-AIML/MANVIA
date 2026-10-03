# MANVIA — Billing, Payments & Doctor Payouts Architecture

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Business & Revenue Model

MANVIA operates on a hybrid revenue model:
1. **Telehealth Consultation Marketplace Fee:** MANVIA retains a 15% to 20% platform commission on completed doctor consultations.
2. **Patient Wellness Membership (MANVIA+):** Recurring monthly/annual subscription for premium AI companion features, advanced longitudinal trend analytics, and unlimited audio check-ins.
3. **Doctor Verification & Listing Tier:** Free basic listing for verified practitioners; premium practice management analytics tier for clinics.

---

## 2. Payment Flow & Escrow Mechanics

Healthcare consultations require strict pre-authorization and capture flows to prevent fraud and handle late cancellations gracefully:

```
[Patient Reserves Slot] ---> Stripe PaymentIntent (Authorize Hold)
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v (Consultation Completed)              v (Cancelled > 24h)
        [Capture Payment]                         [Release Auth Hold]
                   |                                (100% Refund)
        +----------+----------+
        |                     |
        v (85%)               v (15%)
  [Doctor Payout]        [MANVIA Revenue]
  (Stripe Connect)
```

---

## 3. Idempotency & Financial Invariants

* **Idempotency Keys:** Every payment creation and refund request requires an immutable `Idempotency-Key` header stored in PostgreSQL and Redis. Duplicate submissions within 24 hours return the original payment record without re-charging.
* **Double-Payout Prevention:** Doctor payouts run asynchronously via batch settlement jobs using database row-level locking (`SELECT ... FOR UPDATE`) on the transaction table.
* **Refund Rules:**
  * Cancellation > 24 hours prior to appointment: 100% refund, zero penalty.
  * Cancellation 2 - 24 hours prior: 50% refund to patient, 50% credit to doctor for time reserved.
  * Cancellation < 2 hours or patient no-show: 0% refund (doctor receives consultation fee minus platform fee).
  * Doctor cancellation at any time: 100% refund to patient + priority slot voucher.
