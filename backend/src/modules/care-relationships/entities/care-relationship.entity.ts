import type { CareRelationshipStatus } from '../enums/care-relationship-status.enum.js';

export interface CareRelationshipEntity {
  id: string;
  patientId: string;
  doctorId: string;
  status: CareRelationshipStatus;
  establishedAt: Date | null;
  terminatedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
