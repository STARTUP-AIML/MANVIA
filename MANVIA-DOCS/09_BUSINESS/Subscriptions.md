# MANVIA — Patient Subscription & Membership Strategy (MANVIA+)

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Subscription Tiers Overview

MANVIA provides a generous free tier to ensure healthcare accessibility, while offering premium tiers for continuous proactive health monitoring and advanced AI companion interaction.

| Tier | Price | AI Companion Limits | Wellness Tracking | Consultations | Document Storage |
|---|---|---|---|---|---|
| **MANVIA Free** | $0 / month | 20 text messages/day; 1 voice check-in/day | Basic mood and sleep logging; 7-day trend history | Pay-per-consultation | Up to 10 records (max 25MB total) |
| **MANVIA+ Individual** | $14.99 / month or $140 / year | Unlimited text companion; unlimited voice check-ins; 3D avatar mode | Comprehensive multi-metric analytics; unlimited 365-day trends; AI health reports | 10% discount on marketplace consults; priority waitlist | Unlimited encrypted records (up to 5GB) |
| **MANVIA Family** | $29.99 / month | All MANVIA+ features for up to 5 family members | Unified caregiver dashboard; medication alerts for elderly parents | Shared priority booking access | Unlimited family health vault (25GB) |

---

## 2. Subscription Lifecycle State Machine

```
[INCOMPLETE] ---> [TRIALING] ---> [ACTIVE] ---> [PAST_DUE] ---> [CANCELLED]
                                     |               |
                                     v               v
                                [UNPAID] <-----------+
```

* **Grace Period:** When a renewal payment fails, the user enters a 7-day `PAST_DUE` grace period with email reminders before feature degradation occurs.
* **Downgrade Safety:** If a user downgrades to Free, existing health records and history are preserved in read-only format; no patient medical records are ever automatically deleted due to subscription expiration.
