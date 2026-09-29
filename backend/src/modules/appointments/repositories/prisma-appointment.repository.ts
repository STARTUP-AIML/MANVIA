import { Injectable, Optional } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../common/errors/app-error.js';
import type { AppointmentEntity } from '../entities/appointment.entity.js';
import type { PreConsultationEntity } from '../entities/pre-consultation.entity.js';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';
import { SlotReservationState } from '../enums/slot-reservation-state.enum.js';
import { PreConsultationStatus } from '../enums/pre-consultation-status.enum.js';
import type {
  AppointmentQueryOptions,
  CreateAppointmentInput,
  CreatePreConsultationInput,
  IAppointmentRepository,
  UpdateAppointmentInput,
  UpdatePreConsultationInput,
} from '../interfaces/appointment-repository.interface.js';
import { generatePublicAppointmentId } from '../utils/public-appointment-id.util.js';

interface RawAppointment {
  id: string;
  publicAppointmentId: string;
  patientId: string;
  doctorId: string;
  consultationOfferId: string;
  startAt: string | Date;
  endAt: string | Date;
  status: AppointmentStatus;
  reservationState: SlotReservationState;
  reservedUntil: string | Date | null;
  cancellationReason: string | null;
  cancelledAt: string | Date | null;
  cancelledBy: string | null;
  declineReason: string | null;
  declinedAt: string | Date | null;
  confirmedAt: string | Date | null;
  startedAt: string | Date | null;
  completedAt: string | Date | null;
  noShowAt: string | Date | null;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface RawPreConsultation {
  id: string;
  appointmentId: string;
  patientId: string;
  status: PreConsultationStatus;
  reasonForVisit: string;
  symptoms: string | null;
  symptomOnset: string | null;
  currentMedications: string | null;
  allergies: string | null;
  patientNotes: string | null;
  submittedAt: string | Date | null;
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
  appointment: PrismaModelDelegate<RawAppointment>;
  preConsultation: PrismaModelDelegate<RawPreConsultation>;
}

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  private readonly prisma: PrismaClientLike | undefined;

  constructor(@Optional() prisma?: PrismaClientLike | undefined) {
    this.prisma = prisma;
  }

  private getClient(): PrismaClientLike {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient is not initialized in PrismaAppointmentRepository. Provide a valid Prisma client or use InMemoryAppointmentRepository.',
      );
    }
    return this.prisma;
  }

  private mapAppointmentToEntity(raw: RawAppointment): AppointmentEntity {
    return {
      id: raw.id,
      publicAppointmentId: raw.publicAppointmentId,
      patientId: raw.patientId,
      doctorId: raw.doctorId,
      consultationOfferId: raw.consultationOfferId,
      startAt: new Date(raw.startAt),
      endAt: new Date(raw.endAt),
      status: raw.status,
      reservationState: raw.reservationState,
      reservedUntil: raw.reservedUntil ? new Date(raw.reservedUntil) : null,
      cancellationReason: raw.cancellationReason,
      cancelledAt: raw.cancelledAt ? new Date(raw.cancelledAt) : null,
      cancelledBy: raw.cancelledBy,
      declineReason: raw.declineReason,
      declinedAt: raw.declinedAt ? new Date(raw.declinedAt) : null,
      confirmedAt: raw.confirmedAt ? new Date(raw.confirmedAt) : null,
      startedAt: raw.startedAt ? new Date(raw.startedAt) : null,
      completedAt: raw.completedAt ? new Date(raw.completedAt) : null,
      noShowAt: raw.noShowAt ? new Date(raw.noShowAt) : null,
      notes: raw.notes,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  private mapPreConsultationToEntity(raw: RawPreConsultation): PreConsultationEntity {
    return {
      id: raw.id,
      appointmentId: raw.appointmentId,
      patientId: raw.patientId,
      status: raw.status,
      reasonForVisit: raw.reasonForVisit,
      symptoms: raw.symptoms,
      symptomOnset: raw.symptomOnset,
      currentMedications: raw.currentMedications,
      allergies: raw.allergies,
      patientNotes: raw.patientNotes,
      submittedAt: raw.submittedAt ? new Date(raw.submittedAt) : null,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  public async createAppointment(input: CreateAppointmentInput): Promise<AppointmentEntity> {
    const client = this.getClient();
    const publicAppointmentId = input.publicAppointmentId ?? generatePublicAppointmentId();
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);

    try {
      const created = await client.appointment.create({
        data: {
          publicAppointmentId,
          patientId: input.patientId,
          doctorId: input.doctorId,
          consultationOfferId: input.consultationOfferId,
          startAt,
          endAt,
          status: input.status ?? AppointmentStatus.REQUESTED,
          reservationState: input.reservationState ?? SlotReservationState.BOOKED,
          reservedUntil: input.reservedUntil ? new Date(input.reservedUntil) : null,
          notes: input.notes ?? null,
        },
      });
      return this.mapAppointmentToEntity(created);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictError('The requested doctor time slot is already reserved or booked');
      }
      throw error;
    }
  }

  public async findAppointmentById(id: string): Promise<AppointmentEntity | null> {
    const client = this.getClient();
    const found = await client.appointment.findUnique({
      where: { id },
    });
    return found ? this.mapAppointmentToEntity(found) : null;
  }

  public async findAppointmentByPublicId(
    publicAppointmentId: string,
  ): Promise<AppointmentEntity | null> {
    const client = this.getClient();
    const found = await client.appointment.findUnique({
      where: { publicAppointmentId },
    });
    return found ? this.mapAppointmentToEntity(found) : null;
  }

  public async findPatientAppointment(
    patientId: string,
    idOrPublicId: string,
  ): Promise<AppointmentEntity | null> {
    const client = this.getClient();
    if (client.appointment.findFirst) {
      const found = await client.appointment.findFirst({
        where: {
          patientId,
          OR: [{ id: idOrPublicId }, { publicAppointmentId: idOrPublicId }],
        },
      });
      return found ? this.mapAppointmentToEntity(found) : null;
    }

    const byId = await this.findAppointmentById(idOrPublicId);
    if (byId && byId.patientId === patientId) return byId;
    const byPub = await this.findAppointmentByPublicId(idOrPublicId);
    if (byPub && byPub.patientId === patientId) return byPub;
    return null;
  }

  public async findDoctorAppointment(
    doctorId: string,
    idOrPublicId: string,
  ): Promise<AppointmentEntity | null> {
    const client = this.getClient();
    if (client.appointment.findFirst) {
      const found = await client.appointment.findFirst({
        where: {
          doctorId,
          OR: [{ id: idOrPublicId }, { publicAppointmentId: idOrPublicId }],
        },
      });
      return found ? this.mapAppointmentToEntity(found) : null;
    }

    const byId = await this.findAppointmentById(idOrPublicId);
    if (byId && byId.doctorId === doctorId) return byId;
    const byPub = await this.findAppointmentByPublicId(idOrPublicId);
    if (byPub && byPub.doctorId === doctorId) return byPub;
    return null;
  }

  public async findAppointments(
    options: AppointmentQueryOptions,
  ): Promise<{ data: AppointmentEntity[]; total: number }> {
    const client = this.getClient();
    const where: Record<string, unknown> = {};

    if (options.patientId) {
      where.patientId = options.patientId;
    }
    if (options.doctorId) {
      where.doctorId = options.doctorId;
    }
    if (options.status) {
      where.status = options.status;
    }
    if (options.statuses && options.statuses.length > 0) {
      where.status = { in: options.statuses };
    }
    if (options.upcomingOnly) {
      where.startAt = { gte: new Date() };
    }
    if (options.pastOnly) {
      where.endAt = { lt: new Date() };
    }
    if (options.startDate || options.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (options.startDate) dateFilter.gte = options.startDate;
      if (options.endDate) dateFilter.lte = options.endDate;
      where.startAt = dateFilter;
    }

    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;

    const [rawItems, total] = await Promise.all([
      client.appointment.findMany({
        where,
        orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      client.appointment.count ? client.appointment.count({ where }) : Promise.resolve(0),
    ]);

    return {
      data: rawItems.map((r) => this.mapAppointmentToEntity(r)),
      total,
    };
  }

  public async updateAppointment(
    id: string,
    input: UpdateAppointmentInput,
  ): Promise<AppointmentEntity> {
    const client = this.getClient();
    const existing = await this.findAppointmentById(id);
    if (!existing) {
      throw new NotFoundError(`Appointment with ID ${id} not found`);
    }

    const data: Record<string, unknown> = {};
    if (input.status !== undefined) data.status = input.status;
    if (input.reservationState !== undefined) data.reservationState = input.reservationState;
    if (input.reservedUntil !== undefined) data.reservedUntil = input.reservedUntil;
    if (input.cancellationReason !== undefined) data.cancellationReason = input.cancellationReason;
    if (input.cancelledAt !== undefined) data.cancelledAt = input.cancelledAt;
    if (input.cancelledBy !== undefined) data.cancelledBy = input.cancelledBy;
    if (input.declineReason !== undefined) data.declineReason = input.declineReason;
    if (input.declinedAt !== undefined) data.declinedAt = input.declinedAt;
    if (input.confirmedAt !== undefined) data.confirmedAt = input.confirmedAt;
    if (input.startedAt !== undefined) data.startedAt = input.startedAt;
    if (input.completedAt !== undefined) data.completedAt = input.completedAt;
    if (input.noShowAt !== undefined) data.noShowAt = input.noShowAt;
    if (input.notes !== undefined) data.notes = input.notes;

    const updated = await client.appointment.update({
      where: { id },
      data,
    });

    return this.mapAppointmentToEntity(updated);
  }

  public async findOverlappingActiveAppointment(
    doctorId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
  ): Promise<AppointmentEntity | null> {
    const client = this.getClient();
    const inactiveStatuses = [
      AppointmentStatus.CANCELLED,
      AppointmentStatus.DECLINED,
      AppointmentStatus.EXPIRED,
    ];

    if (client.appointment.findFirst) {
      const where: Record<string, unknown> = {
        doctorId,
        status: { notIn: inactiveStatuses },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      };
      if (excludeAppointmentId) {
        where.id = { not: excludeAppointmentId };
      }
      const found = await client.appointment.findFirst({ where });
      return found ? this.mapAppointmentToEntity(found) : null;
    }

    const candidates = await client.appointment.findMany({
      where: {
        doctorId,
        status: { notIn: inactiveStatuses },
      },
    });

    const targetStart = new Date(startAt).getTime();
    const targetEnd = new Date(endAt).getTime();

    for (const c of candidates) {
      if (excludeAppointmentId && c.id === excludeAppointmentId) continue;
      const cStart = new Date(c.startAt).getTime();
      const cEnd = new Date(c.endAt).getTime();
      if (cStart < targetEnd && cEnd > targetStart) {
        return this.mapAppointmentToEntity(c);
      }
    }

    return null;
  }

  public async createPreConsultation(
    input: CreatePreConsultationInput,
  ): Promise<PreConsultationEntity> {
    const client = this.getClient();
    const created = await client.preConsultation.create({
      data: {
        appointmentId: input.appointmentId,
        patientId: input.patientId,
        status: input.status ?? PreConsultationStatus.NOT_STARTED,
        reasonForVisit: input.reasonForVisit,
        symptoms: input.symptoms ?? null,
        symptomOnset: input.symptomOnset ?? null,
        currentMedications: input.currentMedications ?? null,
        allergies: input.allergies ?? null,
        patientNotes: input.patientNotes ?? null,
        submittedAt: input.submittedAt ? new Date(input.submittedAt) : null,
      },
    });

    return this.mapPreConsultationToEntity(created);
  }

  public async findPreConsultationByAppointmentId(
    appointmentId: string,
  ): Promise<PreConsultationEntity | null> {
    const client = this.getClient();
    const found = await client.preConsultation.findUnique({
      where: { appointmentId },
    });
    return found ? this.mapPreConsultationToEntity(found) : null;
  }

  public async updatePreConsultation(
    id: string,
    input: UpdatePreConsultationInput,
  ): Promise<PreConsultationEntity> {
    const client = this.getClient();
    const data: Record<string, unknown> = {};

    if (input.reasonForVisit !== undefined) data.reasonForVisit = input.reasonForVisit;
    if (input.symptoms !== undefined) data.symptoms = input.symptoms;
    if (input.symptomOnset !== undefined) data.symptomOnset = input.symptomOnset;
    if (input.currentMedications !== undefined) data.currentMedications = input.currentMedications;
    if (input.allergies !== undefined) data.allergies = input.allergies;
    if (input.patientNotes !== undefined) data.patientNotes = input.patientNotes;
    if (input.status !== undefined) data.status = input.status;
    if (input.submittedAt !== undefined) data.submittedAt = input.submittedAt;

    const updated = await client.preConsultation.update({
      where: { id },
      data,
    });

    return this.mapPreConsultationToEntity(updated);
  }
}
