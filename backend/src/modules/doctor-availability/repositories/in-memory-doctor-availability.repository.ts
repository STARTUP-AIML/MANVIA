import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { NotFoundError } from '../../../common/errors/app-error.js';
import type { DoctorAvailabilityEntity } from '../entities/doctor-availability.entity.js';
import type { ConsultationOfferEntity } from '../entities/consultation-offer.entity.js';
import { OfferStatus } from '../enums/offer-status.enum.js';
import type {
  CreateAvailabilityData,
  CreateOfferData,
  IDoctorAvailabilityRepository,
  UpdateAvailabilityData,
  UpdateOfferData,
} from '../interfaces/availability-repository.interface.js';

@Injectable()
export class InMemoryDoctorAvailabilityRepository implements IDoctorAvailabilityRepository {
  private readonly availabilities = new Map<string, DoctorAvailabilityEntity>();
  private readonly offers = new Map<string, ConsultationOfferEntity>();

  // --------------------------------------------------------------------------
  // Availability Methods
  // --------------------------------------------------------------------------

  public async findAvailabilityById(id: string): Promise<DoctorAvailabilityEntity | null> {
    const raw = this.availabilities.get(id);
    return raw ? { ...raw } : null;
  }

  public async findAvailabilitiesByDoctorId(
    doctorId: string,
    activeOnly = false,
  ): Promise<DoctorAvailabilityEntity[]> {
    const list: DoctorAvailabilityEntity[] = [];
    for (const a of this.availabilities.values()) {
      if (a.doctorId === doctorId) {
        if (!activeOnly || a.isActive) {
          list.push({ ...a });
        }
      }
    }

    // Sort by dayOfWeek and startTime
    const dayOrder = {
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
      SUNDAY: 7,
    };

    return list.sort((a, b) => {
      const dayDiff = dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  public async createAvailability(
    doctorId: string,
    data: CreateAvailabilityData,
  ): Promise<DoctorAvailabilityEntity> {
    const id = crypto.randomUUID();
    const now = new Date();

    const entity: DoctorAvailabilityEntity = {
      id,
      doctorId,
      timezone: data.timezone,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      effectiveFrom: data.effectiveFrom ?? null,
      effectiveUntil: data.effectiveUntil ?? null,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.availabilities.set(id, entity);
    return { ...entity };
  }

  public async updateAvailability(
    id: string,
    data: UpdateAvailabilityData,
  ): Promise<DoctorAvailabilityEntity> {
    const existing = this.availabilities.get(id);
    if (!existing) {
      throw new NotFoundError(`Availability rule with ID '${id}' not found`);
    }

    const updated: DoctorAvailabilityEntity = {
      ...existing,
      timezone: data.timezone ?? existing.timezone,
      dayOfWeek: data.dayOfWeek ?? existing.dayOfWeek,
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
      effectiveFrom: data.effectiveFrom !== undefined ? data.effectiveFrom : existing.effectiveFrom,
      effectiveUntil:
        data.effectiveUntil !== undefined ? data.effectiveUntil : existing.effectiveUntil,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      updatedAt: new Date(),
    };

    this.availabilities.set(id, updated);
    return { ...updated };
  }

  public async deleteAvailability(id: string): Promise<boolean> {
    return this.availabilities.delete(id);
  }

  // --------------------------------------------------------------------------
  // Consultation Offer Methods
  // --------------------------------------------------------------------------

  public async findOfferById(id: string): Promise<ConsultationOfferEntity | null> {
    const raw = this.offers.get(id);
    return raw ? { ...raw } : null;
  }

  public async findOffersByDoctorId(
    doctorId: string,
    activeOnly = false,
  ): Promise<ConsultationOfferEntity[]> {
    const list: ConsultationOfferEntity[] = [];
    for (const o of this.offers.values()) {
      if (o.doctorId === doctorId) {
        if (!activeOnly || o.status === OfferStatus.ACTIVE) {
          list.push({ ...o });
        }
      }
    }

    return list.sort((a, b) => a.durationMinutes - b.durationMinutes);
  }

  public async createOffer(
    doctorId: string,
    data: CreateOfferData,
  ): Promise<ConsultationOfferEntity> {
    const id = crypto.randomUUID();
    const now = new Date();

    const entity: ConsultationOfferEntity = {
      id,
      doctorId,
      title: data.title,
      description: data.description ?? null,
      consultationType: data.consultationType,
      durationMinutes: data.durationMinutes,
      fee: data.fee,
      currency: data.currency ?? 'USD',
      status: data.status ?? OfferStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };

    this.offers.set(id, entity);
    return { ...entity };
  }

  public async updateOffer(id: string, data: UpdateOfferData): Promise<ConsultationOfferEntity> {
    const existing = this.offers.get(id);
    if (!existing) {
      throw new NotFoundError(`Consultation offer with ID '${id}' not found`);
    }

    const updated: ConsultationOfferEntity = {
      ...existing,
      title: data.title ?? existing.title,
      description: data.description !== undefined ? data.description : existing.description,
      consultationType: data.consultationType ?? existing.consultationType,
      durationMinutes: data.durationMinutes ?? existing.durationMinutes,
      fee: data.fee ?? existing.fee,
      currency: data.currency ?? existing.currency,
      status: data.status ?? existing.status,
      updatedAt: new Date(),
    };

    this.offers.set(id, updated);
    return { ...updated };
  }

  public async deleteOffer(id: string): Promise<boolean> {
    return this.offers.delete(id);
  }
}
