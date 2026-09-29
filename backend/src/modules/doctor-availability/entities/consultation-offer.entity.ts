import type { ConsultationType } from '../enums/consultation-type.enum.js';
import type { OfferStatus } from '../enums/offer-status.enum.js';

export interface ConsultationOfferEntity {
  id: string;
  doctorId: string;
  title: string;
  description: string | null;
  consultationType: ConsultationType;
  durationMinutes: number;
  fee: number;
  currency: string;
  status: OfferStatus;
  createdAt: Date;
  updatedAt: Date;
}
