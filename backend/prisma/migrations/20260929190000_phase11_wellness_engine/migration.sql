-- ==============================================================================
-- MANVIA — Migration: 20260929190000_phase11_wellness_engine
-- Domain: Wellness Engine & Patient Check-ins (Phase 11)
-- ==============================================================================

-- 1. Create Table: wellness_check_ins
CREATE TABLE "wellness_check_ins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "mood" SMALLINT NOT NULL,
    "stress" SMALLINT NOT NULL,
    "energy" SMALLINT NOT NULL,
    "sleep_quality" SMALLINT NOT NULL,
    "sleep_duration_minutes" INTEGER,
    "note" TEXT,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wellness_check_ins_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wellness_check_ins_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wellness_check_ins_mood_check" CHECK ("mood" >= 1 AND "mood" <= 5),
    CONSTRAINT "wellness_check_ins_stress_check" CHECK ("stress" >= 1 AND "stress" <= 5),
    CONSTRAINT "wellness_check_ins_energy_check" CHECK ("energy" >= 1 AND "energy" <= 5),
    CONSTRAINT "wellness_check_ins_sleep_quality_check" CHECK ("sleep_quality" >= 1 AND "sleep_quality" <= 5),
    CONSTRAINT "wellness_check_ins_sleep_duration_check" CHECK ("sleep_duration_minutes" IS NULL OR ("sleep_duration_minutes" >= 0 AND "sleep_duration_minutes" <= 1440))
);

-- 2. Create Indexes
CREATE INDEX "wellness_check_ins_patient_id_idx" ON "wellness_check_ins"("patient_id");
CREATE INDEX "wellness_check_ins_patient_id_recorded_at_idx" ON "wellness_check_ins"("patient_id", "recorded_at" DESC);
