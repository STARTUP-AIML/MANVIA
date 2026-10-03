import type { DoctorAvailabilityEntity } from '../entities/doctor-availability.entity.js';
import type { ConsultationOfferEntity } from '../entities/consultation-offer.entity.js';
import type { DayOfWeek } from '../enums/day-of-week.enum.js';
import type { ConsultationType } from '../enums/consultation-type.enum.js';
import type { OfferStatus } from '../enums/offer-status.enum.js';

export interface CreateAvailabilityData {
  timezone: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  effectiveFrom?: Date | null | undefined;
  effectiveUntil?: Date | null | undefined;
  isActive?: boolean | undefined;
}

export interface UpdateAvailabilityData {
  timezone?: string | undefined;
  dayOfWeek?: DayOfWeek | undefined;
  startTime?: string | undefined;
  endTime?: string | undefined;
  effectiveFrom?: Date | null | undefined;
  effectiveUntil?: Date | null | undefined;
  isActive?: boolean | undefined;
}

export interface CreateOfferData {
  title: string;
  description?: string | null | undefined;
  consultationType: ConsultationType;
  durationMinutes: number;
  fee: number;
  currency?: string | undefined;
  status?: OfferStatus | undefined;
}

export interface UpdateOfferData {
  title?: string | undefined;
  description?: string | null | undefined;
  consultationType?: ConsultationType | undefined;
  durationMinutes?: number | undefined;
  fee?: number | undefined;
  currency?: string | undefined;
  status?: OfferStatus | undefined;
}

export interface IDoctorAvailabilityRepository {
  findAvailabilityById(id: string): Promise<DoctorAvailabilityEntity | null>;
  findAvailabilitiesByDoctorId(
    doctorId: string,
    activeOnly?: boolean,
  ): Promise<DoctorAvailabilityEntity[]>;
  createAvailability(
    doctorId: string,
    data: CreateAvailabilityData,
  ): Promise<DoctorAvailabilityEntity>;
  updateAvailability(id: string, data: UpdateAvailabilityData): Promise<DoctorAvailabilityEntity>;
  deleteAvailability(id: string): Promise<boolean>;

  findOfferById(id: string): Promise<ConsultationOfferEntity | null>;
  findOffersByDoctorId(doctorId: string, activeOnly?: boolean): Promise<ConsultationOfferEntity[]>;
  createOffer(doctorId: string, data: CreateOfferData): Promise<ConsultationOfferEntity>;
  updateOffer(id: string, data: UpdateOfferData): Promise<ConsultationOfferEntity>;
  deleteOffer(id: string): Promise<boolean>;
}

export const DOCTOR_AVAILABILITY_REPOSITORY = Symbol('DOCTOR_AVAILABILITY_REPOSITORY');
