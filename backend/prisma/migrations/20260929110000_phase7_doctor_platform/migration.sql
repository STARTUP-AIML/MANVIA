-- ==============================================================================
-- MANVIA — Migration: 20260929110000_phase7_doctor_platform
-- Domain: Doctor Platform (Phase 7)
-- ==============================================================================

-- 1. Create Enum: VerificationStatus
CREATE TYPE "VerificationStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'MORE_INFORMATION_REQUIRED',
    'VERIFIED',
    'REJECTED',
    'SUSPENDED',
    'EXPIRED'
);

-- 2. Ensure User Identity Anchor Table Exists (Boundary anchor for Phase 4)
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- 3. Create Table: doctor_profiles
CREATE TABLE "doctor_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "public_doctor_id" VARCHAR(16) NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "bio" TEXT,
    "medical_registration_number" VARCHAR(64) NOT NULL,
    "licensing_council" VARCHAR(128) NOT NULL,
    "years_of_experience" INTEGER NOT NULL DEFAULT 0,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "default_consultation_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

-- 4. Create Table: specialties
CREATE TABLE "specialties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- 5. Create Table: doctor_specialties
CREATE TABLE "doctor_specialties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "specialty_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_specialties_pkey" PRIMARY KEY ("id")
);

-- 6. Create Table: languages
CREATE TABLE "languages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- 7. Create Table: doctor_languages
CREATE TABLE "doctor_languages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "language_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_languages_pkey" PRIMARY KEY ("id")
);

-- 8. Create Table: doctor_qualifications
CREATE TABLE "doctor_qualifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "qualification" VARCHAR(100) NOT NULL,
    "institution" VARCHAR(200) NOT NULL,
    "field_of_study" VARCHAR(100),
    "graduation_year" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_qualifications_pkey" PRIMARY KEY ("id")
);

-- Uniqueness Constraints
CREATE UNIQUE INDEX "doctor_profiles_user_id_key" ON "doctor_profiles"("user_id");
CREATE UNIQUE INDEX "doctor_profiles_public_doctor_id_key" ON "doctor_profiles"("public_doctor_id");
CREATE UNIQUE INDEX "doctor_profiles_medical_registration_number_key" ON "doctor_profiles"("medical_registration_number");
CREATE UNIQUE INDEX "specialties_code_key" ON "specialties"("code");
CREATE UNIQUE INDEX "specialties_name_key" ON "specialties"("name");
CREATE UNIQUE INDEX "doctor_specialty_unique" ON "doctor_specialties"("doctor_id", "specialty_id");
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");
CREATE UNIQUE INDEX "doctor_language_unique" ON "doctor_languages"("doctor_id", "language_id");

-- Lookup & Query Performance Indexes
CREATE INDEX "doctor_profiles_public_doctor_id_idx" ON "doctor_profiles"("public_doctor_id");
CREATE INDEX "doctor_profiles_verification_status_idx" ON "doctor_profiles"("verification_status");
CREATE INDEX "doctor_profiles_medical_registration_number_idx" ON "doctor_profiles"("medical_registration_number");
CREATE INDEX "specialties_code_idx" ON "specialties"("code");
CREATE INDEX "specialties_is_active_idx" ON "specialties"("is_active");
CREATE INDEX "doctor_specialties_doctor_id_idx" ON "doctor_specialties"("doctor_id");
CREATE INDEX "doctor_specialties_specialty_id_idx" ON "doctor_specialties"("specialty_id");
CREATE INDEX "languages_code_idx" ON "languages"("code");
CREATE INDEX "doctor_languages_doctor_id_idx" ON "doctor_languages"("doctor_id");
CREATE INDEX "doctor_languages_language_id_idx" ON "doctor_languages"("language_id");
CREATE INDEX "doctor_qualifications_doctor_id_idx" ON "doctor_qualifications"("doctor_id");

-- Referential Integrity Foreign Keys
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_specialties" ADD CONSTRAINT "doctor_specialties_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctor_specialties" ADD CONSTRAINT "doctor_specialties_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_languages" ADD CONSTRAINT "doctor_languages_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctor_languages" ADD CONSTRAINT "doctor_languages_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_qualifications" ADD CONSTRAINT "doctor_qualifications_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
