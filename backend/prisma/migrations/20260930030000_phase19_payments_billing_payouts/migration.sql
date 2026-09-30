-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM (
    'CREATED',
    'PENDING',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
);

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM (
    'INITIATED',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED'
);

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM (
    'DRAFT',
    'ISSUED',
    'PAID',
    'CANCELLED'
);

-- CreateEnum
CREATE TYPE "DoctorPayoutStatus" AS ENUM (
    'PENDING',
    'ELIGIBLE',
    'PROCESSING',
    'PAID',
    'FAILED',
    'CANCELLED'
);

-- CreateEnum
CREATE TYPE "FinancialTransactionType" AS ENUM (
    'PAYMENT',
    'REFUND',
    'PAYOUT',
    'PLATFORM_FEE',
    'TAX'
);

-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM (
    'CREDIT',
    'DEBIT'
);

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM (
    'RECEIVED',
    'PROCESSING',
    'PROCESSED',
    'FAILED',
    'IGNORED'
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_payment_id" VARCHAR(32) NOT NULL,
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "consultation_offer_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "provider" VARCHAR(64) NOT NULL DEFAULT 'simulated',
    "provider_payment_id" VARCHAR(255),
    "idempotency_key" VARCHAR(128),
    "paid_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_attempt_id" VARCHAR(32) NOT NULL,
    "payment_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "provider" VARCHAR(64) NOT NULL,
    "provider_attempt_id" VARCHAR(255),
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'INITIATED',
    "failure_code" VARCHAR(64),
    "failure_reason" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" VARCHAR(64) NOT NULL,
    "provider_event_id" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(128) NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "payload" TEXT NOT NULL,
    "processing_status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_invoice_id" VARCHAR(32) NOT NULL,
    "invoice_number" VARCHAR(64) NOT NULL,
    "payment_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxes" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "platform_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_payout_id" VARCHAR(32) NOT NULL,
    "doctor_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "platform_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "tax_withheld" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "provider_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "DoctorPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(64),
    "provider_payout_id" VARCHAR(255),
    "idempotency_key" VARCHAR(128),
    "eligible_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "processed_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "doctor_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_transaction_id" VARCHAR(32) NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "direction" "TransactionDirection" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "payment_id" UUID,
    "payout_id" UUID,
    "refund_id" UUID,
    "reference" VARCHAR(255),
    "status" VARCHAR(32) NOT NULL DEFAULT 'POSTED',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_public_payment_id_key" ON "payments"("public_payment_id");
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");
CREATE INDEX "payments_appointment_id_idx" ON "payments"("appointment_id");
CREATE INDEX "payments_patient_id_idx" ON "payments"("patient_id");
CREATE INDEX "payments_doctor_id_idx" ON "payments"("doctor_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_provider_payment_id_idx" ON "payments"("provider_payment_id");
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_public_attempt_id_key" ON "payment_attempts"("public_attempt_id");
CREATE INDEX "payment_attempts_payment_id_idx" ON "payment_attempts"("payment_id");
CREATE INDEX "payment_attempts_status_idx" ON "payment_attempts"("status");
CREATE INDEX "payment_attempts_provider_attempt_id_idx" ON "payment_attempts"("provider_attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_provider_provider_event_id_key" ON "payment_webhook_events"("provider", "provider_event_id");
CREATE INDEX "payment_webhook_events_processing_status_idx" ON "payment_webhook_events"("processing_status");
CREATE INDEX "payment_webhook_events_received_at_idx" ON "payment_webhook_events"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_public_invoice_id_key" ON "invoices"("public_invoice_id");
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "invoices_patient_id_idx" ON "invoices"("patient_id");
CREATE INDEX "invoices_doctor_id_idx" ON "invoices"("doctor_id");
CREATE INDEX "invoices_payment_id_idx" ON "invoices"("payment_id");
CREATE INDEX "invoices_appointment_id_idx" ON "invoices"("appointment_id");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_payouts_public_payout_id_key" ON "doctor_payouts"("public_payout_id");
CREATE UNIQUE INDEX "doctor_payouts_idempotency_key_key" ON "doctor_payouts"("idempotency_key");
CREATE INDEX "doctor_payouts_doctor_id_idx" ON "doctor_payouts"("doctor_id");
CREATE INDEX "doctor_payouts_appointment_id_idx" ON "doctor_payouts"("appointment_id");
CREATE INDEX "doctor_payouts_payment_id_idx" ON "doctor_payouts"("payment_id");
CREATE INDEX "doctor_payouts_status_idx" ON "doctor_payouts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_public_transaction_id_key" ON "financial_transactions"("public_transaction_id");
CREATE INDEX "financial_transactions_payment_id_idx" ON "financial_transactions"("payment_id");
CREATE INDEX "financial_transactions_payout_id_idx" ON "financial_transactions"("payout_id");
CREATE INDEX "financial_transactions_refund_id_idx" ON "financial_transactions"("refund_id");
CREATE INDEX "financial_transactions_type_idx" ON "financial_transactions"("type");
CREATE INDEX "financial_transactions_occurred_at_idx" ON "financial_transactions"("occurred_at");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_payouts" ADD CONSTRAINT "doctor_payouts_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctor_payouts" ADD CONSTRAINT "doctor_payouts_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctor_payouts" ADD CONSTRAINT "doctor_payouts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "doctor_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
