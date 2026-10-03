import { Injectable, Optional } from '@nestjs/common';
import type { WaitlistEntryEntity } from '../entities/waitlist-entry.entity.js';
import { WaitlistStatus } from '../enums/waitlist-status.enum.js';
import type {
  CreateWaitlistEntryParams,
  FindWaitlistEntriesParams,
  IWaitlistRepository,
  UpdateWaitlistEntryParams,
} from '../interfaces/waitlist-repository.interface.js';

interface RawWaitlistEntry {
  id: string;
  publicWaitlistId: string;
  patientId: string;
  doctorId: string;
  consultationOfferId: string | null;
  priority: number;
  status: WaitlistStatus;
  preferredStartDate: string | Date | null;
  preferredEndDate: string | Date | null;
  notes: string | null;
  joinedAt: string | Date;
  offeredAt: string | Date | null;
  offerExpiresAt: string | Date | null;
  acceptedAt: string | Date | null;
  declinedAt: string | Date | null;
  fulfilledAt: string | Date | null;
  cancelledAt: string | Date | null;
  offeredAppointmentId: string | null;
  metadata: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PrismaModelDelegate<T = Record<string, unknown>> {
  create(args: { data: Record<string, unknown> }): Promise<T>;
  findUnique(args: { where: Record<string, unknown> }): Promise<T | null>;
  findFirst?(args: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    skip?: number;
    take?: number;
  }): Promise<T[]>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<T>;
  count?(args?: { where?: Record<string, unknown> }): Promise<number>;
}

interface PrismaClientLike {
  waitlistEntry: PrismaModelDelegate<RawWaitlistEntry>;
}

@Injectable()
export class PrismaWaitlistRepository implements IWaitlistRepository {
  private readonly prisma: PrismaClientLike | undefined;

  constructor(@Optional() prisma?: PrismaClientLike | undefined) {
    this.prisma = prisma;
  }

  private getClient(): PrismaClientLike {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient is not initialized in PrismaWaitlistRepository. Provide a valid Prisma client or use InMemoryWaitlistRepository.',
      );
    }
    return this.prisma;
  }

  private toEntity(raw: RawWaitlistEntry): WaitlistEntryEntity {
    return {
      id: raw.id,
      publicWaitlistId: raw.publicWaitlistId,
      patientId: raw.patientId,
      doctorId: raw.doctorId,
      consultationOfferId: raw.consultationOfferId,
      priority: raw.priority,
      status: raw.status,
      preferredStartDate: raw.preferredStartDate ? new Date(raw.preferredStartDate) : null,
      preferredEndDate: raw.preferredEndDate ? new Date(raw.preferredEndDate) : null,
      notes: raw.notes,
      joinedAt: new Date(raw.joinedAt),
      offeredAt: raw.offeredAt ? new Date(raw.offeredAt) : null,
      offerExpiresAt: raw.offerExpiresAt ? new Date(raw.offerExpiresAt) : null,
      acceptedAt: raw.acceptedAt ? new Date(raw.acceptedAt) : null,
      declinedAt: raw.declinedAt ? new Date(raw.declinedAt) : null,
      fulfilledAt: raw.fulfilledAt ? new Date(raw.fulfilledAt) : null,
      cancelledAt: raw.cancelledAt ? new Date(raw.cancelledAt) : null,
      offeredAppointmentId: raw.offeredAppointmentId,
      metadata: raw.metadata,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  public async createEntry(params: CreateWaitlistEntryParams): Promise<WaitlistEntryEntity> {
    const client = this.getClient();
    const raw = await client.waitlistEntry.create({
      data: {
        publicWaitlistId: params.publicWaitlistId,
        patientId: params.patientId,
        doctorId: params.doctorId,
        consultationOfferId: params.consultationOfferId ?? null,
        priority: params.priority ?? 0,
        status: params.status ?? WaitlistStatus.ACTIVE,
        preferredStartDate: params.preferredStartDate ?? null,
        preferredEndDate: params.preferredEndDate ?? null,
        notes: params.notes ?? null,
        metadata: params.metadata ?? null,
      },
    });
    return this.toEntity(raw);
  }

  public async findById(id: string): Promise<WaitlistEntryEntity | null> {
    const client = this.getClient();
    const raw = await client.waitlistEntry.findUnique({
      where: { id },
    });
    return raw ? this.toEntity(raw) : null;
  }

  public async findByPublicId(publicId: string): Promise<WaitlistEntryEntity | null> {
    const client = this.getClient();
    const raw = await client.waitlistEntry.findUnique({
      where: { publicWaitlistId: publicId },
    });
    return raw ? this.toEntity(raw) : null;
  }

  public async findActiveByPatientAndDoctor(
    patientId: string,
    doctorId: string,
    consultationOfferId?: string | null,
  ): Promise<WaitlistEntryEntity | null> {
    const client = this.getClient();
    const where: Record<string, unknown> = {
      patientId,
      doctorId,
      status: { in: [WaitlistStatus.ACTIVE, WaitlistStatus.OFFERED] },
    };
    if (consultationOfferId) {
      where.consultationOfferId = consultationOfferId;
    }

    if (client.waitlistEntry.findFirst) {
      const raw = await client.waitlistEntry.findFirst({ where });
      return raw ? this.toEntity(raw) : null;
    }

    const rawList = await client.waitlistEntry.findMany({ where, take: 1 });
    const first = rawList[0];
    return first ? this.toEntity(first) : null;
  }

  public async findEligibleEntriesForDoctor(
    doctorId: string,
    targetStartAt: Date,
    targetEndAt: Date,
  ): Promise<WaitlistEntryEntity[]> {
    const client = this.getClient();
    const rawList = await client.waitlistEntry.findMany({
      where: {
        doctorId,
        status: WaitlistStatus.ACTIVE,
      },
      orderBy: [{ priority: 'desc' }, { joinedAt: 'asc' }],
    });

    return rawList
      .map((r) => this.toEntity(r))
      .filter((item) => {
        if (item.preferredStartDate && targetStartAt < item.preferredStartDate) return false;
        if (item.preferredEndDate && targetEndAt > item.preferredEndDate) return false;
        return true;
      });
  }

  public async updateEntry(
    id: string,
    params: UpdateWaitlistEntryParams,
  ): Promise<WaitlistEntryEntity> {
    const client = this.getClient();
    const updateData: Record<string, unknown> = {};

    if (params.status !== undefined) updateData.status = params.status;
    if (params.priority !== undefined) updateData.priority = params.priority;
    if (params.offeredAt !== undefined) updateData.offeredAt = params.offeredAt;
    if (params.offerExpiresAt !== undefined) updateData.offerExpiresAt = params.offerExpiresAt;
    if (params.acceptedAt !== undefined) updateData.acceptedAt = params.acceptedAt;
    if (params.declinedAt !== undefined) updateData.declinedAt = params.declinedAt;
    if (params.fulfilledAt !== undefined) updateData.fulfilledAt = params.fulfilledAt;
    if (params.cancelledAt !== undefined) updateData.cancelledAt = params.cancelledAt;
    if (params.offeredAppointmentId !== undefined) {
      updateData.offeredAppointmentId = params.offeredAppointmentId;
    }
    if (params.metadata !== undefined) updateData.metadata = params.metadata;

    const raw = await client.waitlistEntry.update({
      where: { id },
      data: updateData,
    });
    return this.toEntity(raw);
  }

  public async findEntries(
    params: FindWaitlistEntriesParams,
  ): Promise<{ data: WaitlistEntryEntity[]; total: number }> {
    const client = this.getClient();
    const where: Record<string, unknown> = {};

    if (params.patientId) where.patientId = params.patientId;
    if (params.doctorId) where.doctorId = params.doctorId;
    if (params.status) where.status = params.status;

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const [rawList, count] = await Promise.all([
      client.waitlistEntry.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { joinedAt: 'asc' }],
        skip,
        take: limit,
      }),
      client.waitlistEntry.count ? client.waitlistEntry.count({ where }) : Promise.resolve(0),
    ]);

    return {
      data: rawList.map((r) => this.toEntity(r)),
      total: count,
    };
  }

  public async findExpiredOffers(now: Date): Promise<WaitlistEntryEntity[]> {
    const client = this.getClient();
    const rawList = await client.waitlistEntry.findMany({
      where: {
        status: WaitlistStatus.OFFERED,
        offerExpiresAt: { lte: now },
      },
    });
    return rawList.map((r) => this.toEntity(r));
  }

  public async getQueuePosition(patientId: string, doctorId: string): Promise<number> {
    const client = this.getClient();
    const rawList = await client.waitlistEntry.findMany({
      where: {
        doctorId,
        status: { in: [WaitlistStatus.ACTIVE, WaitlistStatus.OFFERED] },
      },
      orderBy: [{ priority: 'desc' }, { joinedAt: 'asc' }],
    });

    const index = rawList.findIndex((r) => r.patientId === patientId);
    return index >= 0 ? index + 1 : 0;
  }
}
