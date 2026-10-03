# MANVIA — Comprehensive Data Dictionary

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Overview & Data Types Standard

All primary keys use UUIDv7 (or UUIDv4 indexed B-Tree) to guarantee collision-free decentralized generation and monotonic time-sortability. Sensitive clinical fields (reflections, SOAP notes, prescriptions, and file DEKs) are encrypted using AES-256-GCM before storage.

### 1.1 Field-Level PII & Blind-Index (HMAC) Strategy
To reconcile field-level encryption with fast $O(1)$ case-insensitive uniqueness and query lookups without exposing plaintext PII in database storage:
* Plaintext email and phone numbers are encrypted at rest using AES-256-GCM (`email_encrypted`, `phone_encrypted`).
* A deterministic cryptographic **Blind Index** column is stored alongside each encrypted field:
  * `email_bidx` = `HMAC-SHA256(LOWER(TRIM(email)), BLIND_INDEX_SALT)`
  * `phone_bidx` = `HMAC-SHA256(E164(phone), BLIND_INDEX_SALT)`
* The `BLIND_INDEX_SALT` is securely stored in KMS/Secrets Manager.
* Uniqueness constraints and lookup queries target the `_bidx` columns, guaranteeing zero plaintext PII in database indexes.

---

## 2. Core Tables Specification

### 2.1 `users` Table
Central authentication and identity anchor.

| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Unique user identity identifier |
| `email_encrypted` | `TEXT` | Yes | NULL | — | AES-256-GCM encrypted email address |
| `email_bidx` | `VARCHAR(64)` | Yes | NULL | `UNIQUE`, `INDEX` | Blind index HMAC-SHA256 of lowercase email |
| `phone_encrypted` | `TEXT` | Yes | NULL | — | AES-256-GCM encrypted phone number |
| `phone_bidx` | `VARCHAR(64)` | Yes | NULL | `UNIQUE`, `INDEX` | Blind index HMAC-SHA256 of normalized phone |
| `password_hash` | `VARCHAR(255)` | Yes | NULL | — | Argon2id cryptographic hash (NULL for OAuth-only users) |
| `status` | `user_status_enum` | No | `'ACTIVE'` | `INDEX` | `ACTIVE`, `SUSPENDED`, `DEACTIVATED`, `LOCKED` |
| `failed_login_attempts`| `INT` | No | `0` | — | Counter for progressive authentication backoff |
| `lockout_until` | `TIMESTAMPTZ` | Yes | NULL | — | Timestamp until account login is locked |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | — | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | — | Record last update timestamp |

---

### 2.2 `patient_profiles` Table
Stores patient demographic and profile attributes linked 1:1 with `users`.

| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Primary key |
| `user_id` | `UUID` | No | — | `FK -> users(id) ON DELETE RESTRICT`, `UNIQUE` | User account linkage |
| `public_patient_id` | `VARCHAR(16)` | No | — | `UNIQUE`, `INDEX` | Human-readable public ID (e.g. `PAT-48291048`) |
| `legal_first_name` | `VARCHAR(100)` | No | — | — | Patient legal first name |
| `legal_last_name` | `VARCHAR(100)` | No | — | — | Patient legal last name |
| `date_of_birth` | `DATE` | No | — | — | Date of birth for age gating and clinical relevance |
| `biological_sex` | `sex_enum` | No | — | — | `MALE`, `FEMALE`, `INTERSEX`, `OTHER` |
| `blood_group` | `VARCHAR(5)` | Yes | NULL | — | Optional clinical blood group (`A+`, `O-`, etc.) |
| `emergency_contact_name`| `VARCHAR(150)`| Yes | NULL | — | Primary emergency contact name |
| `emergency_contact_phone`| `VARCHAR(32)` | Yes | NULL | — | Primary emergency contact phone |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | — | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | — | Update timestamp |

---

### 2.3 `doctor_profiles` Table
Stores healthcare provider credentials, licensing, and administrative verification status.

| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Primary key |
| `user_id` | `UUID` | No | — | `FK -> users(id) ON DELETE RESTRICT`, `UNIQUE` | User account linkage |
| `public_doctor_id` | `VARCHAR(16)` | No | — | `UNIQUE`, `INDEX` | Human-readable public ID (e.g. `DOC-90218471`) |
| `medical_registration_number`| `VARCHAR(64)` | No | — | `UNIQUE`, `INDEX` | Official state medical council registration ID |
| `licensing_council` | `VARCHAR(128)` | No | — | — | Name of medical council issuing license |
| `years_of_experience` | `INT` | No | `0` | — | Verified clinical experience years |
| `verification_status` | `verification_status_enum` | No | `'DRAFT'` | `INDEX` | Canonical lifecycle: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `MORE_INFORMATION_REQUIRED`, `VERIFIED`, `REJECTED`, `SUSPENDED`, `EXPIRED` |
| `default_consultation_fee`| `DECIMAL(10,2)`| No | `0.00` | — | Base consultation price in default platform currency |
| `currency` | `VARCHAR(3)` | No | `'USD'` | — | ISO-4217 3-letter currency code |
| `bio_summary` | `TEXT` | Yes | NULL | — | Doctor public bio |
| `verified_at` | `TIMESTAMPTZ` | Yes | NULL | — | Timestamp of administrative verification approval |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | — | Creation timestamp |

---

### 2.4 Managed Taxonomy Tables: `specialties` & `languages`

#### `specialties` Table
| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Specialty primary key |
| `code` | `VARCHAR(50)` | No | — | `UNIQUE`, `INDEX` | Standardized clinical taxonomy code (e.g. `CARDIO`, `INTERNAL_MED`) |
| `name` | `VARCHAR(100)` | No | — | `UNIQUE` | Display name (e.g. "Cardiology") |
| `description` | `TEXT` | Yes | NULL | — | Detailed clinical specialty description |
| `is_active` | `BOOLEAN` | No | `TRUE` | `INDEX` | Active listing status |

#### `doctor_specialties` Table
| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Mapping primary key |
| `doctor_id` | `UUID` | No | — | `FK -> doctor_profiles(id) ON DELETE CASCADE`, `INDEX` | Doctor reference |
| `specialty_id` | `UUID` | No | — | `FK -> specialties(id) ON DELETE RESTRICT`, `INDEX` | Specialty reference |
| `is_primary` | `BOOLEAN` | No | `FALSE` | — | True if primary specialty, false if sub-specialty |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | `UNIQUE (doctor_id, specialty_id)` | Integrity constraint |

#### `languages` Table
| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Primary key |
| `iso_code` | `VARCHAR(10)` | No | — | `UNIQUE`, `INDEX` | ISO 639-1 code (e.g. `en`, `es`, `hi`) |
| `name` | `VARCHAR(50)` | No | — | — | Full language name (e.g. "Spanish") |

#### `doctor_languages` Table
| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Primary key |
| `doctor_id` | `UUID` | No | — | `FK -> doctor_profiles(id) ON DELETE CASCADE`, `INDEX` | Doctor reference |
| `language_id` | `UUID` | No | — | `FK -> languages(id) ON DELETE RESTRICT`, `INDEX` | Language reference |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | `UNIQUE (doctor_id, language_id)` | Integrity constraint |

---

### 2.5 `appointments` Table
Governs doctor-patient consultation bookings and transitions.

> **Distinction Between Slot Availability and Appointment Status:**  
> - **Doctor Slot Availability** (`doctor_availability_slots`): `AVAILABLE`, `HELD_IN_RESERVATION`, `BOOKED`.  
> - **Appointment Entity Status** (`appointments`): Follows the lifecycle below.

| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Primary key |
| `public_appointment_id`| `VARCHAR(16)` | No | — | `UNIQUE`, `INDEX` | Public identifier (e.g. `APT-18294719`) |
| `patient_id` | `UUID` | No | — | `FK -> patient_profiles(id)`, `INDEX` | Patient booking the visit |
| `doctor_id` | `UUID` | No | — | `FK -> doctor_profiles(id)`, `INDEX` | Doctor conducting the visit |
| `status` | `appointment_status_enum`| No | `'RESERVED'` | `INDEX` | Canonical lifecycle: `RESERVED`, `REQUESTED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `DECLINED`, `EXPIRED`, `NO_SHOW` |
| `scheduled_start_time` | `TIMESTAMPTZ` | No | — | `INDEX` | Consultation start time |
| `scheduled_end_time` | `TIMESTAMPTZ` | No | — | `INDEX` | Consultation end time |
| `fee_amount` | `DECIMAL(10,2)`| No | — | — | Locked fee for this consultation |
| `cancellation_reason` | `TEXT` | Yes | NULL | — | Recorded explanation if cancelled |
| `cancelled_by_user_id`| `UUID` | Yes | NULL | `FK -> users(id)` | User who initiated cancellation |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | — | Creation timestamp |

---

### 2.6 `consultation_notes` Table
Structured clinical documentation (SOAP format) authored and digitally signed by the doctor post-consultation.

| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Primary key |
| `appointment_id` | `UUID` | No | — | `FK -> appointments(id) ON DELETE RESTRICT`, `UNIQUE` | 1:1 binding to appointment |
| `doctor_id` | `UUID` | No | — | `FK -> doctor_profiles(id)`, `INDEX` | Authoring doctor |
| `patient_id` | `UUID` | No | — | `FK -> patient_profiles(id)`, `INDEX` | Subject patient |
| `subjective_notes_enc` | `TEXT` | No | — | — | AES-256-GCM encrypted patient symptoms and history |
| `objective_notes_enc` | `TEXT` | No | — | — | AES-256-GCM encrypted vital signs and observations |
| `assessment_enc` | `TEXT` | No | — | — | AES-256-GCM encrypted clinical diagnosis / evaluation |
| `plan_enc` | `TEXT` | No | — | — | AES-256-GCM encrypted treatment and care plan |
| `follow_up_instructions`| `TEXT` | Yes | NULL | — | Patient-facing non-encrypted instructions |
| `signed_at` | `TIMESTAMPTZ` | No | `NOW()` | `INDEX` | Timestamp when note was finalized and locked |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | — | Ingestion timestamp |

---

### 2.7 `prescriptions` Table
Digital medical prescriptions issued by verified healthcare providers.

| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Primary key |
| `appointment_id` | `UUID` | No | — | `FK -> appointments(id)`, `INDEX` | Consultation linkage |
| `consultation_note_id`| `UUID` | Yes | NULL | `FK -> consultation_notes(id)` | Associated clinical SOAP note |
| `doctor_id` | `UUID` | No | — | `FK -> doctor_profiles(id)`, `INDEX` | Prescribing doctor |
| `patient_id` | `UUID` | No | — | `FK -> patient_profiles(id)`, `INDEX` | Receiving patient |
| `medication_name` | `VARCHAR(200)`| No | — | `INDEX` | Generic or commercial brand name |
| `dosage` | `VARCHAR(50)` | No | — | — | Strength/dosage (e.g. "500mg") |
| `frequency` | `VARCHAR(100)`| No | — | — | Administration timing (e.g. "Twice daily after meals") |
| `route` | `VARCHAR(50)` | No | `'ORAL'` | — | Route of administration (e.g. ORAL, TOPICAL, INHALATION) |
| `duration_days` | `INT` | No | — | — | Total course duration in days |
| `special_instructions`| `TEXT` | Yes | NULL | — | Clinical precautions or dietary warnings |
| `status` | `prescription_status_enum`| No | `'ACTIVE'`| `INDEX` | `ACTIVE`, `DISCONTINUED`, `EXPIRED`, `FILLED` |
| `issued_at` | `TIMESTAMPTZ` | No | `NOW()` | `INDEX` | Cryptographic issue timestamp |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | — | Record creation timestamp |

---

### 2.8 `health_records` Table
Encrypted clinical documents and laboratory results.

| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Primary key |
| `patient_id` | `UUID` | No | — | `FK -> patient_profiles(id)`, `INDEX` | Patient owner |
| `uploaded_by_user_id` | `UUID` | No | — | `FK -> users(id)` | User who uploaded (patient, doctor, or lab admin) |
| `category` | `record_category_enum`| No | — | `INDEX` | `LAB_REPORT`, `PRESCRIPTION`, `CLINICAL_SUMMARY`, `IMAGING`, `DISCHARGE_SUMMARY` |
| `document_title` | `VARCHAR(200)`| No | — | — | Human-readable title |
| `s3_storage_key` | `VARCHAR(512)`| No | — | `UNIQUE` | Cloud storage object path (no PII in key) |
| `file_mimetype` | `VARCHAR(64)` | No | — | — | Verified file MIME type |
| `file_size_bytes` | `BIGINT` | No | — | — | Document file size |
| `file_sha256` | `VARCHAR(64)` | No | — | — | Cryptographic integrity hash |
| `encrypted_dek` | `TEXT` | No | — | — | Envelope-encrypted Data Encryption Key (KMS-wrapped) |
| `recorded_date` | `DATE` | No | — | `INDEX` | Date of actual medical event/test |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | — | Record ingestion timestamp |

---

### 2.9 `wellness_entries` Table
Daily wellness check-ins and longitudinal logs.

| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Primary key |
| `patient_id` | `UUID` | No | — | `FK -> patient_profiles(id)`, `INDEX` | Patient owner |
| `mood_score` | `SMALLINT` | No | — | `CHECK (mood_score BETWEEN 1 AND 5)` | Mood assessment score |
| `stress_score` | `SMALLINT` | No | — | `CHECK (stress_score BETWEEN 1 AND 5)` | Stress level score |
| `sleep_hours` | `NUMERIC(4,2)`| No | — | `CHECK (sleep_hours >= 0 AND sleep_hours <= 24)` | Duration of sleep |
| `energy_score` | `SMALLINT` | No | — | `CHECK (energy_score BETWEEN 1 AND 5)` | Energy level score |
| `journal_reflection_enc`| `TEXT` | Yes | NULL | — | Field-level encrypted user journaling reflection |
| `logged_at` | `TIMESTAMPTZ` | No | `NOW()` | `INDEX (patient_id, logged_at DESC)` | Check-in timestamp |

---

### 2.10 `audit_logs` Table
Immutable forensic audit trail for healthcare security compliance.

| Column | Type | Nullable | Default | Constraints / Index | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PK` | Primary key |
| `actor_user_id` | `UUID` | Yes | NULL | `FK -> users(id)`, `INDEX` | Performing user identity (NULL for system actions) |
| `ip_address` | `INET` | No | — | — | Originating IP address |
| `user_agent` | `TEXT` | Yes | NULL | — | HTTP user agent |
| `action_name` | `VARCHAR(100)`| No | — | `INDEX` | e.g. `HEALTH_RECORD.READ`, `CONSENT.REVOKE` |
| `resource_type` | `VARCHAR(64)` | No | — | `INDEX` | Targeted resource table or domain |
| `resource_id` | `UUID` | Yes | NULL | `INDEX` | Targeted resource entity ID |
| `diff_payload` | `JSONB` | Yes | NULL | — | Redacted state change payload (PHI scrubbed) |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | `INDEX (created_at DESC)` | Immutable creation timestamp |
