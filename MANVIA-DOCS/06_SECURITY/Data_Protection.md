# MANVIA — Data Protection and Classification

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Data Classification Framework

All data in MANVIA is classified into one of four sensitivity tiers:

| Tier | Label | Description | Examples |
|---|---|---|---|
| T1 | CRITICAL | Health, medical, and credential data | Health records, AI conversations, passwords, tokens |
| T2 | SENSITIVE | Personal identity data | Name, email, phone, date of birth, gender |
| T3 | INTERNAL | Operational data not publicly visible | Audit logs, security events, system config |
| T4 | PUBLIC | Data intentionally public | Verified doctor profiles, specialty list, public APIs |

---

## 2. Data Classification by Domain

| Data | Tier | Encryption at App Layer | Access |
|---|---|---|---|
| Health records (content) | T1 | Yes | Patient + consented + audited |
| AI conversations | T1 | Yes | Patient only |
| AI memory | T1 | Yes | Patient only |
| Wellness check-ins | T1 | Recommended | Patient + consented |
| Wellness journals | T1 | Yes | Patient only |
| Payment details | T1 | Via payment provider | Patient + admin |
| Passwords | T1 | Hashed (Argon2id) | Never returned |
| Refresh tokens | T1 | Hashed (SHA-256) | Never returned |
| Patient name/DOB | T2 | Recommended | Patient + doctor (care relationship + consent) |
| Patient email | T2 | Optional | Patient + admin |
| Doctor name | T2 | No | Doctor + public (verified) |
| Doctor registration number | T2 | No | Doctor + admin |
| Audit logs | T3 | Disk level | Admin only |
| Security events | T3 | Disk level | Admin only |
| Appointment metadata | T3 | Disk level | Patient + doctor (own appointments) |
| Doctor public profile | T4 | None | Public |
| Specialty list | T4 | None | Public |

---

## 3. Data Retention Requirements

**LEGAL / REGULATORY REVIEW REQUIRED** for all periods.

| Data Category | Minimum Retention | Rationale |
|---|---|---|
| Health records | Jurisdiction dependent (often 7–20 years) | Medical record laws |
| Consent records | Duration of consent + legal requirement | Legal enforceability |
| Audit logs | 5–7 years minimum | Healthcare compliance |
| Payment records | 7 years | Financial regulations |
| AI conversations | DECISION REQUIRED | User privacy vs. continuity of care |
| Security events | 2–3 years | Incident investigation |
| User accounts | Duration of account + legal hold period | Data subject rights |

---

## 4. Data Minimization

MANVIA must collect only the data necessary for the stated purpose.

Rules:
- Do not collect data that is not used.
- Do not store data longer than required.
- Do not include sensitive data in logs or error messages.
- Do not pass sensitive data in URL query parameters.
- JWT tokens contain minimal claims (no health data, no detailed profile).

---

## 5. Data Subject Rights

**LEGAL / REGULATORY REVIEW REQUIRED** before implementing any of the following:

| Right | Description | MANVIA Approach |
|---|---|---|
| Right to access | User can request a copy of their data | Data export feature (DECISION REQUIRED for format) |
| Right to correction | User can correct inaccurate data | Profile edit APIs |
| Right to deletion | User can request deletion | Soft delete + anonymization (complex due to retention requirements) |
| Right to portability | User can receive data in machine-readable format | DECISION REQUIRED |
| Right to restrict processing | User can limit how their data is used | Consent system |
| Right to object | User can object to certain processing | Consent revocation |

---

## 6. Development Environment Data Rules

- No real patient data in development or staging environments.
- All development data is synthetic (generated with Faker.js or equivalent).
- All staging database data is anonymized or synthetic.
- If production data is needed for debugging, it must be anonymized first and reviewed — LEGAL REVIEW REQUIRED.
- No production credentials in development environments.

---

## 7. Backup Data Protection

- Database backups are encrypted using the same or stronger encryption as production data.
- Backups are stored in a separate geographic location.
- Access to backup storage is restricted to operations team.
- Backup restoration is tested at least monthly.

---

*This document reflects the data classification at Phase 0. It must be updated as new data types are introduced in each phase.*
