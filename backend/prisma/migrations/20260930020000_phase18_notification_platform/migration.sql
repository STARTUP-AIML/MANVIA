-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
    'APPOINTMENT_REQUESTED',
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_DECLINED',
    'APPOINTMENT_CANCELLED',
    'APPOINTMENT_REMINDER',
    'WAITLIST_OFFER',
    'WAITLIST_EXPIRED',
    'WAITLIST_FULFILLED',
    'REFUND_REQUESTED',
    'REFUND_PROCESSING',
    'REFUND_COMPLETED',
    'REFUND_FAILED',
    'DOCTOR_VERIFICATION_SUBMITTED',
    'DOCTOR_VERIFICATION_APPROVED',
    'DOCTOR_VERIFICATION_REJECTED',
    'SECURITY_LOGIN',
    'SECURITY_PASSWORD_CHANGED',
    'SECURITY_SESSION_REVOKED',
    'WELLNESS_REMINDER',
    'FOLLOW_UP_REMINDER',
    'SYSTEM_NOTIFICATION'
);

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM (
    'IN_APP',
    'PUSH',
    'EMAIL',
    'SMS'
);

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM (
    'INFO',
    'SUCCESS',
    'WARNING',
    'CRITICAL'
);

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM (
    'PENDING',
    'QUEUED',
    'PROCESSING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'CANCELLED'
);

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM (
    'ANDROID',
    'IOS',
    'WEB'
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_notification_id" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "metadata" TEXT,
    "idempotency_key" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(64),
    "provider_message_id" VARCHAR(255),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "failure_code" VARCHAR(64),
    "failure_reason" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "appointment_notifications" BOOLEAN NOT NULL DEFAULT true,
    "wellness_notifications" BOOLEAN NOT NULL DEFAULT true,
    "marketing_notifications" BOOLEAN NOT NULL DEFAULT false,
    "system_notifications" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "push_token" TEXT NOT NULL,
    "device_id" VARCHAR(128),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "title_template" VARCHAR(255) NOT NULL,
    "body_template" TEXT NOT NULL,
    "version" VARCHAR(32) NOT NULL DEFAULT 'v1',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_public_notification_id_key" ON "notifications"("public_notification_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "notifications"("idempotency_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notification_deliveries_notification_id_idx" ON "notification_deliveries"("notification_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_channel_status_idx" ON "notification_deliveries"("channel", "status");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_created_at_idx" ON "notification_deliveries"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_devices_user_id_push_token_key" ON "notification_devices"("user_id", "push_token");

-- CreateIndex
CREATE INDEX "notification_devices_user_id_active_idx" ON "notification_devices"("user_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_notification_type_channel_locale_version_key" ON "notification_templates"("notification_type", "channel", "locale", "version");

-- CreateIndex
CREATE INDEX "notification_templates_notification_type_channel_locale_active_idx" ON "notification_templates"("notification_type", "channel", "locale", "active");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_devices" ADD CONSTRAINT "notification_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
