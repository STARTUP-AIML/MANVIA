// ==============================================================================
// MANVIA — Patient Domain Interfaces & Contracts
// ==============================================================================
// Phase 6: Patient Domain Foundation Contracts
// ==============================================================================

import type { BiologicalSex, PatientProfile as PrismaPatientProfile } from '@prisma/client';

export { BiologicalSex };
export type PatientProfile = PrismaPatientProfile;

export interface EmergencyContact {
  name?: string | null | undefined;
  phone?: string | null | undefined;
  relationship?: string | null | undefined;
}

export interface CreatePatientProfileData {
  userId: string;
  publicPatientId?: string | undefined;
  legalFirstName?: string | null | undefined;
  legalLastName?: string | null | undefined;
  dateOfBirth?: Date | null | undefined;
  biologicalSex?: BiologicalSex | null | undefined;
  bloodGroup?: string | null | undefined;
  emergencyContactName?: string | null | undefined;
  emergencyContactPhone?: string | null | undefined;
  emergencyContactRelationship?: string | null | undefined;
  preferredLanguage?: string | undefined;
  timezone?: string | undefined;
}

export interface UpdatePatientProfileData {
  legalFirstName?: string | null | undefined;
  legalLastName?: string | null | undefined;
  dateOfBirth?: Date | null | undefined;
  biologicalSex?: BiologicalSex | null | undefined;
  bloodGroup?: string | null | undefined;
  emergencyContactName?: string | null | undefined;
  emergencyContactPhone?: string | null | undefined;
  emergencyContactRelationship?: string | null | undefined;
  preferredLanguage?: string | undefined;
  timezone?: string | undefined;
}
