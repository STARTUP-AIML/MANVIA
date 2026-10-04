-- ==============================================================================
-- MANVIA — Migration: 20261004100000_m2_taxonomy_and_constraints
-- Domain: M2 Doctors, Availability & Consultation Offers Integrity
-- ==============================================================================

-- 1. Idempotent Baseline Specialties Taxonomy Seeding
INSERT INTO "specialties" ("id", "code", "name", "description", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'INTERNAL_MED', 'Internal Medicine', 'Comprehensive adult health and chronic disease care', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CARDIO', 'Cardiology', 'Disorders of the heart and cardiovascular system', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'NEURO', 'Neurology', 'Disorders of the nervous system and brain', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PEDIATRICS', 'Pediatrics', 'Medical care of infants, children, and adolescents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'DERMATOLOGY', 'Dermatology', 'Skin, hair, and nail health and pathologies', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PSYCHIATRY', 'Psychiatry', 'Mental health, behavioral conditions, and psychotherapy', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'GENERAL_PRACTICE', 'General Practice', 'Primary outpatient medical consultations', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- 2. Idempotent Baseline Languages Taxonomy Seeding
INSERT INTO "languages" ("id", "code", "name", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'en', 'English', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'es', 'Spanish', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'hi', 'Hindi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'te', 'Telugu', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'fr', 'French', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'de', 'German', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- 3. Integrity Check Constraints on Consultation Offers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultation_offers_fee_positive'
  ) THEN
    ALTER TABLE "consultation_offers"
      ADD CONSTRAINT "consultation_offers_fee_positive" CHECK ("fee" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultation_offers_duration_positive'
  ) THEN
    ALTER TABLE "consultation_offers"
      ADD CONSTRAINT "consultation_offers_duration_positive" CHECK ("duration_minutes" > 0);
  END IF;
END $$;

-- 4. Integrity Check Constraints on Doctor Availabilities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'doctor_availabilities_start_before_end'
  ) THEN
    ALTER TABLE "doctor_availabilities"
      ADD CONSTRAINT "doctor_availabilities_start_before_end" CHECK ("start_time" < "end_time");
  END IF;
END $$;
