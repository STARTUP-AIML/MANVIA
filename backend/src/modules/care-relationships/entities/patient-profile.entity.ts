export interface PatientProfileEntity {
  id: string;
  userId: string;
  publicPatientId: string;
  legalFirstName: string;
  legalLastName: string;
  displayName: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
}
