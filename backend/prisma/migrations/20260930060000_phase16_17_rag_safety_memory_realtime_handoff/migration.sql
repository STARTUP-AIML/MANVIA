-- CreateEnum
CREATE TYPE "AISafetyClassification" AS ENUM ('SAFE', 'MEDICAL_INFORMATION', 'POTENTIALLY_HARMFUL', 'URGENT_MEDICAL', 'CRISIS', 'SELF_HARM_OR_SUICIDE', 'EMERGENCY', 'UNSUPPORTED_CLINICAL_REQUEST');

-- CreateEnum
CREATE TYPE "AISafetyAction" AS ENUM ('ALLOWED', 'FLAGGED', 'DISCLOSURE_ATTACHED', 'REFUSAL', 'EMERGENCY_ESCALATION', 'CRISIS_REFERRAL');

-- CreateEnum
CREATE TYPE "AIMemoryCategory" AS ENUM ('PREFERENCE', 'COMMUNICATION_STYLE', 'WELLNESS_GOAL', 'PERSONALIZATION');

-- CreateEnum
CREATE TYPE "AIMemoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AIRealtimeState" AS ENUM ('IDLE', 'LISTENING', 'PROCESSING', 'SPEAKING', 'INTERRUPTED', 'MUTED', 'PAUSED', 'RECONNECTING', 'ERROR', 'HANDOFF_TO_HUMAN', 'ENDED');

-- CreateEnum
CREATE TYPE "AIHandoffStatus" AS ENUM ('REQUESTED', 'QUEUED', 'ASSIGNED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AIHandoffUrgency" AS ENUM ('ROUTINE', 'URGENT', 'CRISIS');

-- CreateTable: ai_medical_sources
CREATE TABLE "ai_medical_sources" (
    "id" UUID NOT NULL,
    "public_source_id" VARCHAR(16) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "organization" VARCHAR(255) NOT NULL,
    "source_type" VARCHAR(64) NOT NULL,
    "version" VARCHAR(64),
    "publication_date" TIMESTAMPTZ(6),
    "trust_status" VARCHAR(32) NOT NULL DEFAULT 'VERIFIED',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_medical_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_medical_documents
CREATE TABLE "ai_medical_documents" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "document_identifier" VARCHAR(128) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_medical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_medical_chunks
CREATE TABLE "ai_medical_chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "chunk_identifier" VARCHAR(128) NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relevance_score" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_medical_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_safety_events
CREATE TABLE "ai_safety_events" (
    "id" UUID NOT NULL,
    "public_event_id" VARCHAR(16) NOT NULL,
    "user_id" UUID NOT NULL,
    "conversation_id" UUID,
    "classification" "AISafetyClassification" NOT NULL,
    "action_taken" "AISafetyAction" NOT NULL,
    "confidence_score" DOUBLE PRECISION,
    "matched_rules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locale" VARCHAR(16) NOT NULL DEFAULT 'en-US',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_safety_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_memories
CREATE TABLE "ai_memories" (
    "id" UUID NOT NULL,
    "public_memory_id" VARCHAR(16) NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "AIMemoryCategory" NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "source" VARCHAR(64) NOT NULL DEFAULT 'USER_EXPLICIT',
    "status" "AIMemoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_user_approved" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_realtime_sessions
CREATE TABLE "ai_realtime_sessions" (
    "id" UUID NOT NULL,
    "public_session_id" VARCHAR(16) NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "model" VARCHAR(64) NOT NULL,
    "state" "AIRealtimeState" NOT NULL DEFAULT 'IDLE',
    "connection_info" JSONB,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "interruption_count" INTEGER NOT NULL DEFAULT 0,
    "reconnect_count" INTEGER NOT NULL DEFAULT 0,
    "total_latency_ms" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_realtime_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_human_handoffs
CREATE TABLE "ai_human_handoffs" (
    "id" UUID NOT NULL,
    "public_handoff_id" VARCHAR(16) NOT NULL,
    "user_id" UUID NOT NULL,
    "conversation_id" UUID,
    "assigned_doctor_id" UUID,
    "reason" VARCHAR(128) NOT NULL,
    "safety_level" VARCHAR(32) NOT NULL DEFAULT 'ROUTINE',
    "requested_urgency" "AIHandoffUrgency" NOT NULL DEFAULT 'ROUTINE',
    "status" "AIHandoffStatus" NOT NULL DEFAULT 'REQUESTED',
    "user_summary" TEXT,
    "consent_granted" BOOLEAN NOT NULL DEFAULT false,
    "accepted_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_human_handoffs_pkey" PRIMARY KEY ("id")
);

-- Indexes for ai_medical_sources
CREATE UNIQUE INDEX "ai_medical_sources_public_source_id_key" ON "ai_medical_sources"("public_source_id");
CREATE INDEX "ai_medical_sources_public_source_id_idx" ON "ai_medical_sources"("public_source_id");
CREATE INDEX "ai_medical_sources_is_active_idx" ON "ai_medical_sources"("is_active");

-- Indexes for ai_medical_documents
CREATE INDEX "ai_medical_documents_source_id_idx" ON "ai_medical_documents"("source_id");
CREATE UNIQUE INDEX "ai_medical_documents_source_id_document_identifier_key" ON "ai_medical_documents"("source_id", "document_identifier");

-- Indexes for ai_medical_chunks
CREATE INDEX "ai_medical_chunks_document_id_idx" ON "ai_medical_chunks"("document_id");

-- Indexes for ai_safety_events
CREATE UNIQUE INDEX "ai_safety_events_public_event_id_key" ON "ai_safety_events"("public_event_id");
CREATE INDEX "ai_safety_events_user_id_idx" ON "ai_safety_events"("user_id");
CREATE INDEX "ai_safety_events_conversation_id_idx" ON "ai_safety_events"("conversation_id");
CREATE INDEX "ai_safety_events_classification_idx" ON "ai_safety_events"("classification");
CREATE INDEX "ai_safety_events_created_at_idx" ON "ai_safety_events"("created_at");

-- Indexes for ai_memories
CREATE UNIQUE INDEX "ai_memories_public_memory_id_key" ON "ai_memories"("public_memory_id");
CREATE INDEX "ai_memories_user_id_idx" ON "ai_memories"("user_id");
CREATE INDEX "ai_memories_user_id_status_idx" ON "ai_memories"("user_id", "status");
CREATE UNIQUE INDEX "ai_memories_user_id_category_key_key" ON "ai_memories"("user_id", "category", "key");

-- Indexes for ai_realtime_sessions
CREATE UNIQUE INDEX "ai_realtime_sessions_public_session_id_key" ON "ai_realtime_sessions"("public_session_id");
CREATE INDEX "ai_realtime_sessions_user_id_idx" ON "ai_realtime_sessions"("user_id");
CREATE INDEX "ai_realtime_sessions_user_id_state_idx" ON "ai_realtime_sessions"("user_id", "state");
CREATE INDEX "ai_realtime_sessions_expires_at_idx" ON "ai_realtime_sessions"("expires_at");

-- Indexes for ai_human_handoffs
CREATE UNIQUE INDEX "ai_human_handoffs_public_handoff_id_key" ON "ai_human_handoffs"("public_handoff_id");
CREATE INDEX "ai_human_handoffs_user_id_idx" ON "ai_human_handoffs"("user_id");
CREATE INDEX "ai_human_handoffs_assigned_doctor_id_idx" ON "ai_human_handoffs"("assigned_doctor_id");
CREATE INDEX "ai_human_handoffs_status_idx" ON "ai_human_handoffs"("status");
CREATE INDEX "ai_human_handoffs_conversation_id_idx" ON "ai_human_handoffs"("conversation_id");

-- Foreign Keys
ALTER TABLE "ai_medical_documents" ADD CONSTRAINT "ai_medical_documents_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "ai_medical_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_medical_chunks" ADD CONSTRAINT "ai_medical_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "ai_medical_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_safety_events" ADD CONSTRAINT "ai_safety_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_safety_events" ADD CONSTRAINT "ai_safety_events_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_memories" ADD CONSTRAINT "ai_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_realtime_sessions" ADD CONSTRAINT "ai_realtime_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_human_handoffs" ADD CONSTRAINT "ai_human_handoffs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_human_handoffs" ADD CONSTRAINT "ai_human_handoffs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_human_handoffs" ADD CONSTRAINT "ai_human_handoffs_assigned_doctor_id_fkey" FOREIGN KEY ("assigned_doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
