import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError, ValidationError } from '../../../common/errors/app-error.js';
import {
  APPOINTMENT_REPOSITORY,
  type IAppointmentRepository,
} from '../interfaces/appointment-repository.interface.js';
import {
  APPOINTMENT_AUDIT_SERVICE,
  type IAppointmentAuditService,
} from '../interfaces/appointment-audit-service.interface.js';
import { AppointmentStateMachineService } from './appointment-state-machine.service.js';
import { PreConsultationService } from './pre-consultation.service.js';
import { CareRelationshipsService } from '../../care-relationships/services/care-relationships.service.js';
import {
  CARE_RELATIONSHIP_REPOSITORY,
  type ICareRelationshipRepository,
} from '../../care-relationships/interfaces/care-relationship-repository.interface.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';
import {
  DOCTOR_AVAILABILITY_REPOSITORY,
  type IDoctorAvailabilityRepository,
} from '../../doctor-availability/interfaces/availability-repository.interface.js';
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';
import { OfferStatus } from '../../doctor-availability/enums/offer-status.enum.js';
import { CareRelationshipStatus } from '../../care-relationships/enums/care-relationship-status.enum.js';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';
import { SlotReservationState } from '../enums/slot-reservation-state.enum.js';
import type { CreateAppointmentDto } from '../dto/create-appointment.dto.js';
import type { ReserveSlotDto } from '../dto/reserve-slot.dto.js';
import type { CancelAppointmentDto } from '../dto/cancel-appointment.dto.js';
import type { DeclineAppointmentDto } from '../dto/decline-appointment.dto.js';
import type { AppointmentQueryDto } from '../dto/appointment-query.dto.js';
import {
  AppointmentResponseDto,
  PaginatedAppointmentsResponseDto,
} from '../dto/appointment-response.dto.js';
import type { AppointmentEntity } from '../entities/appointment.entity.js';
import type { DoctorProfileEntity } from '../../doctors/entities/doctor-profile.entity.js';
import type { ConsultationOfferEntity } from '../../doctor-availability/entities/consultation-offer.entity.js';
import type { PatientProfileEntity } from '../../care-relationships/entities/patient-profile.entity.js';
import type { PreConsultationResponseDto } from '../dto/pre-consultation-response.dto.js';

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepo: IAppointmentRepository,
    @Inject(APPOINTMENT_AUDIT_SERVICE)
    private readonly auditService: IAppointmentAuditService,
    @Inject(AppointmentStateMachineService)
    private readonly stateMachine: AppointmentStateMachineService,
    @Inject(PreConsultationService)
    private readonly preConsultationService: PreConsultationService,
    @Inject(CareRelationshipsService)
    private readonly careRelService: CareRelationshipsService,
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo: ICareRelationshipRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
    @Inject(DOCTOR_AVAILABILITY_REPOSITORY)
    private readonly availabilityRepo: IDoctorAvailabilityRepository,
  ) {}

  /**
   * Temporarily reserves an available doctor slot (hold for 15-30 minutes).
   */
  public async reserveSlot(
    patientUserId: string,
    dto: ReserveSlotDto,
  ): Promise<AppointmentResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);
    const doctor = await this.resolveAndValidateDoctor(dto.doctorId);
    const offer = await this.resolveAndValidateOffer(dto.consultationOfferId, doctor.id);

    const startAt = new Date(dto.startAt);
    this.validateStartTimestamp(startAt);

    const endAt = new Date(startAt.getTime() + offer.durationMinutes * 60 * 1000);
    await this.validateDoctorAvailabilityWindow(doctor.id, startAt, endAt);

    // Concurrency / double-booking check
    const overlapping = await this.appointmentRepo.findOverlappingActiveAppointment(
      doctor.id,
      startAt,
      endAt,
    );
    if (overlapping) {
      throw new ConflictError('The requested doctor time slot is already reserved or booked');
    }

    const holdMinutes = dto.holdDurationMinutes ?? 15;
    const reservedUntil = new Date(Date.now() + holdMinutes * 60 * 1000);

    const appointment = await this.appointmentRepo.createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      consultationOfferId: offer.id,
      startAt,
      endAt,
      status: AppointmentStatus.RESERVED,
      reservationState: SlotReservationState.HELD_IN_RESERVATION,
      reservedUntil,
    });

    this.auditService.logEvent({
      event: 'APPOINTMENT_RESERVED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `APPOINTMENT:${appointment.id}`,
      action: 'RESERVE_SLOT',
      metadata: {
        publicAppointmentId: appointment.publicAppointmentId,
        doctorId: doctor.id,
        patientId: patient.id,
        holdMinutes,
      },
    });

    return this.buildResponseDto(appointment, patient, doctor, offer);
  }

  /**
   * Creates an appointment request for a verified doctor.
   */
  public async createAppointment(
    patientUserId: string,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);
    const doctor = await this.resolveAndValidateDoctor(dto.doctorId);
    const offer = await this.resolveAndValidateOffer(dto.consultationOfferId, doctor.id);

    const startAt = new Date(dto.startAt);
    this.validateStartTimestamp(startAt);

    const endAt = new Date(startAt.getTime() + offer.durationMinutes * 60 * 1000);
    await this.validateDoctorAvailabilityWindow(doctor.id, startAt, endAt);

    // Concurrency / double-booking check
    const overlapping = await this.appointmentRepo.findOverlappingActiveAppointment(
      doctor.id,
      startAt,
      endAt,
    );
    if (overlapping) {
      throw new ConflictError('The requested doctor time slot is already reserved or booked');
    }

    const appointment = await this.appointmentRepo.createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      consultationOfferId: offer.id,
      startAt,
      endAt,
      status: AppointmentStatus.REQUESTED,
      reservationState: SlotReservationState.BOOKED,
      notes: dto.notes?.trim() ?? null,
    });

    // Establish care relationship if not present
    const existingCareRel = await this.careRelRepo.findCareRelationship(patient.id, doctor.id);
    if (!existingCareRel) {
      await this.careRelRepo.createCareRelationship({
        patientId: patient.id,
        doctorId: doctor.id,
        status: CareRelationshipStatus.ACTIVE,
        establishedAt: new Date(),
        notes: `Care relationship initiated through appointment booking ${appointment.publicAppointmentId}`,
      });
    }

    // If pre-consultation intake was provided in the creation payload, save it as draft
    let preConsultationResponse = undefined;
    if (dto.preConsultation) {
      preConsultationResponse = await this.preConsultationService.saveDraft(
        patientUserId,
        appointment.id,
        dto.preConsultation,
      );
    }

    this.auditService.logEvent({
      event: 'APPOINTMENT_REQUESTED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `APPOINTMENT:${appointment.id}`,
      action: 'REQUEST_APPOINTMENT',
      metadata: {
        publicAppointmentId: appointment.publicAppointmentId,
        doctorId: doctor.id,
        patientId: patient.id,
      },
    });

    return this.buildResponseDto(
      appointment,
      patient,
      doctor,
      offer,
      preConsultationResponse ?? null,
    );
  }

  /**
   * Retrieves paginated appointments for the authenticated patient.
   */
  public async getPatientAppointments(
    patientUserId: string,
    query: AppointmentQueryDto,
  ): Promise<PaginatedAppointmentsResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);

    const { data, total } = await this.appointmentRepo.findAppointments({
      patientId: patient.id,
      status: query.status,
      upcomingOnly: query.upcoming,
      pastOnly: query.past,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });

    const items = await Promise.all(
      data.map(async (appt) => {
        const doctor = await this.doctorsRepo.findById(appt.doctorId);
        const offer = await this.availabilityRepo.findOfferById(appt.consultationOfferId);
        return this.buildResponseDto(appt, patient, doctor ?? undefined, offer ?? undefined);
      }),
    );

    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retrieves a single appointment for the patient.
   */
  public async getPatientAppointmentById(
    patientUserId: string,
    idOrPublicId: string,
  ): Promise<AppointmentResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);
    const appointment = await this.appointmentRepo.findPatientAppointment(patient.id, idOrPublicId);

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${idOrPublicId}' not found for the authenticated patient`,
      );
    }

    const doctor = await this.doctorsRepo.findById(appointment.doctorId);
    const offer = await this.availabilityRepo.findOfferById(appointment.consultationOfferId);
    const preConsultation = await this.appointmentRepo.findPreConsultationByAppointmentId(
      appointment.id,
    );

    return this.buildResponseDto(
      appointment,
      patient,
      doctor ?? undefined,
      offer ?? undefined,
      preConsultation
        ? await this.preConsultationService.getPreConsultationForPatient(
            patientUserId,
            appointment.id,
          )
        : null,
    );
  }

  /**
   * Patient cancels an appointment.
   */
  public async cancelPatientAppointment(
    patientUserId: string,
    idOrPublicId: string,
    dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);
    const appointment = await this.appointmentRepo.findPatientAppointment(patient.id, idOrPublicId);

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${idOrPublicId}' not found for the authenticated patient`,
      );
    }

    this.stateMachine.validateTransition(
      appointment.status,
      AppointmentStatus.CANCELLED,
      'PATIENT',
    );

    const updated = await this.appointmentRepo.updateAppointment(appointment.id, {
      status: AppointmentStatus.CANCELLED,
      reservationState: SlotReservationState.AVAILABLE,
      cancellationReason: dto.reason.trim(),
      cancelledAt: new Date(),
      cancelledBy: patient.publicPatientId,
    });

    this.auditService.logEvent({
      event: 'APPOINTMENT_CANCELLED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `APPOINTMENT:${updated.id}`,
      action: 'CANCEL_APPOINTMENT',
      metadata: {
        publicAppointmentId: updated.publicAppointmentId,
        reason: dto.reason.trim(),
      },
    });

    const doctor = await this.doctorsRepo.findById(updated.doctorId);
    const offer = await this.availabilityRepo.findOfferById(updated.consultationOfferId);
    return this.buildResponseDto(updated, patient, doctor ?? undefined, offer ?? undefined);
  }

  /**
   * Retrieves paginated appointments for the authenticated physician.
   */
  public async getDoctorAppointments(
    doctorUserId: string,
    query: AppointmentQueryDto,
  ): Promise<PaginatedAppointmentsResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for the authenticated user');
    }

    const { data, total } = await this.appointmentRepo.findAppointments({
      doctorId: doctor.id,
      status: query.status,
      upcomingOnly: query.upcoming,
      pastOnly: query.past,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });

    const items = await Promise.all(
      data.map(async (appt) => {
        const patient = await this.careRelRepo.findPatientById(appt.patientId);
        const offer = await this.availabilityRepo.findOfferById(appt.consultationOfferId);
        return this.buildResponseDto(appt, patient ?? undefined, doctor, offer ?? undefined);
      }),
    );

    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retrieves a single appointment for the physician.
   */
  public async getDoctorAppointmentById(
    doctorUserId: string,
    idOrPublicId: string,
  ): Promise<AppointmentResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for the authenticated user');
    }

    const appointment = await this.appointmentRepo.findDoctorAppointment(doctor.id, idOrPublicId);

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${idOrPublicId}' not found or not assigned to Dr. ${doctor.displayName}`,
      );
    }

    const patient = await this.careRelRepo.findPatientById(appointment.patientId);
    const offer = await this.availabilityRepo.findOfferById(appointment.consultationOfferId);

    return this.buildResponseDto(appointment, patient ?? undefined, doctor, offer ?? undefined);
  }

  /**
   * Doctor accepts and confirms an appointment request.
   */
  public async acceptDoctorAppointment(
    doctorUserId: string,
    idOrPublicId: string,
  ): Promise<AppointmentResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for the authenticated user');
    }

    const appointment = await this.appointmentRepo.findDoctorAppointment(doctor.id, idOrPublicId);

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${idOrPublicId}' not found or not assigned to Dr. ${doctor.displayName}`,
      );
    }

    this.stateMachine.validateTransition(appointment.status, AppointmentStatus.CONFIRMED, 'DOCTOR');

    const updated = await this.appointmentRepo.updateAppointment(appointment.id, {
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'APPOINTMENT_CONFIRMED',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `APPOINTMENT:${updated.id}`,
      action: 'ACCEPT_APPOINTMENT',
      metadata: {
        publicAppointmentId: updated.publicAppointmentId,
        doctorId: doctor.id,
      },
    });

    const patient = await this.careRelRepo.findPatientById(updated.patientId);
    const offer = await this.availabilityRepo.findOfferById(updated.consultationOfferId);
    return this.buildResponseDto(updated, patient ?? undefined, doctor, offer ?? undefined);
  }

  /**
   * Doctor declines an appointment request.
   */
  public async declineDoctorAppointment(
    doctorUserId: string,
    idOrPublicId: string,
    dto: DeclineAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for the authenticated user');
    }

    const appointment = await this.appointmentRepo.findDoctorAppointment(doctor.id, idOrPublicId);

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${idOrPublicId}' not found or not assigned to Dr. ${doctor.displayName}`,
      );
    }

    this.stateMachine.validateTransition(appointment.status, AppointmentStatus.DECLINED, 'DOCTOR');

    const updated = await this.appointmentRepo.updateAppointment(appointment.id, {
      status: AppointmentStatus.DECLINED,
      reservationState: SlotReservationState.AVAILABLE,
      declineReason: dto.reason.trim(),
      declinedAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'APPOINTMENT_DECLINED',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `APPOINTMENT:${updated.id}`,
      action: 'DECLINE_APPOINTMENT',
      metadata: {
        publicAppointmentId: updated.publicAppointmentId,
        reason: dto.reason.trim(),
      },
    });

    const patient = await this.careRelRepo.findPatientById(updated.patientId);
    const offer = await this.availabilityRepo.findOfferById(updated.consultationOfferId);
    return this.buildResponseDto(updated, patient ?? undefined, doctor, offer ?? undefined);
  }

  /**
   * Doctor cancels an already confirmed appointment.
   */
  public async cancelDoctorAppointment(
    doctorUserId: string,
    idOrPublicId: string,
    dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for the authenticated user');
    }

    const appointment = await this.appointmentRepo.findDoctorAppointment(doctor.id, idOrPublicId);

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${idOrPublicId}' not found or not assigned to Dr. ${doctor.displayName}`,
      );
    }

    this.stateMachine.validateTransition(appointment.status, AppointmentStatus.CANCELLED, 'DOCTOR');

    const updated = await this.appointmentRepo.updateAppointment(appointment.id, {
      status: AppointmentStatus.CANCELLED,
      reservationState: SlotReservationState.AVAILABLE,
      cancellationReason: dto.reason.trim(),
      cancelledAt: new Date(),
      cancelledBy: doctor.publicDoctorId,
    });

    this.auditService.logEvent({
      event: 'APPOINTMENT_CANCELLED',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `APPOINTMENT:${updated.id}`,
      action: 'CANCEL_APPOINTMENT',
      metadata: {
        publicAppointmentId: updated.publicAppointmentId,
        reason: dto.reason.trim(),
      },
    });

    const patient = await this.careRelRepo.findPatientById(updated.patientId);
    const offer = await this.availabilityRepo.findOfferById(updated.consultationOfferId);
    return this.buildResponseDto(updated, patient ?? undefined, doctor, offer ?? undefined);
  }

  /**
   * Doctor starts consultation session (transitions CONFIRMED -> IN_PROGRESS).
   */
  public async startDoctorAppointment(
    doctorUserId: string,
    idOrPublicId: string,
  ): Promise<AppointmentResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for the authenticated user');
    }

    const appointment = await this.appointmentRepo.findDoctorAppointment(doctor.id, idOrPublicId);

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${idOrPublicId}' not found or not assigned to Dr. ${doctor.displayName}`,
      );
    }

    this.stateMachine.validateTransition(
      appointment.status,
      AppointmentStatus.IN_PROGRESS,
      'DOCTOR',
    );

    const updated = await this.appointmentRepo.updateAppointment(appointment.id, {
      status: AppointmentStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'APPOINTMENT_STARTED',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `APPOINTMENT:${updated.id}`,
      action: 'START_APPOINTMENT',
      metadata: {
        publicAppointmentId: updated.publicAppointmentId,
      },
    });

    const patient = await this.careRelRepo.findPatientById(updated.patientId);
    const offer = await this.availabilityRepo.findOfferById(updated.consultationOfferId);
    return this.buildResponseDto(updated, patient ?? undefined, doctor, offer ?? undefined);
  }

  /**
   * Doctor completes consultation session (transitions IN_PROGRESS -> COMPLETED).
   */
  public async completeDoctorAppointment(
    doctorUserId: string,
    idOrPublicId: string,
  ): Promise<AppointmentResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for the authenticated user');
    }

    const appointment = await this.appointmentRepo.findDoctorAppointment(doctor.id, idOrPublicId);

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${idOrPublicId}' not found or not assigned to Dr. ${doctor.displayName}`,
      );
    }

    this.stateMachine.validateTransition(appointment.status, AppointmentStatus.COMPLETED, 'DOCTOR');

    const updated = await this.appointmentRepo.updateAppointment(appointment.id, {
      status: AppointmentStatus.COMPLETED,
      completedAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'APPOINTMENT_COMPLETED',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `APPOINTMENT:${updated.id}`,
      action: 'COMPLETE_APPOINTMENT',
      metadata: {
        publicAppointmentId: updated.publicAppointmentId,
      },
    });

    const patient = await this.careRelRepo.findPatientById(updated.patientId);
    const offer = await this.availabilityRepo.findOfferById(updated.consultationOfferId);
    return this.buildResponseDto(updated, patient ?? undefined, doctor, offer ?? undefined);
  }

  /**
   * Doctor marks appointment as no-show (transitions CONFIRMED -> NO_SHOW).
   */
  public async markNoShowDoctorAppointment(
    doctorUserId: string,
    idOrPublicId: string,
  ): Promise<AppointmentResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for the authenticated user');
    }

    const appointment = await this.appointmentRepo.findDoctorAppointment(doctor.id, idOrPublicId);

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${idOrPublicId}' not found or not assigned to Dr. ${doctor.displayName}`,
      );
    }

    this.stateMachine.validateTransition(appointment.status, AppointmentStatus.NO_SHOW, 'DOCTOR');

    const updated = await this.appointmentRepo.updateAppointment(appointment.id, {
      status: AppointmentStatus.NO_SHOW,
      noShowAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'APPOINTMENT_NO_SHOW',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `APPOINTMENT:${updated.id}`,
      action: 'MARK_NO_SHOW',
      metadata: {
        publicAppointmentId: updated.publicAppointmentId,
      },
    });

    const patient = await this.careRelRepo.findPatientById(updated.patientId);
    const offer = await this.availabilityRepo.findOfferById(updated.consultationOfferId);
    return this.buildResponseDto(updated, patient ?? undefined, doctor, offer ?? undefined);
  }

  // --- Helper validation methods ---

  private async resolveAndValidateDoctor(doctorIdOrPublicId: string): Promise<DoctorProfileEntity> {
    const doctor = doctorIdOrPublicId.startsWith('DOC-')
      ? await this.doctorsRepo.findByPublicId(doctorIdOrPublicId)
      : await this.doctorsRepo.findById(doctorIdOrPublicId);

    if (!doctor) {
      throw new NotFoundError(`Doctor '${doctorIdOrPublicId}' not found`);
    }

    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ValidationError('Appointments cannot be booked with unverified physicians');
    }

    return doctor;
  }

  private async resolveAndValidateOffer(
    offerId: string,
    expectedDoctorId: string,
  ): Promise<ConsultationOfferEntity> {
    const offer = await this.availabilityRepo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundError(`Consultation offer '${offerId}' not found`);
    }

    if (offer.doctorId !== expectedDoctorId) {
      throw new ValidationError('Selected consultation offer does not belong to the chosen doctor');
    }

    if (offer.status !== OfferStatus.ACTIVE) {
      throw new ValidationError('Selected consultation offer is not active for booking');
    }

    return offer;
  }

  private validateStartTimestamp(startAt: Date): void {
    if (isNaN(startAt.getTime())) {
      throw new ValidationError('startAt must be a valid ISO 8601 timestamp');
    }

    const now = Date.now();
    // Allow small 5-minute clock drift margin for tests or real-world execution
    if (startAt.getTime() < now - 5 * 60 * 1000) {
      throw new ValidationError('Appointment slot start time must be in the future');
    }
  }

  private async validateDoctorAvailabilityWindow(
    doctorId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<void> {
    const availabilities = await this.availabilityRepo.findAvailabilitiesByDoctorId(doctorId, true);
    // If the doctor has defined availability schedules, the slot must align with at least one active schedule
    if (availabilities.length > 0) {
      const weekdays = [
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ];
      const slotDayOfWeek = weekdays[startAt.getUTCDay()];
      const slotStartHHmm = `${String(startAt.getUTCHours()).padStart(2, '0')}:${String(startAt.getUTCMinutes()).padStart(2, '0')}`;
      const slotEndHHmm = `${String(endAt.getUTCHours()).padStart(2, '0')}:${String(endAt.getUTCMinutes()).padStart(2, '0')}`;

      const matchesAny = availabilities.some((avail) => {
        if (avail.dayOfWeek !== slotDayOfWeek) return false;
        if (avail.effectiveFrom && startAt < avail.effectiveFrom) return false;
        if (avail.effectiveUntil && endAt > avail.effectiveUntil) return false;
        return slotStartHHmm >= avail.startTime && slotEndHHmm <= avail.endTime;
      });

      if (!matchesAny) {
        throw new ValidationError(
          `Selected slot (${slotDayOfWeek} ${slotStartHHmm}-${slotEndHHmm} UTC) falls outside of Dr. published availability schedule`,
        );
      }
    }
  }

  private buildResponseDto(
    entity: AppointmentEntity,
    patient?: PatientProfileEntity | undefined,
    doctor?: DoctorProfileEntity | undefined,
    offer?: ConsultationOfferEntity | undefined,
    preConsultation?: PreConsultationResponseDto | null | undefined,
  ): AppointmentResponseDto {
    const dto = new AppointmentResponseDto();
    dto.id = entity.id;
    dto.publicAppointmentId = entity.publicAppointmentId;
    dto.patientId = entity.patientId;
    dto.publicPatientId = patient?.publicPatientId;
    dto.doctorId = entity.doctorId;
    dto.publicDoctorId = doctor?.publicDoctorId;
    dto.doctorDisplayName = doctor ? `Dr. ${doctor.displayName}` : undefined;
    dto.consultationOfferId = entity.consultationOfferId;
    dto.offerTitle = offer?.title;
    dto.durationMinutes = offer?.durationMinutes;
    dto.fee = offer?.fee;
    dto.currency = offer?.currency;
    dto.startAt = entity.startAt.toISOString();
    dto.endAt = entity.endAt.toISOString();
    dto.status = entity.status;
    dto.reservationState = entity.reservationState;
    dto.reservedUntil = entity.reservedUntil ? entity.reservedUntil.toISOString() : null;
    dto.cancellationReason = entity.cancellationReason;
    dto.cancelledAt = entity.cancelledAt ? entity.cancelledAt.toISOString() : null;
    dto.cancelledBy = entity.cancelledBy;
    dto.declineReason = entity.declineReason;
    dto.declinedAt = entity.declinedAt ? entity.declinedAt.toISOString() : null;
    dto.confirmedAt = entity.confirmedAt ? entity.confirmedAt.toISOString() : null;
    dto.startedAt = entity.startedAt ? entity.startedAt.toISOString() : null;
    dto.completedAt = entity.completedAt ? entity.completedAt.toISOString() : null;
    dto.noShowAt = entity.noShowAt ? entity.noShowAt.toISOString() : null;
    dto.notes = entity.notes;
    dto.hasPreConsultation = preConsultation ? true : false;
    dto.preConsultationStatus = preConsultation ? preConsultation.status : null;
    dto.preConsultation = preConsultation ?? null;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
