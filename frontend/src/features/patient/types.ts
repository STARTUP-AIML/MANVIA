/**
 * MANVIA Patient Domain Types & DTOs
 * Mirrored directly from MANVIA Backend:
 * - PatientProfileResponseDto
 * - CreatePatientProfileDto
 * - UpdatePatientProfileDto
 * - EmergencyContactDto
 * - BiologicalSex enum
 */

export type BiologicalSex = "MALE" | "FEMALE" | "INTERSEX" | "OTHER";

export interface EmergencyContactDto {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface PatientProfileResponseDto {
  id: string;
  publicPatientId: string;
  legalFirstName: string | null;
  legalLastName: string | null;
  dateOfBirth: string | null; // ISO YYYY-MM-DD
  biologicalSex: BiologicalSex | null;
  bloodGroup: string | null;
  emergencyContact: EmergencyContactDto | null;
  preferredLanguage: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientProfileDto {
  legalFirstName?: string;
  legalLastName?: string;
  dateOfBirth?: string;
  biologicalSex?: BiologicalSex;
  bloodGroup?: string;
  emergencyContact?: EmergencyContactDto;
  preferredLanguage?: string;
  timezone?: string;
}

export interface UpdatePatientProfileDto {
  legalFirstName?: string;
  legalLastName?: string;
  dateOfBirth?: string;
  biologicalSex?: BiologicalSex;
  bloodGroup?: string;
  emergencyContact?: EmergencyContactDto;
  preferredLanguage?: string;
  timezone?: string;
}
