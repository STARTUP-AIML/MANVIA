import { Injectable, Optional } from '@nestjs/common';
import { NotFoundError } from '../../../common/errors/app-error.js';
import type { DoctorAvailabilityEntity } from '../entities/doctor-availability.entity.js';
import type { ConsultationOfferEntity } from '../entities/consultation-offer.entity.js';
import type { DayOfWeek } from '../enums/day-of-week.enum.js';
import type { ConsultationType } from '../enums/consultation-type.enum.js';
import { OfferStatus } from '../enums/offer-status.enum.js';
import type {
  CreateAvailabilityData,
  CreateOfferData,
  IDoctorAvailabilityRepository,
  UpdateAvailabilityData,
  UpdateOfferData,
} from '../interfaces/availability-repository.interface.js';

interface RawDoctorAvailability {
  id: string;
  doctorId: string;
  timezone: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  effectiveFrom: string | Date | null;
  effectiveUntil: string | Date | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface RawConsultationOffer {
  id: string;
  doctorId: string;
  title: string;
  description: string | null;
  consultationType: string;
  durationMinutes: number;
  fee: string | number;
  currency: string;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PrismaModelDelegate<T = Record<string, unknown>> {
  create(args: { data: Record<string, unknown> }): Promise<T>;
  findUnique(args: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
  }): Promise<T[]>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<T>;
  delete(args: { where: Record<string, unknown> }): Promise<T>;
}

interface PrismaClientLike {
  doctorAvailability: PrismaModelDelegate<RawDoctorAvailability>;
  consultationOffer: PrismaModelDelegate<RawConsultationOffer>;
}

@Injectable()
export class PrismaDoctorAvailabilityRepository implements IDoctorAvailabilityRepository {
  private readonly prisma: PrismaClientLike;

  constructor(@Optional() prismaClient?: PrismaClientLike) {
    this.prisma = prismaClient ?? (null as unknown as PrismaClientLike);
  }

  // --------------------------------------------------------------------------
  // Availability Methods
  // --------------------------------------------------------------------------

  public async findAvailabilityById(id: string): Promise<DoctorAvailabilityEntity | null> {
    this.ensurePrismaClient();

    const record = await this.prisma.doctorAvailability.findUnique({
      where: { id },
    });

    return record ? this.mapAvailabilityToEntity(record) : null;
  }

  public async findAvailabilitiesByDoctorId(
    doctorId: string,
    activeOnly = false,
  ): Promise<DoctorAvailabilityEntity[]> {
    this.ensurePrismaClient();

    const where: Record<string, unknown> = { doctorId };
    if (activeOnly) {
      where['isActive'] = true;
    }

    const records = await this.prisma.doctorAvailability.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return records.map((r) => this.mapAvailabilityToEntity(r));
  }

  public async createAvailability(
    doctorId: string,
    data: CreateAvailabilityData,
  ): Promise<DoctorAvailabilityEntity> {
    this.ensurePrismaClient();

    const created = await this.prisma.doctorAvailability.create({
      data: {
        doctorId,
        timezone: data.timezone,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        effectiveFrom: data.effectiveFrom ?? null,
        effectiveUntil: data.effectiveUntil ?? null,
        isActive: data.isActive ?? true,
      },
    });

    return this.mapAvailabilityToEntity(created);
  }

  public async updateAvailability(
    id: string,
    data: UpdateAvailabilityData,
  ): Promise<DoctorAvailabilityEntity> {
    this.ensurePrismaClient();

    const existing = await this.prisma.doctorAvailability.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Availability rule with ID '${id}' not found`);
    }

    const updated = await this.prisma.doctorAvailability.update({
      where: { id },
      data: {
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        ...(data.dayOfWeek !== undefined ? { dayOfWeek: data.dayOfWeek } : {}),
        ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
        ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
        ...(data.effectiveFrom !== undefined ? { effectiveFrom: data.effectiveFrom } : {}),
        ...(data.effectiveUntil !== undefined ? { effectiveUntil: data.effectiveUntil } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    return this.mapAvailabilityToEntity(updated);
  }

  public async deleteAvailability(id: string): Promise<boolean> {
    this.ensurePrismaClient();

    try {
      await this.prisma.doctorAvailability.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Consultation Offer Methods
  // --------------------------------------------------------------------------

  public async findOfferById(id: string): Promise<ConsultationOfferEntity | null> {
    this.ensurePrismaClient();

    const record = await this.prisma.consultationOffer.findUnique({
      where: { id },
    });

    return record ? this.mapOfferToEntity(record) : null;
  }

  public async findOffersByDoctorId(
    doctorId: string,
    activeOnly = false,
  ): Promise<ConsultationOfferEntity[]> {
    this.ensurePrismaClient();

    const where: Record<string, unknown> = { doctorId };
    if (activeOnly) {
      where['status'] = OfferStatus.ACTIVE;
    }

    const records = await this.prisma.consultationOffer.findMany({
      where,
      orderBy: { durationMinutes: 'asc' },
    });

    return records.map((r) => this.mapOfferToEntity(r));
  }

  public async createOffer(
    doctorId: string,
    data: CreateOfferData,
  ): Promise<ConsultationOfferEntity> {
    this.ensurePrismaClient();

    const created = await this.prisma.consultationOffer.create({
      data: {
        doctorId,
        title: data.title,
        description: data.description ?? null,
        consultationType: data.consultationType,
        durationMinutes: data.durationMinutes,
        fee: data.fee,
        currency: data.currency ?? 'USD',
        status: data.status ?? OfferStatus.ACTIVE,
      },
    });

    return this.mapOfferToEntity(created);
  }

  public async updateOffer(id: string, data: UpdateOfferData): Promise<ConsultationOfferEntity> {
    this.ensurePrismaClient();

    const existing = await this.prisma.consultationOffer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Consultation offer with ID '${id}' not found`);
    }

    const updated = await this.prisma.consultationOffer.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.consultationType !== undefined ? { consultationType: data.consultationType } : {}),
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
        ...(data.fee !== undefined ? { fee: data.fee } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    return this.mapOfferToEntity(updated);
  }

  public async deleteOffer(id: string): Promise<boolean> {
    this.ensurePrismaClient();

    try {
      await this.prisma.consultationOffer.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Entity Mappings
  // --------------------------------------------------------------------------

  private mapAvailabilityToEntity(raw: RawDoctorAvailability): DoctorAvailabilityEntity {
    return {
      id: raw.id,
      doctorId: raw.doctorId,
      timezone: raw.timezone,
      dayOfWeek: raw.dayOfWeek as DayOfWeek,
      startTime: raw.startTime,
      endTime: raw.endTime,
      effectiveFrom: raw.effectiveFrom ? new Date(raw.effectiveFrom) : null,
      effectiveUntil: raw.effectiveUntil ? new Date(raw.effectiveUntil) : null,
      isActive: raw.isActive,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  private mapOfferToEntity(raw: RawConsultationOffer): ConsultationOfferEntity {
    return {
      id: raw.id,
      doctorId: raw.doctorId,
      title: raw.title,
      description: raw.description,
      consultationType: raw.consultationType as ConsultationType,
      durationMinutes: raw.durationMinutes,
      fee: typeof raw.fee === 'string' ? parseFloat(raw.fee) : raw.fee,
      currency: raw.currency,
      status: raw.status as OfferStatus,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  private ensurePrismaClient(): void {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient is not initialized. Inject a valid PrismaClient instance in production environments.',
      );
    }
  }
}
