import type { WaitlistStatus } from '../enums/waitlist-status.enum.js';

export interface WaitlistEntryEntity {
  id: string;
  publicWaitlistId: string;
  patientId: string;
  doctorId: string;
  consultationOfferId: string | null;
  priority: number;
  status: WaitlistStatus;
  preferredStartDate: Date | null;
  preferredEndDate: Date | null;
  notes: string | null;
  joinedAt: Date;
  offeredAt: Date | null;
  offerExpiresAt: Date | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  offeredAppointmentId: string | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
}
