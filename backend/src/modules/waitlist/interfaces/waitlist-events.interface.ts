import type { WaitlistStatus } from '../enums/waitlist-status.enum.js';

export interface BaseWaitlistEvent {
  waitlistId: string;
  publicWaitlistId: string;
  patientId: string;
  doctorId: string;
  occurredAt: string;
}

export interface WaitlistJoinedEvent extends BaseWaitlistEvent {
  status: WaitlistStatus.ACTIVE;
  priority: number;
  consultationOfferId?: string | null;
}

export interface WaitlistOfferCreatedEvent extends BaseWaitlistEvent {
  status: WaitlistStatus.OFFERED;
  offeredAppointmentId: string;
  offerExpiresAt: string;
}

export interface WaitlistOfferAcceptedEvent extends BaseWaitlistEvent {
  status: WaitlistStatus.ACCEPTED;
  appointmentId: string;
  acceptedAt: string;
}

export interface WaitlistOfferDeclinedEvent extends BaseWaitlistEvent {
  status: WaitlistStatus.DECLINED;
  reason?: string;
  declinedAt: string;
}

export interface WaitlistOfferExpiredEvent extends BaseWaitlistEvent {
  status: WaitlistStatus.EXPIRED;
  expiredAt: string;
}

export interface WaitlistFulfilledEvent extends BaseWaitlistEvent {
  status: WaitlistStatus.FULFILLED;
  appointmentId: string;
  fulfilledAt: string;
}

export interface WaitlistCancelledEvent extends BaseWaitlistEvent {
  status: WaitlistStatus.CANCELLED;
  cancelledAt: string;
}
