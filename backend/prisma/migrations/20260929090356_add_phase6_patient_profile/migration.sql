-- CreateEnum
CREATE TYPE "BiologicalSex" AS ENUM ('MALE', 'FEMALE', 'INTERSEX', 'OTHER');

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "public_patient_id" VARCHAR(32) NOT NULL,
    "legal_first_name" VARCHAR(100),
    "legal_last_name" VARCHAR(100),
    "date_of_birth" DATE,
    "biological_sex" "BiologicalSex",
    "blood_group" VARCHAR(10),
    "emergency_contact_name" VARCHAR(150),
    "emergency_contact_phone" VARCHAR(32),
    "emergency_contact_relationship" VARCHAR(50),
    "preferred_language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_public_patient_id_key" ON "patient_profiles"("public_patient_id");

-- CreateIndex
CREATE INDEX "patient_profiles_public_patient_id_idx" ON "patient_profiles"("public_patient_id");

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
