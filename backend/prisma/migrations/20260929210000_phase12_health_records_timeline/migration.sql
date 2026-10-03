-- ==============================================================================
-- MANVIA — Migration: 20260929210000_phase12_health_records_timeline
-- Domain: Health Records & Health Timeline (Phase 12)
-- ==============================================================================

-- 1. Create Enums
CREATE TYPE "HealthRecordCategory" AS ENUM (
    'LAB_REPORT',
    'PRESCRIPTION',
    'CLINICAL_SUMMARY',
    'IMAGING',
    'DISCHARGE_SUMMARY',
    'OTHER'
);

CREATE TYPE "HealthRecordStatus" AS ENUM (
    'PENDING',
    'AVAILABLE',
    'ARCHIVED',
    'DELETED'
);

CREATE TYPE "TimelineEventType" AS ENUM (
    'HEALTH_RECORD_ADDED',
    'WELLNESS_CHECK_IN',
    'CONSULTATION',
    'APPOINTMENT',
    'OTHER'
);

-- 2. Create Table: health_records
CREATE TABLE "health_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_record_id" VARCHAR(32) NOT NULL,
    "patient_id" UUID NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "category" "HealthRecordCategory" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "storage_key" VARCHAR(512) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "sha256_hash" VARCHAR(64),
    "status" "HealthRecordStatus" NOT NULL DEFAULT 'AVAILABLE',
    "recorded_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "health_records_public_record_id_key" UNIQUE ("public_record_id"),
    CONSTRAINT "health_records_storage_key_key" UNIQUE ("storage_key"),
    CONSTRAINT "health_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "health_records_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 3. Create Indexes on health_records
CREATE INDEX "health_records_patient_id_idx" ON "health_records"("patient_id");
CREATE INDEX "health_records_patient_id_recorded_date_idx" ON "health_records"("patient_id", "recorded_date" DESC);
CREATE INDEX "health_records_category_idx" ON "health_records"("category");
CREATE INDEX "health_records_status_idx" ON "health_records"("status");

-- 4. Create Table: timeline_events
CREATE TABLE "timeline_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_event_id" VARCHAR(32) NOT NULL,
    "patient_id" UUID NOT NULL,
    "event_type" "TimelineEventType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" TEXT NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_id" VARCHAR(128),
    "event_timestamp" TIMESTAMPTZ(6) NOT NULL,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "timeline_events_public_event_id_key" UNIQUE ("public_event_id"),
    CONSTRAINT "timeline_events_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. Create Indexes on timeline_events
CREATE INDEX "timeline_events_patient_id_idx" ON "timeline_events"("patient_id");
CREATE INDEX "timeline_events_patient_id_event_timestamp_idx" ON "timeline_events"("patient_id", "event_timestamp" DESC);
CREATE INDEX "timeline_events_event_type_idx" ON "timeline_events"("event_type");
CREATE INDEX "timeline_events_source_type_source_id_idx" ON "timeline_events"("source_type", "source_id");
