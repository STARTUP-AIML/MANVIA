-- ==============================================================================
-- MANVIA — Migration: 20260929170000_phase10_care_relationships_consent
-- Domain: Care Relationships & Consent (Phase 10)
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE "CareRelationshipStatus" AS ENUM (
        'REQUESTED',
        'ACTIVE',
        'SUSPENDED',
        'TERMINATED',
        'REVOKED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConsentScope" AS ENUM (
        'PATIENT_PROFILE',
        'CONSULTATION_INFO',
        'PRE_CONSULTATION',
        'HEALTH_RECORDS',
        'HEALTH_TIMELINE',
        'WELLNESS'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConsentStatus" AS ENUM (
        'ACTIVE',
        'REVOKED',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConsentAction" AS ENUM (
        'GRANTED',
        'REVOKED',
        'EXPIRED',
        'SCOPE_UPDATED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Extend Table: patient_profiles (Phase 10 additions to Phase 6 baseline)
ALTER TABLE "patient_profiles" ADD COLUMN IF NOT EXISTS "display_name" VARCHAR(150);
ALTER TABLE "patient_profiles" ADD COLUMN IF NOT EXISTS "gender" VARCHAR(30);

-- 3. Create Table: care_relationships
CREATE TABLE "care_relationships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "status" "CareRelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "established_at" TIMESTAMPTZ(6),
    "terminated_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_relationships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "care_relationships_patient_id_doctor_id_key" UNIQUE ("patient_id", "doctor_id"),
    CONSTRAINT "care_relationships_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "care_relationships_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Create Table: consents
CREATE TABLE "consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "care_relationship_id" UUID,
    "scope" "ConsentScope" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE',
    "purpose" TEXT,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_by" VARCHAR(128),
    "revocation_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "consents_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "consents_care_relationship_id_fkey" FOREIGN KEY ("care_relationship_id") REFERENCES "care_relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 5. Create Table: consent_histories
CREATE TABLE "consent_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consent_id" UUID NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "actor_id" VARCHAR(128) NOT NULL,
    "actor_role" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_histories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "consent_histories_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "consents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6. Indexes for Performance & Authorization Verification
CREATE INDEX IF NOT EXISTS "patient_profiles_public_patient_id_idx" ON "patient_profiles"("public_patient_id");

CREATE INDEX "care_relationships_patient_id_idx" ON "care_relationships"("patient_id");
CREATE INDEX "care_relationships_doctor_id_idx" ON "care_relationships"("doctor_id");
CREATE INDEX "care_relationships_status_idx" ON "care_relationships"("status");
CREATE INDEX "care_relationships_patient_id_doctor_id_status_idx" ON "care_relationships"("patient_id", "doctor_id", "status");

CREATE INDEX "consents_patient_id_idx" ON "consents"("patient_id");
CREATE INDEX "consents_doctor_id_idx" ON "consents"("doctor_id");
CREATE INDEX "consents_care_relationship_id_idx" ON "consents"("care_relationship_id");
CREATE INDEX "consents_patient_id_doctor_id_scope_status_idx" ON "consents"("patient_id", "doctor_id", "scope", "status");
CREATE INDEX "consents_status_idx" ON "consents"("status");
CREATE INDEX "consents_expires_at_idx" ON "consents"("expires_at");

CREATE INDEX "consent_histories_consent_id_idx" ON "consent_histories"("consent_id");
CREATE INDEX "consent_histories_actor_id_idx" ON "consent_histories"("actor_id");
CREATE INDEX "consent_histories_created_at_idx" ON "consent_histories"("created_at");
