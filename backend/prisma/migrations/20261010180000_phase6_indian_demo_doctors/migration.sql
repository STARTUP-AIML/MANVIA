-- ==============================================================================
-- MANVIA — Migration: 20261010180000_phase6_indian_demo_doctors
-- Domain: Phase 6 — 10 Indian Demo Doctors, Complete Clinical Metadata & Currency
-- ==============================================================================

-- 1. Add Indian Clinic, Location, Demo, Contact & Practice Metadata Columns
ALTER TABLE "doctor_profiles"
  ADD COLUMN IF NOT EXISTS "clinic_name" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "city" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "state" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "clinical_interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "consultation_modes" TEXT[] DEFAULT ARRAY['VIDEO', 'IN_PERSON']::TEXT[],
  ADD COLUMN IF NOT EXISTS "contact_display" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "profile_image_url" VARCHAR(512),
  ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN DEFAULT false;

-- Create index on is_demo for efficient directory filtering
CREATE INDEX IF NOT EXISTS "idx_doctor_profiles_is_demo" ON "doctor_profiles" ("is_demo");

-- 2. Ensure Coordinated Care & Essential Specialties Exist
INSERT INTO "specialties" ("id", "code", "name", "description", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'COORDINATED_CARE', 'Coordinated Care Physician', 'Holistic longitudinal primary care, cross-specialty coordination, and chronic wellness', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- 3. Ensure Key Indian Regional Languages Exist
INSERT INTO "languages" ("id", "code", "name", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'kn', 'Kannada', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'ta', 'Tamil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'mr', 'Marathi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'ml', 'Malayalam', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'bn', 'Bengali', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
