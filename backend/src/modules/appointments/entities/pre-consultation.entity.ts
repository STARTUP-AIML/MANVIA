import type { PreConsultationStatus } from '../enums/pre-consultation-status.enum.js';

export interface PreConsultationEntity {
  id: string;
  appointmentId: string;
  patientId: string;
  status: PreConsultationStatus;
  reasonForVisit: string;
  symptoms: string | null;
  symptomOnset: string | null;
  currentMedications: string | null;
  allergies: string | null;
  patientNotes: string | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
