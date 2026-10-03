import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { WaitlistStatus } from '../enums/waitlist-status.enum.js';
import type { WaitlistEntryEntity } from '../entities/waitlist-entry.entity.js';
import type {
  CreateWaitlistEntryParams,
  FindWaitlistEntriesParams,
  IWaitlistRepository,
  UpdateWaitlistEntryParams,
} from '../interfaces/waitlist-repository.interface.js';

@Injectable()
export class InMemoryWaitlistRepository implements IWaitlistRepository {
  private readonly items = new Map<string, WaitlistEntryEntity>();

  public async createEntry(params: CreateWaitlistEntryParams): Promise<WaitlistEntryEntity> {
    const id = randomUUID();
    const now = new Date();
    const entity: WaitlistEntryEntity = {
      id,
      publicWaitlistId: params.publicWaitlistId,
      patientId: params.patientId,
      doctorId: params.doctorId,
      consultationOfferId: params.consultationOfferId ?? null,
      priority: params.priority ?? 0,
      status: params.status ?? WaitlistStatus.ACTIVE,
      preferredStartDate: params.preferredStartDate ?? null,
      preferredEndDate: params.preferredEndDate ?? null,
      notes: params.notes ?? null,
      joinedAt: now,
      offeredAt: null,
      offerExpiresAt: null,
      acceptedAt: null,
      declinedAt: null,
      fulfilledAt: null,
      cancelledAt: null,
      offeredAppointmentId: null,
      metadata: params.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(id, entity);
    return { ...entity };
  }

  public async findById(id: string): Promise<WaitlistEntryEntity | null> {
    const entry = this.items.get(id);
    return entry ? { ...entry } : null;
  }

  public async findByPublicId(publicId: string): Promise<WaitlistEntryEntity | null> {
    for (const item of this.items.values()) {
      if (item.publicWaitlistId === publicId) {
        return { ...item };
      }
    }
    return null;
  }

  public async findActiveByPatientAndDoctor(
    patientId: string,
    doctorId: string,
    consultationOfferId?: string | null,
  ): Promise<WaitlistEntryEntity | null> {
    for (const item of this.items.values()) {
      const isActive =
        item.status === WaitlistStatus.ACTIVE || item.status === WaitlistStatus.OFFERED;
      if (isActive && item.patientId === patientId && item.doctorId === doctorId) {
        if (!consultationOfferId || item.consultationOfferId === consultationOfferId) {
          return { ...item };
        }
      }
    }
    return null;
  }

  public async findEligibleEntriesForDoctor(
    doctorId: string,
    targetStartAt: Date,
    targetEndAt: Date,
  ): Promise<WaitlistEntryEntity[]> {
    const matched: WaitlistEntryEntity[] = [];

    for (const item of this.items.values()) {
      if (item.doctorId !== doctorId || item.status !== WaitlistStatus.ACTIVE) {
        continue;
      }

      // Check date preferences if specified
      if (item.preferredStartDate && targetStartAt < item.preferredStartDate) {
        continue;
      }
      if (item.preferredEndDate && targetEndAt > item.preferredEndDate) {
        continue;
      }

      matched.push({ ...item });
    }

    // Deterministic ordering: Priority DESC, then joinedAt ASC
    matched.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

    return matched;
  }

  public async updateEntry(
    id: string,
    params: UpdateWaitlistEntryParams,
  ): Promise<WaitlistEntryEntity> {
    const existing = this.items.get(id);
    if (!existing) {
      throw new Error(`Waitlist entry with id ${id} not found`);
    }

    const updated: WaitlistEntryEntity = {
      ...existing,
      status: params.status !== undefined ? params.status : existing.status,
      priority: params.priority !== undefined ? params.priority : existing.priority,
      offeredAt: params.offeredAt !== undefined ? params.offeredAt : existing.offeredAt,
      offerExpiresAt:
        params.offerExpiresAt !== undefined ? params.offerExpiresAt : existing.offerExpiresAt,
      acceptedAt: params.acceptedAt !== undefined ? params.acceptedAt : existing.acceptedAt,
      declinedAt: params.declinedAt !== undefined ? params.declinedAt : existing.declinedAt,
      fulfilledAt: params.fulfilledAt !== undefined ? params.fulfilledAt : existing.fulfilledAt,
      cancelledAt: params.cancelledAt !== undefined ? params.cancelledAt : existing.cancelledAt,
      offeredAppointmentId:
        params.offeredAppointmentId !== undefined
          ? params.offeredAppointmentId
          : existing.offeredAppointmentId,
      metadata: params.metadata !== undefined ? params.metadata : existing.metadata,
      updatedAt: new Date(),
    };

    this.items.set(id, updated);
    return { ...updated };
  }

  public async findEntries(
    params: FindWaitlistEntriesParams,
  ): Promise<{ data: WaitlistEntryEntity[]; total: number }> {
    let list = Array.from(this.items.values());

    if (params.patientId) {
      list = list.filter((e) => e.patientId === params.patientId);
    }
    if (params.doctorId) {
      list = list.filter((e) => e.doctorId === params.doctorId);
    }
    if (params.status) {
      list = list.filter((e) => e.status === params.status);
    }

    // Deterministic ordering: Priority DESC, then joinedAt ASC
    list.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

    const total = list.length;
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const data = list.slice(skip, skip + limit).map((e) => ({ ...e }));

    return { data, total };
  }

  public async findExpiredOffers(now: Date): Promise<WaitlistEntryEntity[]> {
    const expired: WaitlistEntryEntity[] = [];
    for (const item of this.items.values()) {
      if (
        item.status === WaitlistStatus.OFFERED &&
        item.offerExpiresAt &&
        item.offerExpiresAt.getTime() <= now.getTime()
      ) {
        expired.push({ ...item });
      }
    }
    return expired;
  }

  public async getQueuePosition(patientId: string, doctorId: string): Promise<number> {
    const active = Array.from(this.items.values())
      .filter(
        (e) =>
          e.doctorId === doctorId &&
          (e.status === WaitlistStatus.ACTIVE || e.status === WaitlistStatus.OFFERED),
      )
      .sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      });

    const index = active.findIndex((e) => e.patientId === patientId);
    return index >= 0 ? index + 1 : 0;
  }

  public clear(): void {
    this.items.clear();
  }
}
