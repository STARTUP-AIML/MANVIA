import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import {
  APPOINTMENT_REPOSITORY,
  type IAppointmentRepository,
} from '../interfaces/appointment-repository.interface.js';
import {
  APPOINTMENT_AUDIT_SERVICE,
  type IAppointmentAuditService,
} from '../interfaces/appointment-audit-service.interface.js';
import { CareRelationshipsService } from '../../care-relationships/services/care-relationships.service.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';
import { PreConsultationStatus } from '../enums/pre-consultation-status.enum.js';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';
import type { PreConsultationDraftDto } from '../dto/pre-consultation-draft.dto.js';
import { PreConsultationResponseDto } from '../dto/pre-consultation-response.dto.js';
import type { PreConsultationEntity } from '../entities/pre-consultation.entity.js';
import type { AppointmentEntity } from '../entities/appointment.entity.js';

@Injectable()
export class PreConsultationService {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepo: IAppointmentRepository,
    @Inject(APPOINTMENT_AUDIT_SERVICE)
    private readonly auditService: IAppointmentAuditService,
    @Inject(CareRelationshipsService)
    private readonly careRelService: CareRelationshipsService,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
  ) {}

  public async getPreConsultationForPatient(
    patientUserId: string,
    appointmentIdOrPublicId: string,
  ): Promise<PreConsultationResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);
    const appointment = await this.appointmentRepo.findPatientAppointment(
      patient.id,
      appointmentIdOrPublicId,
    );

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${appointmentIdOrPublicId}' not found for the authenticated patient`,
      );
    }

    const preConsultation = await this.appointmentRepo.findPreConsultationByAppointmentId(
      appointment.id,
    );

    if (!preConsultation) {
      // Return default uninitiated state without persisting blank row
      return {
        id: '',
        appointmentId: appointment.id,
        publicAppointmentId: appointment.publicAppointmentId,
        patientId: patient.id,
        status: PreConsultationStatus.NOT_STARTED,
        reasonForVisit: '',
        symptoms: null,
        symptomOnset: null,
        currentMedications: null,
        allergies: null,
        patientNotes: null,
        submittedAt: null,
        createdAt: appointment.createdAt.toISOString(),
        updatedAt: appointment.updatedAt.toISOString(),
      };
    }

    this.auditService.logEvent({
      event: 'PRE_CONSULTATION_ACCESSED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `PRE_CONSULTATION:${preConsultation.id}`,
      action: 'VIEW_PRE_CONSULTATION',
      metadata: {
        appointmentId: appointment.id,
        publicAppointmentId: appointment.publicAppointmentId,
        status: preConsultation.status,
      },
    });

    return this.mapToResponseDto(preConsultation, appointment.publicAppointmentId);
  }

  public async saveDraft(
    patientUserId: string,
    appointmentIdOrPublicId: string,
    dto: PreConsultationDraftDto,
  ): Promise<PreConsultationResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);
    const appointment = await this.appointmentRepo.findPatientAppointment(
      patient.id,
      appointmentIdOrPublicId,
    );

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${appointmentIdOrPublicId}' not found for the authenticated patient`,
      );
    }

    this.validateAppointmentActiveForIntake(appointment);

    const existing = await this.appointmentRepo.findPreConsultationByAppointmentId(appointment.id);

    if (existing && existing.status === PreConsultationStatus.SUBMITTED) {
      throw new ConflictError(
        'Pre-consultation intake has already been submitted and is locked against modifications',
      );
    }

    let saved: PreConsultationEntity;
    if (existing) {
      saved = await this.appointmentRepo.updatePreConsultation(existing.id, {
        reasonForVisit: dto.reasonForVisit.trim(),
        symptoms: dto.symptoms !== undefined ? dto.symptoms.trim() : existing.symptoms,
        symptomOnset:
          dto.symptomOnset !== undefined ? dto.symptomOnset.trim() : existing.symptomOnset,
        currentMedications:
          dto.currentMedications !== undefined
            ? dto.currentMedications.trim()
            : existing.currentMedications,
        allergies: dto.allergies !== undefined ? dto.allergies.trim() : existing.allergies,
        patientNotes:
          dto.patientNotes !== undefined ? dto.patientNotes.trim() : existing.patientNotes,
        status: PreConsultationStatus.IN_PROGRESS,
      });
    } else {
      saved = await this.appointmentRepo.createPreConsultation({
        appointmentId: appointment.id,
        patientId: patient.id,
        reasonForVisit: dto.reasonForVisit.trim(),
        symptoms: dto.symptoms?.trim() ?? null,
        symptomOnset: dto.symptomOnset?.trim() ?? null,
        currentMedications: dto.currentMedications?.trim() ?? null,
        allergies: dto.allergies?.trim() ?? null,
        patientNotes: dto.patientNotes?.trim() ?? null,
        status: PreConsultationStatus.IN_PROGRESS,
      });
    }

    this.auditService.logEvent({
      event: 'PRE_CONSULTATION_DRAFTED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `PRE_CONSULTATION:${saved.id}`,
      action: 'SAVE_DRAFT',
      metadata: {
        appointmentId: appointment.id,
        publicAppointmentId: appointment.publicAppointmentId,
      },
    });

    return this.mapToResponseDto(saved, appointment.publicAppointmentId);
  }

  public async submitPreConsultation(
    patientUserId: string,
    appointmentIdOrPublicId: string,
  ): Promise<PreConsultationResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);
    const appointment = await this.appointmentRepo.findPatientAppointment(
      patient.id,
      appointmentIdOrPublicId,
    );

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${appointmentIdOrPublicId}' not found for the authenticated patient`,
      );
    }

    this.validateAppointmentActiveForIntake(appointment);

    const existing = await this.appointmentRepo.findPreConsultationByAppointmentId(appointment.id);
    if (!existing) {
      throw new ValidationError(
        'Cannot submit pre-consultation without completing draft information first',
      );
    }

    if (existing.status === PreConsultationStatus.SUBMITTED) {
      throw new ConflictError('Pre-consultation intake has already been submitted');
    }

    if (!existing.reasonForVisit || existing.reasonForVisit.trim() === '') {
      throw new ValidationError('Reason for visit is required to finalize pre-consultation');
    }

    const submitted = await this.appointmentRepo.updatePreConsultation(existing.id, {
      status: PreConsultationStatus.SUBMITTED,
      submittedAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'PRE_CONSULTATION_SUBMITTED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `PRE_CONSULTATION:${submitted.id}`,
      action: 'SUBMIT_PRE_CONSULTATION',
      metadata: {
        appointmentId: appointment.id,
        publicAppointmentId: appointment.publicAppointmentId,
      },
    });

    return this.mapToResponseDto(submitted, appointment.publicAppointmentId);
  }

  public async getPreConsultationForDoctor(
    doctorUserId: string,
    appointmentIdOrPublicId: string,
  ): Promise<PreConsultationResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for the authenticated user');
    }

    const appointment = await this.appointmentRepo.findDoctorAppointment(
      doctor.id,
      appointmentIdOrPublicId,
    );

    if (!appointment) {
      throw new NotFoundError(
        `Appointment '${appointmentIdOrPublicId}' not found or not assigned to Dr. ${doctor.displayName}`,
      );
    }

    const preConsultation = await this.appointmentRepo.findPreConsultationByAppointmentId(
      appointment.id,
    );

    if (!preConsultation || preConsultation.status !== PreConsultationStatus.SUBMITTED) {
      throw new ForbiddenError(
        'Pre-consultation intake has not yet been finalized and submitted by the patient',
      );
    }

    this.auditService.logEvent({
      event: 'PRE_CONSULTATION_ACCESSED',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `PRE_CONSULTATION:${preConsultation.id}`,
      action: 'VIEW_PRE_CONSULTATION',
      metadata: {
        appointmentId: appointment.id,
        publicAppointmentId: appointment.publicAppointmentId,
        doctorId: doctor.id,
      },
    });

    return this.mapToResponseDto(preConsultation, appointment.publicAppointmentId);
  }

  private validateAppointmentActiveForIntake(appointment: AppointmentEntity): void {
    const inactiveStatuses = [
      AppointmentStatus.CANCELLED,
      AppointmentStatus.DECLINED,
      AppointmentStatus.EXPIRED,
      AppointmentStatus.COMPLETED,
    ];

    if (inactiveStatuses.includes(appointment.status)) {
      throw new ValidationError(
        `Cannot manage pre-consultation intake for an appointment in status '${appointment.status}'`,
      );
    }
  }

  private mapToResponseDto(
    entity: PreConsultationEntity,
    publicAppointmentId: string,
  ): PreConsultationResponseDto {
    const dto = new PreConsultationResponseDto();
    dto.id = entity.id;
    dto.appointmentId = entity.appointmentId;
    dto.publicAppointmentId = publicAppointmentId;
    dto.patientId = entity.patientId;
    dto.status = entity.status;
    dto.reasonForVisit = entity.reasonForVisit;
    dto.symptoms = entity.symptoms;
    dto.symptomOnset = entity.symptomOnset;
    dto.currentMedications = entity.currentMedications;
    dto.allergies = entity.allergies;
    dto.patientNotes = entity.patientNotes;
    dto.submittedAt = entity.submittedAt ? entity.submittedAt.toISOString() : null;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
