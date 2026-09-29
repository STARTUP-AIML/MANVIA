-- ==============================================================================
-- MANVIA — Migration: 20260929150000_phase9_doctor_availability_offers
-- Domain: Doctor Availability & Consultation Offers (Phase 9)
-- ==============================================================================

-- 1. Create Enums
CREATE TYPE "DayOfWeek" AS ENUM (
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
);

CREATE TYPE "ConsultationType" AS ENUM (
    'INITIAL',
    'FOLLOW_UP',
    'GENERAL',
    'SPECIALIST'
);

CREATE TYPE "OfferStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'INACTIVE'
);

-- 2. Create Table: doctor_availabilities
CREATE TABLE "doctor_availabilities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "effective_from" DATE,
    "effective_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_availabilities_pkey" PRIMARY KEY ("id")
);

-- 3. Create Table: consultation_offers
CREATE TABLE "consultation_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "consultation_type" "ConsultationType" NOT NULL DEFAULT 'GENERAL',
    "duration_minutes" INTEGER NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "OfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_offers_pkey" PRIMARY KEY ("id")
);

-- 4. Foreign Key Constraints
ALTER TABLE "doctor_availabilities"
    ADD CONSTRAINT "doctor_availabilities_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "consultation_offers"
    ADD CONSTRAINT "consultation_offers_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Indexes for Availability & Discovery Query Patterns
CREATE INDEX "doctor_availabilities_doctor_id_idx" ON "doctor_availabilities"("doctor_id");
CREATE INDEX "doctor_availabilities_doctor_id_is_active_idx" ON "doctor_availabilities"("doctor_id", "is_active");
CREATE INDEX "doctor_availabilities_doctor_id_day_of_week_idx" ON "doctor_availabilities"("doctor_id", "day_of_week");

CREATE INDEX "consultation_offers_doctor_id_idx" ON "consultation_offers"("doctor_id");
CREATE INDEX "consultation_offers_doctor_id_status_idx" ON "consultation_offers"("doctor_id", "status");
CREATE INDEX "consultation_offers_consultation_type_idx" ON "consultation_offers"("consultation_type");
