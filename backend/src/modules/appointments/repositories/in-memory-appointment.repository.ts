import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '../../../common/errors/app-error.js';
import type { AppointmentEntity } from '../entities/appointment.entity.js';
import type { PreConsultationEntity } from '../entities/pre-consultation.entity.js';
import type { AppointmentCancellationEntity } from '../entities/appointment-cancellation.entity.js';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';
import { SlotReservationState } from '../enums/slot-reservation-state.enum.js';
import { PreConsultationStatus } from '../enums/pre-consultation-status.enum.js';
import type {
  AppointmentQueryOptions,
  CreateAppointmentInput,
  CreateCancellationInput,
  CreatePreConsultationInput,
  IAppointmentRepository,
  UpdateAppointmentInput,
  UpdatePreConsultationInput,
} from '../interfaces/appointment-repository.interface.js';
import { generatePublicAppointmentId } from '../utils/public-appointment-id.util.js';

@Injectable()
export class InMemoryAppointmentRepository implements IAppointmentRepository {
  private appointments: Map<string, AppointmentEntity> = new Map();
  private preConsultations: Map<string, PreConsultationEntity> = new Map();
  private cancellations: Map<string, AppointmentCancellationEntity> = new Map();

  public async createAppointment(input: CreateAppointmentInput): Promise<AppointmentEntity> {
    const inactiveStatuses = [
      AppointmentStatus.CANCELLED,
      AppointmentStatus.DECLINED,
      AppointmentStatus.EXPIRED,
    ];

    const targetStart = new Date(input.startAt).getTime();
    const targetEnd = new Date(input.endAt).getTime();

    // Synchronous atomic check simulating PostgreSQL unique constraint / exclusion lock
    for (const appt of this.appointments.values()) {
      if (appt.doctorId !== input.doctorId) continue;
      if (inactiveStatuses.includes(appt.status)) continue;

      const apptStart = appt.startAt.getTime();
      const apptEnd = appt.endAt.getTime();

      if (apptStart < targetEnd && apptEnd > targetStart) {
        throw new ConflictError('The requested doctor time slot is already reserved or booked');
      }
    }

    const id = randomUUID();
    const publicAppointmentId = input.publicAppointmentId ?? generatePublicAppointmentId();
    const now = new Date();

    const appointment: AppointmentEntity = {
      id,
      publicAppointmentId,
      patientId: input.patientId,
      doctorId: input.doctorId,
      consultationOfferId: input.consultationOfferId,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      status: input.status ?? AppointmentStatus.REQUESTED,
      reservationState: input.reservationState ?? SlotReservationState.BOOKED,
      reservedUntil: input.reservedUntil ? new Date(input.reservedUntil) : null,
      cancellationReason: null,
      cancelledAt: null,
      cancelledBy: null,
      declineReason: null,
      declinedAt: null,
      confirmedAt: null,
      startedAt: null,
      completedAt: null,
      noShowAt: null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.appointments.set(id, appointment);
    return { ...appointment };
  }

  public async findAppointmentById(id: string): Promise<AppointmentEntity | null> {
    const found = this.appointments.get(id);
    return found ? { ...found } : null;
  }

  public async findAppointmentByPublicId(
    publicAppointmentId: string,
  ): Promise<AppointmentEntity | null> {
    for (const appt of this.appointments.values()) {
      if (appt.publicAppointmentId === publicAppointmentId) {
        return { ...appt };
      }
    }
    return null;
  }

  public async findPatientAppointment(
    patientId: string,
    idOrPublicId: string,
  ): Promise<AppointmentEntity | null> {
    for (const appt of this.appointments.values()) {
      if (
        appt.patientId === patientId &&
        (appt.id === idOrPublicId || appt.publicAppointmentId === idOrPublicId)
      ) {
        return { ...appt };
      }
    }
    return null;
  }

  public async findDoctorAppointment(
    doctorId: string,
    idOrPublicId: string,
  ): Promise<AppointmentEntity | null> {
    for (const appt of this.appointments.values()) {
      if (
        appt.doctorId === doctorId &&
        (appt.id === idOrPublicId || appt.publicAppointmentId === idOrPublicId)
      ) {
        return { ...appt };
      }
    }
    return null;
  }

  public async findAppointments(
    options: AppointmentQueryOptions,
  ): Promise<{ data: AppointmentEntity[]; total: number }> {
    let list = Array.from(this.appointments.values());

    if (options.patientId) {
      list = list.filter((a) => a.patientId === options.patientId);
    }
    if (options.doctorId) {
      list = list.filter((a) => a.doctorId === options.doctorId);
    }
    if (options.status) {
      list = list.filter((a) => a.status === options.status);
    }
    if (options.statuses && options.statuses.length > 0) {
      list = list.filter((a) => options.statuses!.includes(a.status));
    }
    if (options.upcomingOnly) {
      const now = new Date();
      list = list.filter((a) => a.startAt >= now);
    }
    if (options.pastOnly) {
      const now = new Date();
      list = list.filter((a) => a.endAt < now);
    }
    if (options.startDate) {
      list = list.filter((a) => a.startAt >= options.startDate!);
    }
    if (options.endDate) {
      list = list.filter((a) => a.endAt <= options.endDate!);
    }

    // Sort deterministic: startAt ASC, id ASC
    list.sort((a, b) => {
      const timeDiff = a.startAt.getTime() - b.startAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.id.localeCompare(b.id);
    });

    const total = list.length;
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;
    const data = list.slice(skip, skip + limit).map((a) => ({ ...a }));

    return { data, total };
  }

  public async updateAppointment(
    id: string,
    input: UpdateAppointmentInput,
  ): Promise<AppointmentEntity> {
    const existing = this.appointments.get(id);
    if (!existing) {
      throw new NotFoundError(`Appointment with ID ${id} not found`);
    }

    const updated: AppointmentEntity = {
      ...existing,
      status: input.status ?? existing.status,
      reservationState: input.reservationState ?? existing.reservationState,
      reservedUntil:
        input.reservedUntil !== undefined ? input.reservedUntil : existing.reservedUntil,
      cancellationReason:
        input.cancellationReason !== undefined
          ? input.cancellationReason
          : existing.cancellationReason,
      cancelledAt: input.cancelledAt !== undefined ? input.cancelledAt : existing.cancelledAt,
      cancelledBy: input.cancelledBy !== undefined ? input.cancelledBy : existing.cancelledBy,
      declineReason:
        input.declineReason !== undefined ? input.declineReason : existing.declineReason,
      declinedAt: input.declinedAt !== undefined ? input.declinedAt : existing.declinedAt,
      confirmedAt: input.confirmedAt !== undefined ? input.confirmedAt : existing.confirmedAt,
      startedAt: input.startedAt !== undefined ? input.startedAt : existing.startedAt,
      completedAt: input.completedAt !== undefined ? input.completedAt : existing.completedAt,
      noShowAt: input.noShowAt !== undefined ? input.noShowAt : existing.noShowAt,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date(),
    };

    this.appointments.set(id, updated);
    return { ...updated };
  }

  public async findOverlappingActiveAppointment(
    doctorId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
  ): Promise<AppointmentEntity | null> {
    const inactiveStatuses = [
      AppointmentStatus.CANCELLED,
      AppointmentStatus.DECLINED,
      AppointmentStatus.EXPIRED,
    ];

    const targetStart = new Date(startAt).getTime();
    const targetEnd = new Date(endAt).getTime();

    for (const appt of this.appointments.values()) {
      if (appt.doctorId !== doctorId) continue;
      if (excludeAppointmentId && appt.id === excludeAppointmentId) continue;
      if (inactiveStatuses.includes(appt.status)) continue;
      // Expired reservations do not block the slot
      if (
        appt.status === AppointmentStatus.RESERVED &&
        appt.reservedUntil &&
        appt.reservedUntil.getTime() <= Date.now()
      ) {
        continue;
      }

      const apptStart = appt.startAt.getTime();
      const apptEnd = appt.endAt.getTime();

      // Check overlap: apptStart < targetEnd && apptEnd > targetStart
      if (apptStart < targetEnd && apptEnd > targetStart) {
        return { ...appt };
      }
    }

    return null;
  }

  public async createPreConsultation(
    input: CreatePreConsultationInput,
  ): Promise<PreConsultationEntity> {
    const id = randomUUID();
    const now = new Date();

    const preConsultation: PreConsultationEntity = {
      id,
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
      createdAt: now,
      updatedAt: now,
    };

    this.preConsultations.set(id, preConsultation);
    return { ...preConsultation };
  }

  public async findPreConsultationByAppointmentId(
    appointmentId: string,
  ): Promise<PreConsultationEntity | null> {
    for (const pc of this.preConsultations.values()) {
      if (pc.appointmentId === appointmentId) {
        return { ...pc };
      }
    }
    return null;
  }

  public async updatePreConsultation(
    id: string,
    input: UpdatePreConsultationInput,
  ): Promise<PreConsultationEntity> {
    const existing = this.preConsultations.get(id);
    if (!existing) {
      throw new NotFoundError(`PreConsultation with ID ${id} not found`);
    }

    const updated: PreConsultationEntity = {
      ...existing,
      reasonForVisit:
        input.reasonForVisit !== undefined ? input.reasonForVisit : existing.reasonForVisit,
      symptoms: input.symptoms !== undefined ? input.symptoms : existing.symptoms,
      symptomOnset: input.symptomOnset !== undefined ? input.symptomOnset : existing.symptomOnset,
      currentMedications:
        input.currentMedications !== undefined
          ? input.currentMedications
          : existing.currentMedications,
      allergies: input.allergies !== undefined ? input.allergies : existing.allergies,
      patientNotes: input.patientNotes !== undefined ? input.patientNotes : existing.patientNotes,
      status: input.status !== undefined ? input.status : existing.status,
      submittedAt: input.submittedAt !== undefined ? input.submittedAt : existing.submittedAt,
      updatedAt: new Date(),
    };

    this.preConsultations.set(id, updated);
    return { ...updated };
  }

  public async createCancellation(
    input: CreateCancellationInput,
  ): Promise<AppointmentCancellationEntity> {
    const id = randomUUID();
    const now = new Date();
    const entity: AppointmentCancellationEntity = {
      id,
      appointmentId: input.appointmentId,
      cancelledBy: input.cancelledBy,
      cancellationActorType: input.cancellationActorType,
      reason: input.reason,
      reasonCode: input.reasonCode ?? null,
      metadata: input.metadata ?? null,
      cancelledAt: now,
      createdAt: now,
    };
    this.cancellations.set(id, entity);
    return { ...entity };
  }

  public async findCancellationByAppointmentId(
    appointmentId: string,
  ): Promise<AppointmentCancellationEntity | null> {
    for (const c of this.cancellations.values()) {
      if (c.appointmentId === appointmentId) {
        return { ...c };
      }
    }
    return null;
  }

  public async expireStaleReservations(cutoffDate = new Date()): Promise<number> {
    let count = 0;
    const cutoffTime = cutoffDate.getTime();
    for (const [id, appt] of this.appointments.entries()) {
      if (
        appt.status === AppointmentStatus.RESERVED &&
        appt.reservedUntil &&
        appt.reservedUntil.getTime() <= cutoffTime
      ) {
        this.appointments.set(id, {
          ...appt,
          status: AppointmentStatus.EXPIRED,
          reservationState: SlotReservationState.AVAILABLE,
          updatedAt: new Date(),
        });
        count++;
      }
    }
    return count;
  }

  public clear(): void {
    this.appointments.clear();
    this.preConsultations.clear();
    this.cancellations.clear();
  }
}
