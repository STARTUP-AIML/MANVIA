import type { WaitlistEntryEntity } from '../entities/waitlist-entry.entity.js';
import type { WaitlistStatus } from '../enums/waitlist-status.enum.js';

export interface CreateWaitlistEntryParams {
  publicWaitlistId: string;
  patientId: string;
  doctorId: string;
  consultationOfferId?: string | null;
  priority?: number;
  status?: WaitlistStatus;
  preferredStartDate?: Date | null;
  preferredEndDate?: Date | null;
  notes?: string | null;
  metadata?: string | null;
}

export interface UpdateWaitlistEntryParams {
  status?: WaitlistStatus;
  priority?: number;
  offeredAt?: Date | null;
  offerExpiresAt?: Date | null;
  acceptedAt?: Date | null;
  declinedAt?: Date | null;
  fulfilledAt?: Date | null;
  cancelledAt?: Date | null;
  offeredAppointmentId?: string | null;
  metadata?: string | null;
}

export interface FindWaitlistEntriesParams {
  patientId?: string | undefined;
  doctorId?: string | undefined;
  status?: WaitlistStatus | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface IWaitlistRepository {
  createEntry(params: CreateWaitlistEntryParams): Promise<WaitlistEntryEntity>;
  findById(id: string): Promise<WaitlistEntryEntity | null>;
  findByPublicId(publicId: string): Promise<WaitlistEntryEntity | null>;
  findActiveByPatientAndDoctor(
    patientId: string,
    doctorId: string,
    consultationOfferId?: string | null,
  ): Promise<WaitlistEntryEntity | null>;
  findEligibleEntriesForDoctor(
    doctorId: string,
    targetStartAt: Date,
    targetEndAt: Date,
  ): Promise<WaitlistEntryEntity[]>;
  updateEntry(id: string, params: UpdateWaitlistEntryParams): Promise<WaitlistEntryEntity>;
  findEntries(
    params: FindWaitlistEntriesParams,
  ): Promise<{ data: WaitlistEntryEntity[]; total: number }>;
  findExpiredOffers(now: Date): Promise<WaitlistEntryEntity[]>;
  getQueuePosition(patientId: string, doctorId: string): Promise<number>;
}

export const WAITLIST_REPOSITORY = Symbol('WAITLIST_REPOSITORY');
