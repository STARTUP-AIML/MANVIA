# MANVIA — Database Architecture

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Database Technology

### ADR-003: PostgreSQL as Primary Database

**Problem:** MANVIA handles transactional healthcare data (appointments, payments, consent, health records metadata). The database must provide ACID guarantees, foreign key integrity, and support complex relational queries.

**Decision:** PostgreSQL 18.x as the sole primary relational database.

**Why PostgreSQL:**
- ACID transactions — essential for appointment locking, payment idempotency, consent integrity.
- Row-level security — additional layer for data isolation.
- pgvector extension — AI embeddings without a separate vector database.
- JSON/JSONB support — flexible metadata storage where schema varies.
- Excellent tooling, wide cloud provider support (managed PostgreSQL on all major clouds).
- Strong community, long-term support guarantee.

**Alternatives rejected:**

| Alternative | Reason Rejected |
|---|---|
| MongoDB | No ACID transactions by default; poor for relational healthcare domain |
| MySQL/MariaDB | Weaker JSON support; weaker ecosystem for healthcare |
| CockroachDB | Distributed overhead not justified at current scale |
| Multiple databases | Operational complexity; no concrete requirement |

### ADR-004: Prisma as ORM

**Problem:** Raw SQL increases risk of SQL injection, makes migrations brittle, and reduces developer velocity.

**Decision:** Prisma 7.x.

**Why Prisma:**
- Schema-first migrations (source of truth in `schema.prisma`).
- Type-safe query client generated from schema.
- First-class TypeScript support.
- Migration tooling integrated.
- Excellent NestJS integration.

**Trade-off:** Prisma's query API has limitations for very complex SQL (e.g., recursive CTEs, window functions). These are addressed with `$queryRaw` where necessary.

**Note:** Prisma 7 brings edge-ready client and improved performance. Pin exact version; review changelog before upgrading.

---

## 2. Database Domain Architecture

### 2.1 Domain Overview

The database is organized around these logical domains:

| Domain | Core Tables | Sensitive? |
|---|---|---|
| Identity | users, public_identifiers | Yes — PII |
| Security | sessions, devices, refresh_tokens, security_events, audit_logs | Yes — credentials/audit |
| Patients | patient_profiles | Yes — health demographics |
| Doctors | doctor_profiles, doctor_professional_registrations | Yes — professional data |
| Doctor Verification | verification_submissions, verification_documents | Yes |
| Specialties | specialties (reference) | No |
| Languages | languages (reference) | No |
| Availability | availability_slots, availability_exceptions | No |
| Consultation Offers | consultation_offers | No |
| Care Relationships | care_relationships | Yes |
| Consent | consents, consent_audit | Yes — legal records |
| Wellness | wellness_check_ins, wellness_journals | Yes — health data |
| Health Records | health_records, health_record_access_log | Yes — medical records |
| Health Timeline | timeline_events | Yes |
| Pre-consultation | pre_consultation_forms | Yes |
| Consultations | consultations, consultation_summaries | Yes |
| Appointments | appointments, appointment_holds, appointment_audit | Yes |
| Waitlist | waitlist_entries | Yes |
| Follow-ups | follow_ups | Yes |
| Notifications | notifications, notification_preferences | Partial |
| AI | ai_conversations, ai_messages, ai_feedback | Yes — conversation content |
| AI Memory | ai_memory | Yes |
| AI Safety | ai_safety_events | Yes |
| Payments | payments, payment_events | Yes — financial |
| Refunds | refunds | Yes — financial |
| Invoices | invoices | Yes — financial |
| Payouts | payouts, payout_items | Yes — financial |
| Media | media_files | Partial |
| Support | support_tickets, support_messages | Partial |
| Audit | audit_logs | Yes — operational |
| Administration | admin_actions, system_config | Yes |

---

## 3. Conceptual Entity Definitions

### 3.1 Identity Domain

#### users
Central immutable identity. Created once; never merged or deleted (only deactivated or anonymized per policy).

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key; internal use only |
| email | varchar(320) | Unique; encrypted or hashed in storage — DECISION REQUIRED |
| email_verified | boolean | Email verification status |
| phone | varchar(20) | Optional; encrypted |
| phone_verified | boolean | |
| status | enum | ACTIVE, INACTIVE, SUSPENDED, ANONYMIZED |
| created_at | timestamptz | UTC |
| updated_at | timestamptz | UTC |

**Sensitive fields:** email, phone
**Indexes:** email (unique), phone (unique where set)
**No user.role field.** Role is determined by the existence of a role-specific profile.

#### public_identifiers
Separate table mapping users to their public-facing IDs per role.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK to users |
| role | enum | PATIENT, DOCTOR |
| public_id | varchar(20) | PAT-XXXXXXXX or DOC-XXXXXXXX; unique |
| created_at | timestamptz | |

**Indexes:** user_id, public_id (unique)
**Cardinality:** One user can have at most one PAT-XXXXXXXX and one DOC-XXXXXXXX.

---

### 3.2 Security Domain

#### sessions
Active user sessions.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| user_id | UUID | FK to users |
| device_id | UUID | FK to devices |
| created_at | timestamptz | |
| expires_at | timestamptz | |
| revoked_at | timestamptz | Null if active |
| ip_address | varchar(45) | IPv4 or IPv6 |
| user_agent | text | |

#### refresh_tokens
Stored refresh tokens for rotation.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| session_id | UUID | FK to sessions |
| token_hash | varchar(64) | SHA-256 hash of token; never plaintext |
| family_id | UUID | For breach detection via token family tracking |
| used_at | timestamptz | Null if not yet used |
| expires_at | timestamptz | |
| revoked_at | timestamptz | Null if valid |

**Critical:** Never store refresh tokens in plaintext. Store hash only.

#### audit_logs
Immutable operational audit trail.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| actor_id | UUID | Nullable (system actions) |
| actor_role | enum | PATIENT, DOCTOR, ADMIN, SYSTEM |
| action | varchar(100) | e.g., APPOINTMENT_CONFIRMED |
| resource_type | varchar(50) | e.g., appointment |
| resource_id | UUID | |
| outcome | enum | SUCCESS, FAILURE |
| details | jsonb | Context; sanitized — no sensitive field values |
| ip_address | varchar(45) | |
| correlation_id | UUID | |
| created_at | timestamptz | Immutable |

**Audit logs are append-only.** No UPDATE or DELETE.
**Retention:** LEGAL / REGULATORY REVIEW REQUIRED. Minimum 2 years; likely longer for health-adjacent actions.

---

### 3.3 Patients Domain

#### patient_profiles
Patient-specific information attached to a user identity.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| user_id | UUID | FK to users; unique |
| public_id | varchar(20) | PAT-XXXXXXXX; unique |
| first_name | varchar(100) | Encrypted |
| last_name | varchar(100) | Encrypted |
| date_of_birth | date | Encrypted |
| gender | enum | Patient-declared |
| preferred_language | varchar(10) | BCP-47 language tag |
| avatar_url | text | Object storage key |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Sensitive:** first_name, last_name, date_of_birth, gender
**Note on encryption:** Application-level encryption of PII fields — DECISION REQUIRED on key management and column encryption vs. full-disk encryption vs. both.

---

### 3.4 Doctors Domain

#### doctor_profiles
Doctor-specific information.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| user_id | UUID | FK to users; unique |
| public_id | varchar(20) | DOC-XXXXXXXX; unique |
| first_name | varchar(100) | |
| last_name | varchar(100) | |
| bio | text | Public profile |
| avatar_url | text | Object storage key |
| verification_status | enum | DRAFT, SUBMITTED, UNDER_REVIEW, MORE_INFORMATION_REQUIRED, APPROVED, REJECTED, SUSPENDED, EXPIRED |
| approved_at | timestamptz | |
| suspended_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Rule:** verification_status can only transition to APPROVED by an admin action. Never by the doctor themselves.

#### doctor_professional_registrations
Professional credentials — separate from the MANVIA doctor profile.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| doctor_profile_id | UUID | FK to doctor_profiles |
| registration_number | varchar(100) | Medical council registration |
| issuing_body | varchar(200) | e.g., Medical Council of India |
| country | varchar(10) | ISO 3166-1 alpha-2 |
| state_province | varchar(100) | If applicable |
| issued_date | date | |
| expiry_date | date | Null if no expiry |
| verified | boolean | Admin-verified |
| created_at | timestamptz | |

#### doctor_specialties (join table)
| Field | Type | Notes |
|---|---|---|
| doctor_profile_id | UUID | FK |
| specialty_id | UUID | FK to specialties |
| is_primary | boolean | |

#### doctor_languages (join table)
| Field | Type | Notes |
|---|---|---|
| doctor_profile_id | UUID | FK |
| language_code | varchar(10) | BCP-47 |
| proficiency | enum | NATIVE, FLUENT, CONVERSATIONAL |

---

### 3.5 Availability Domain

#### availability_slots
Doctor-defined available time slots.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| doctor_profile_id | UUID | FK |
| starts_at | timestamptz | UTC |
| ends_at | timestamptz | UTC |
| status | enum | AVAILABLE, HELD, BOOKED, CANCELLED |
| consultation_offer_id | UUID | FK — links slot to an offer |
| created_at | timestamptz | |

**Double-booking prevention:** Unique constraint on (doctor_profile_id, starts_at) where status IN (HELD, BOOKED).

#### appointment_holds
Time-limited locks on slots during booking.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| slot_id | UUID | FK to availability_slots |
| patient_id | UUID | FK to patient_profiles |
| expires_at | timestamptz | Short TTL (e.g., 10 minutes) |
| created_at | timestamptz | |

**Critical:** Expired holds must be released (slot status reset to AVAILABLE). A background worker or PostgreSQL trigger handles expiry.

---

### 3.6 Consultation Offers Domain

#### consultation_offers
The products a doctor sells.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| doctor_profile_id | UUID | FK |
| name | varchar(100) | e.g., "First Consultation – 30 min" |
| description | text | |
| duration_minutes | integer | |
| offer_type | enum | FIRST_CONSULTATION, FOLLOW_UP, GENERAL, CUSTOM |
| price | decimal(10,2) | |
| currency | varchar(3) | ISO 4217 |
| is_active | boolean | |
| created_at | timestamptz | |

---

### 3.7 Care Relationships Domain

#### care_relationships
Explicit relationship between a patient and doctor.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| patient_id | UUID | FK to patient_profiles |
| doctor_id | UUID | FK to doctor_profiles |
| status | enum | ACTIVE, INACTIVE, ENDED, SUSPENDED |
| initiated_by | enum | PATIENT, SYSTEM |
| started_at | timestamptz | |
| ended_at | timestamptz | |
| created_at | timestamptz | |

**Cardinality:** One patient can have active relationships with multiple doctors. One doctor can have relationships with many patients.

**Authorization rule:** A doctor can access a patient's information only if an ACTIVE care_relationship exists AND the applicable consent exists.

---

### 3.8 Consent Domain

#### consents
Explicit, scoped consent records.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| patient_id | UUID | FK to patient_profiles |
| grantee_id | UUID | Who was granted access |
| grantee_type | enum | DOCTOR, SYSTEM, THIRD_PARTY |
| scope | enum | HEALTH_RECORDS, WELLNESS_DATA, AI_MEMORY, ALL_HEALTH_DATA |
| purpose | varchar(200) | Plain-language description |
| granted_at | timestamptz | |
| expires_at | timestamptz | Null if indefinite |
| revoked_at | timestamptz | Null if active |
| status | enum | ACTIVE, EXPIRED, REVOKED |

**Key design principle:** Consent is scoped. HEALTH_RECORDS consent does not automatically grant WELLNESS_DATA access.

#### consent_audit
Every consent change is recorded immutably.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| consent_id | UUID | FK |
| action | enum | GRANTED, REVIEWED, REVOKED, EXPIRED |
| actor_id | UUID | Who performed the action |
| reason | text | Optional reason |
| created_at | timestamptz | Immutable |

---

### 3.9 Appointment Domain

#### appointments
The appointment state machine.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| patient_id | UUID | FK to patient_profiles |
| doctor_id | UUID | FK to doctor_profiles |
| slot_id | UUID | FK to availability_slots |
| consultation_offer_id | UUID | FK |
| care_relationship_id | UUID | FK; may be created at booking time |
| status | enum | See state machine |
| held_at | timestamptz | When HELD status entered |
| hold_expires_at | timestamptz | |
| requested_at | timestamptz | |
| confirmed_at | timestamptz | |
| completed_at | timestamptz | |
| declined_at | timestamptz | |
| cancelled_at | timestamptz | |
| cancelled_by | enum | PATIENT, DOCTOR, SYSTEM |
| cancellation_reason | text | |
| no_show_at | timestamptz | |
| idempotency_key | varchar(100) | Client-provided; unique constraint |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### appointment_state_machine

```
AVAILABLE (slot)
     |
     v (patient initiates hold)
   HELD
     |
     v (patient submits request)
REQUESTED
     |
     +-- Doctor accepts --> CONFIRMED --> COMPLETED
     |                                     |
     +-- Doctor declines --> DECLINED      +--> NO_SHOW (if patient absent)
     |
     +-- Hold expires --> EXPIRED
     |
     +-- Patient cancels --> CANCELLED
     |
     +-- Doctor cancels --> CANCELLED
```

**Double-booking prevention:**
1. Slot hold creates an atomic row lock.
2. Database unique constraint: one slot cannot have two non-CANCELLED, non-DECLINED, non-EXPIRED appointments.
3. Idempotency key prevents duplicate booking requests.

---

### 3.10 Wellness Domain

#### wellness_check_ins
| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| patient_id | UUID | FK |
| mood | integer | 1–10 scale |
| stress | integer | 1–10 scale |
| sleep_hours | decimal(4,1) | |
| energy | integer | 1–10 scale |
| notes | text | Optional |
| checked_in_at | timestamptz | |

**Data classification:** Health data. Access restricted to the patient and consented parties.

---

### 3.11 Health Records Domain

#### health_records
Metadata only. Binary content in object storage.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| patient_id | UUID | FK |
| record_type | enum | LAB_REPORT, PRESCRIPTION, CONSULTATION_SUMMARY, UPLOADED_DOCUMENT, OTHER |
| title | varchar(200) | |
| description | text | |
| storage_key | text | Object storage path (never a public URL) |
| storage_provider | varchar(50) | Provider identifier |
| file_size_bytes | bigint | |
| mime_type | varchar(100) | |
| uploaded_by | UUID | FK to users |
| upload_source | enum | PATIENT, DOCTOR, SYSTEM |
| linked_consultation_id | UUID | FK; nullable |
| linked_appointment_id | UUID | FK; nullable |
| retention_policy | enum | STANDARD, EXTENDED, PERMANENT | 
| created_at | timestamptz | |
| deleted_at | timestamptz | Soft delete |

**ADR-006: No binary blobs in PostgreSQL.** Only metadata. Binary content is in object storage.

---

### 3.12 AI Domain

#### ai_conversations
| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| patient_id | UUID | FK |
| mode | enum | TEXT, VOICE |
| language | varchar(10) | BCP-47 |
| status | enum | ACTIVE, COMPLETED, ESCALATED |
| escalated_at | timestamptz | |
| escalation_reason | text | |
| started_at | timestamptz | |
| ended_at | timestamptz | |

#### ai_messages
| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| conversation_id | UUID | FK |
| role | enum | USER, ASSISTANT, SYSTEM |
| content | text | Encrypted at rest |
| tokens_used | integer | |
| model_id | varchar(100) | Which model generated this |
| safety_flagged | boolean | |
| created_at | timestamptz | |

**Sensitive:** Conversation content is health-adjacent data. Encrypted at rest.

#### ai_safety_events
| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| conversation_id | UUID | FK |
| message_id | UUID | FK |
| patient_id | UUID | FK |
| risk_level | enum | LOW, MEDIUM, HIGH, CRISIS |
| detected_categories | jsonb | What was detected |
| escalation_triggered | boolean | |
| escalation_target | enum | HUMAN_CARE, EMERGENCY_RESOURCES, NONE |
| reviewed_by | UUID | Nullable; admin reviewer |
| created_at | timestamptz | |

---

### 3.13 Payments Domain

#### payments
| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| appointment_id | UUID | FK |
| patient_id | UUID | FK |
| doctor_id | UUID | FK |
| amount | decimal(10,2) | |
| currency | varchar(3) | |
| status | enum | PENDING, AUTHORIZED, CAPTURED, FAILED, REFUNDED, PARTIALLY_REFUNDED |
| gateway | varchar(50) | Provider identifier |
| gateway_payment_id | varchar(200) | Provider's payment ID |
| gateway_order_id | varchar(200) | |
| idempotency_key | varchar(200) | Unique per payment intent |
| failure_reason | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Financial audit requirement:** All payment state changes must be logged with event type, previous status, new status, amount, and timestamp.

---

## 4. Index Requirements

| Table | Index | Reason |
|---|---|---|
| users | email (unique) | Login lookup |
| public_identifiers | public_id (unique) | Public API lookup |
| appointments | (patient_id, status) | Patient's appointments |
| appointments | (doctor_id, status) | Doctor's appointments |
| appointments | idempotency_key (unique) | Idempotent booking |
| availability_slots | (doctor_profile_id, starts_at) | Availability queries |
| availability_slots | (doctor_profile_id, starts_at, status) | Partial unique for booking |
| ai_conversations | patient_id | Patient's conversation history |
| consents | (patient_id, grantee_id, scope, status) | Consent lookup |
| care_relationships | (patient_id, doctor_id, status) | Relationship lookup |
| audit_logs | (actor_id, created_at) | Audit queries |
| audit_logs | (resource_type, resource_id) | Resource audit trail |
| payments | idempotency_key (unique) | Idempotent payments |
| health_records | (patient_id, deleted_at) | Patient records |

---

## 5. Transaction Boundaries

| Operation | Transaction Scope | Risk |
|---|---|---|
| Appointment hold creation | Single transaction: lock slot + create hold + update slot status | Double-booking |
| Appointment confirmation | Single transaction: update appointment + create payment intent | Inconsistent state |
| Consent grant | Single transaction: create consent + create audit entry | Missing audit trail |
| Consent revoke | Single transaction: update consent + create audit entry + revoke access | Partial revocation |
| Refresh token rotation | Single transaction: invalidate old token + issue new token | Token reuse attack |
| Doctor verification approval | Single transaction: update status + create audit entry + trigger notification | Missing audit |

---

## 6. Data Retention Considerations

**LEGAL / REGULATORY REVIEW REQUIRED** for all retention periods.

| Data Category | Minimum Retention | Notes |
|---|---|---|
| Health records | JURISDICTION DEPENDENT | May be 5–20+ years |
| Audit logs | JURISDICTION DEPENDENT | Often 2–7 years for healthcare |
| Consent records | Duration of consent + legal requirement | Cannot delete before expiry |
| AI conversations | DECISION REQUIRED | User privacy vs. medical continuity |
| Payment records | Financial regulation dependent | Typically 7 years |
| Security events | 1–3 years minimum | DECISION REQUIRED |

**Soft delete strategy:** Sensitive data uses soft delete (deleted_at timestamp). Hard delete only after retention period AND with explicit policy and audit trail.

---

## 7. Backup and Recovery Architecture

See detail: [Backup_Recovery.md](Backup_Recovery.md)

**Minimum requirements:**
- Daily full database backup to object storage
- Point-in-time recovery (WAL archiving) enabled
- Backup encryption
- Backup restore tested at least monthly
- Recovery time objective (RTO): DECISION REQUIRED
- Recovery point objective (RPO): DECISION REQUIRED

---

## 8. Prisma ORM & Advanced PostgreSQL Features

### 8.1 Primary ORM & Raw SQL Migration Boundary
Prisma 7.x serves as MANVIA's primary ORM for type-safe schema modeling, migrations, and standard application queries. However, advanced PostgreSQL features critical to a healthcare platform cannot be expressed purely within Prisma's schema definition language (DSL). These features are managed via versioned raw SQL embedded in Prisma migration files (`migration.sql`) and accessed via `prisma.$queryRaw`:

1. **Composite Exclusion Constraints:**  
   Enforced via `CREATE EXTENSION btree_gist;` and `ALTER TABLE appointments ADD CONSTRAINT no_overlapping_doctor_appointments EXCLUDE USING gist (doctor_id WITH =, tsrange(scheduled_start_time, scheduled_end_time) WITH &&) WHERE (status IN ('RESERVED', 'CONFIRMED', 'IN_PROGRESS'));`.
2. **Range Types (`tsrange`):**  
   PostgreSQL timestamp ranges handle boundary checks with inclusive/exclusive bounds natively.
3. **Vector Similarity (`pgvector`):**  
   The `pgvector` extension creates vector columns and IVFFlat / HNSW indexes for RAG embeddings. Queries utilize cosine distance operators (`<=>`) via `$queryRaw`.
4. **Partial Indexes:**  
   Targeted indexes on active subsets (e.g. `WHERE status = 'ACTIVE'` or non-deleted records) optimize lookup performance while keeping index size minimal.

### 8.2 Authoritative Consistency Boundary for Double-Booking
* **PostgreSQL is the Sole Authoritative Consistency Boundary:** All concurrency correctness for appointment booking rests on PostgreSQL ACID transactions and GiST exclusion constraints. Even under extreme race conditions or distributed worker failure, PostgreSQL guarantees zero overlapping confirmed bookings.
* **Role of Redis Distributed Locking (`Redlock`):** Redis locks provide an application-level optimization to shed database load, rapidly reject concurrent duplicate requests (HTTP 409), and coordinate 10-minute slot holds before hits reach the database. Redis locking is an operational shield, **not a replacement** for database ACID consistency.

---

## 9. Migration Strategy

- All schema changes via Prisma migrations (`prisma migrate dev` / `prisma migrate deploy`).
- Advanced PostgreSQL features are committed as versioned SQL inside migration directories.
- Destructive migrations (column drop, table drop) require the Expand/Contract three-phase pattern.
- No raw SQL in application code without documented justification and review.
- Migration CI step validates migrations apply cleanly from scratch on every PR.

---

*Schema implementation begins in Phase 3. This document is the authoritative conceptual specification that Prisma schema must match.*
