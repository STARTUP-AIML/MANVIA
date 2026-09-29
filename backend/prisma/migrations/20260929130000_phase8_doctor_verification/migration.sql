-- ==============================================================================
-- MANVIA — Migration: 20260929130000_phase8_doctor_verification
-- Domain: Doctor Verification (Phase 8: Controlled Administrative Workflow)
-- ==============================================================================

-- 1. Create Enums
CREATE TYPE "DoctorVerificationStatus" AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE "VerificationDocumentType" AS ENUM (
    'MEDICAL_LICENSE',
    'DEGREE_CERTIFICATE',
    'GOVERNMENT_ID',
    'MALPRACTICE_INSURANCE',
    'OTHER'
);

CREATE TYPE "DocumentStatus" AS ENUM (
    'ACTIVE',
    'SUPERSEDED',
    'REVOKED'
);

CREATE TYPE "ReviewAction" AS ENUM (
    'APPROVED',
    'REJECTED',
    'MORE_INFO_REQUESTED'
);

-- 2. Create Table: doctor_verifications
CREATE TABLE "doctor_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "status" "DoctorVerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "submission_notes" TEXT,
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_verifications_pkey" PRIMARY KEY ("id")
);

-- 3. Create Table: verification_documents
CREATE TABLE "verification_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "verification_id" UUID NOT NULL,
    "document_type" "VerificationDocumentType" NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

-- 4. Create Table: verification_reviews
CREATE TABLE "verification_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "verification_id" UUID NOT NULL,
    "reviewer_admin_id" VARCHAR(128) NOT NULL,
    "action" "ReviewAction" NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_reviews_pkey" PRIMARY KEY ("id")
);

-- 5. Constraints & Unique Indexes
CREATE UNIQUE INDEX "verification_documents_storage_key_key" ON "verification_documents"("storage_key");

-- 6. Indexes for Query Performance & Lifecycle Queries
CREATE INDEX "doctor_verifications_doctor_id_idx" ON "doctor_verifications"("doctor_id");
CREATE INDEX "doctor_verifications_status_idx" ON "doctor_verifications"("status");
CREATE INDEX "doctor_verifications_submitted_at_idx" ON "doctor_verifications"("submitted_at");

CREATE INDEX "verification_documents_verification_id_idx" ON "verification_documents"("verification_id");
CREATE INDEX "verification_documents_document_type_idx" ON "verification_documents"("document_type");

CREATE INDEX "verification_reviews_verification_id_idx" ON "verification_reviews"("verification_id");
CREATE INDEX "verification_reviews_reviewer_admin_id_idx" ON "verification_reviews"("reviewer_admin_id");
CREATE INDEX "verification_reviews_created_at_idx" ON "verification_reviews"("created_at");

-- 7. Foreign Key Relationships
ALTER TABLE "doctor_verifications"
    ADD CONSTRAINT "doctor_verifications_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "verification_documents"
    ADD CONSTRAINT "verification_documents_verification_id_fkey"
    FOREIGN KEY ("verification_id") REFERENCES "doctor_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "verification_reviews"
    ADD CONSTRAINT "verification_reviews_verification_id_fkey"
    FOREIGN KEY ("verification_id") REFERENCES "doctor_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
