-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM (
    'RESERVED',
    'REQUESTED',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'DECLINED',
    'EXPIRED',
    'NO_SHOW'
);

-- CreateEnum
CREATE TYPE "SlotReservationState" AS ENUM (
    'AVAILABLE',
    'HELD_IN_RESERVATION',
    'BOOKED'
);

-- CreateEnum
CREATE TYPE "PreConsultationStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'SUBMITTED'
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_appointment_id" VARCHAR(32) NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "consultation_offer_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "reservation_state" "SlotReservationState" NOT NULL DEFAULT 'BOOKED',
    "reserved_until" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" VARCHAR(128),
    "decline_reason" TEXT,
    "declined_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "no_show_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_consultations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "status" "PreConsultationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reason_for_visit" VARCHAR(1000) NOT NULL,
    "symptoms" TEXT,
    "symptom_onset" VARCHAR(100),
    "current_medications" TEXT,
    "allergies" TEXT,
    "patient_notes" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pre_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_public_appointment_id_key" ON "appointments"("public_appointment_id");

-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_doctor_id_idx" ON "appointments"("doctor_id");

-- CreateIndex
CREATE INDEX "appointments_consultation_offer_id_idx" ON "appointments"("consultation_offer_id");

-- CreateIndex
CREATE INDEX "appointments_start_at_idx" ON "appointments"("start_at");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_doctor_id_start_at_idx" ON "appointments"("doctor_id", "start_at");

-- CreateIndex
CREATE INDEX "appointments_patient_id_start_at_idx" ON "appointments"("patient_id", "start_at");

-- PostgreSQL Partial Unique Index for Authoritative Double-Booking Prevention:
-- Guarantees that at most one active (non-cancelled, non-declined, non-expired) booking exists per doctor per start time.
CREATE UNIQUE INDEX "unique_active_doctor_slot" ON "appointments" ("doctor_id", "start_at")
WHERE "status" NOT IN ('CANCELLED', 'DECLINED', 'EXPIRED');

-- CreateIndex
CREATE UNIQUE INDEX "pre_consultations_appointment_id_key" ON "pre_consultations"("appointment_id");

-- CreateIndex
CREATE INDEX "pre_consultations_appointment_id_idx" ON "pre_consultations"("appointment_id");

-- CreateIndex
CREATE INDEX "pre_consultations_patient_id_idx" ON "pre_consultations"("patient_id");

-- CreateIndex
CREATE INDEX "pre_consultations_status_idx" ON "pre_consultations"("status");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_consultation_offer_id_fkey" FOREIGN KEY ("consultation_offer_id") REFERENCES "consultation_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_consultations" ADD CONSTRAINT "pre_consultations_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_consultations" ADD CONSTRAINT "pre_consultations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
