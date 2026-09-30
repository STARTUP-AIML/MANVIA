-- CreateEnum
CREATE TYPE "CancellationActorType" AS ENUM (
    'PATIENT',
    'DOCTOR',
    'ADMIN',
    'SYSTEM'
);

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM (
    'REQUESTED',
    'PENDING',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED'
);

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM (
    'ACTIVE',
    'OFFERED',
    'ACCEPTED',
    'DECLINED',
    'FULFILLED',
    'EXPIRED',
    'CANCELLED'
);

-- CreateTable
CREATE TABLE "appointment_cancellations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "cancelled_by" VARCHAR(128) NOT NULL,
    "cancellation_actor_type" "CancellationActorType" NOT NULL,
    "reason" TEXT NOT NULL,
    "reason_code" VARCHAR(64),
    "metadata" TEXT,
    "cancelled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_refund_id" VARCHAR(32) NOT NULL,
    "appointment_id" UUID NOT NULL,
    "payment_id" VARCHAR(128),
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "idempotency_key" VARCHAR(128),
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "provider_reference" VARCHAR(255),
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_waitlist_id" VARCHAR(32) NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "consultation_offer_id" UUID,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferred_start_date" TIMESTAMPTZ(6),
    "preferred_end_date" TIMESTAMPTZ(6),
    "notes" TEXT,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offered_at" TIMESTAMPTZ(6),
    "offer_expires_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "declined_at" TIMESTAMPTZ(6),
    "fulfilled_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "offered_appointment_id" UUID,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointment_cancellations_appointment_id_key" ON "appointment_cancellations"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_cancellations_appointment_id_idx" ON "appointment_cancellations"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_cancellations_cancelled_by_idx" ON "appointment_cancellations"("cancelled_by");

-- CreateIndex
CREATE INDEX "appointment_cancellations_cancelled_at_idx" ON "appointment_cancellations"("cancelled_at");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_public_refund_id_key" ON "refunds"("public_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_idempotency_key_key" ON "refunds"("idempotency_key");

-- CreateIndex
CREATE INDEX "refunds_appointment_id_idx" ON "refunds"("appointment_id");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "refunds_requested_at_idx" ON "refunds"("requested_at");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_public_waitlist_id_key" ON "waitlist_entries"("public_waitlist_id");

-- CreateIndex
CREATE INDEX "waitlist_entries_patient_id_idx" ON "waitlist_entries"("patient_id");

-- CreateIndex
CREATE INDEX "waitlist_entries_doctor_id_idx" ON "waitlist_entries"("doctor_id");

-- CreateIndex
CREATE INDEX "waitlist_entries_status_idx" ON "waitlist_entries"("status");

-- CreateIndex
CREATE INDEX "waitlist_entries_doctor_id_status_priority_joined_at_idx" ON "waitlist_entries"("doctor_id", "status", "priority" DESC, "joined_at" ASC);

-- CreateIndex
CREATE INDEX "waitlist_entries_joined_at_idx" ON "waitlist_entries"("joined_at");

-- AddForeignKey
ALTER TABLE "appointment_cancellations" ADD CONSTRAINT "appointment_cancellations_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_consultation_offer_id_fkey" FOREIGN KEY ("consultation_offer_id") REFERENCES "consultation_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_offered_appointment_id_fkey" FOREIGN KEY ("offered_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
