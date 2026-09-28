# MANVIA — MVP Scope

> Version: 0.1.0-phase0
> Status: DRAFT — requires product owner validation
> Last Updated: 2026-09-28

---

## Purpose

This document defines what constitutes the Minimum Viable Product (MVP) for MANVIA. The MVP is the smallest coherent product that delivers real value to patients and doctors without compromising safety, security, or regulatory compliance.

**DECISION REQUIRED:** The product owner must validate this MVP scope before Phase 6 development begins.

---

## MVP Guiding Principles

1. **Safety first.** Nothing ships that could harm patients.
2. **No regulatory risk.** Only launch what is legally permissible in the target jurisdiction.
3. **Coherent experience.** The MVP must be a complete user journey, not a collection of disconnected features.
4. **Verified doctors only.** No patient can book an unverified doctor.
5. **AI is clearly AI.** No ambiguity about what is AI vs. human doctor.

---

## MVP Included Features

### Core Identity and Authentication
- Patient registration and login
- Doctor registration and login
- Email + password authentication
- JWT session management

### Patient Portal
- Patient profile
- Doctor discovery and search (verified doctors only)
- Appointment booking (full state machine)
- AI companion — text conversation only (voice deferred post-MVP)
- Wellness check-in (mood, sleep, energy, stress)
- Health records upload and view (basic)
- Health timeline (basic view)

### Doctor Portal
- Doctor profile
- Doctor verification submission (document upload)
- Availability management
- Consultation offers (define products)
- Appointment management (accept / decline / complete)
- Access to patient information within appointment context

### AI Companion (MVP scope)
- Text-based conversation only
- Wellness support and health education focus
- Clear AI identification
- Basic safety filter
- Human escalation trigger (routes to appointment booking)
- No voice or avatar in MVP

### Appointments (full MVP feature)
- Full state machine: AVAILABLE, HELD, REQUESTED, CONFIRMED, COMPLETED, DECLINED, CANCELLED, EXPIRED, NO_SHOW
- Pre-consultation intake form
- Double-booking prevention
- Doctor accept / decline workflow
- No-show handling

### Notifications (basic MVP)
- In-app notifications
- Email notifications (appointment confirmations, verification status)
- Push notifications: DEFERRED post-MVP or included if mobile launches at MVP

### Payments (MVP scope)
- Consultation payment before or at confirmation — DECISION REQUIRED on flow
- Basic refund on cancellation
- Invoice generation

### Safety
- AI safety engine (basic crisis detection)
- Emergency resource display — LEGAL / REGULATORY REVIEW REQUIRED before activation
- Safety event logging

### Admin Portal (internal MVP)
- Doctor verification review and approval
- User management (basic)

---

## MVP Excluded Features (Deferred)

| Feature | Reason for Deferral |
|---|---|
| AI voice interaction | High technical complexity; requires latency measurement |
| AI avatar | Provider decision not made; adds UX complexity |
| Medical RAG | Requires curated medical knowledge base |
| AI persistent memory | Can be added post-MVP |
| Video consultations | Complex infrastructure; may link to external initially |
| Follow-up consultation scheduling | Can be manual initially |
| Doctor payouts | Requires payment provider setup |
| SMS notifications | Provider decision pending |
| Health record sharing with third parties | Consent complexity; defer |
| Waitlist | Post-MVP appointment management |
| Social OAuth (Google, Apple) | Phase 4 minimum is email + password |
| Multi-language UI | Deferred (AI multilingual is included) |
| Wearable integration | Out of scope |
| Insurance / claims | Out of scope |

---

## MVP User Journey (Patient)

```
1. Register as patient
2. Complete profile
3. Browse verified doctors (filter by specialty, language, time)
4. Select a doctor and consultation offer
5. Select available slot
6. System holds slot (timed)
7. Complete pre-consultation intake
8. Submit appointment request + payment
9. Doctor accepts (or declines)
10. Receive confirmation notification
11. Attend consultation (via video link or phone — infrastructure TBD)
12. Consultation completed
13. Receive consultation summary
14. View health record and timeline
```

---

## MVP User Journey (Doctor)

```
1. Register as doctor
2. Submit verification documents
3. Admin reviews and approves verification
4. Set availability and consultation offers
5. Receive appointment request notification
6. Accept or decline appointment
7. View patient pre-consultation intake
8. Conduct consultation
9. Complete consultation (trigger summary)
10. Patient receives summary
```

---

## MVP Launch Gates

Before MVP can launch to real users, all of the following must be satisfied:

- [ ] All MVP features implemented and tested
- [ ] Security audit completed (Phase 20)
- [ ] Legal review completed for target jurisdiction (OD-011)
- [ ] Doctor verification process verified against jurisdiction requirements
- [ ] Emergency resources verified for target geography
- [ ] Payment processing compliant with local regulations
- [ ] Privacy policy and terms of service reviewed by legal counsel
- [ ] No synthetic test data in production database
- [ ] Penetration testing completed
- [ ] Production monitoring and alerting operational
- [ ] Disaster recovery runbook tested
- [ ] Backup verified

---

*This scope is a proposal. It must be validated by the product owner and legal counsel before development priorities are locked.*
