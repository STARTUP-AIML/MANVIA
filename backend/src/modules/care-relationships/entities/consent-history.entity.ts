import type { ConsentAction } from '../enums/consent-action.enum.js';

export interface ConsentHistoryEntity {
  id: string;
  consentId: string;
  action: ConsentAction;
  actorId: string;
  actorRole: string;
  reason: string | null;
  metadata: string | null;
  createdAt: Date;
}
