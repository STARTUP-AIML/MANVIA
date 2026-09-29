import type { ConsentScope } from '../enums/consent-scope.enum.js';
import type { ConsentStatus } from '../enums/consent-status.enum.js';

export interface ConsentEntity {
  id: string;
  patientId: string;
  doctorId: string;
  careRelationshipId: string | null;
  scope: ConsentScope;
  status: ConsentStatus;
  purpose: string | null;
  grantedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  revocationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
