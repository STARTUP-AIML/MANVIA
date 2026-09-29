import { Inject, Injectable } from '@nestjs/common';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import {
  HEALTH_TIMELINE_REPOSITORY,
  type IHealthTimelineRepository,
} from '../interfaces/health-timeline-repository.interface.js';
import {
  HEALTH_RECORDS_AUDIT_SERVICE,
  type IHealthRecordsAuditService,
} from '../interfaces/health-records-audit-service.interface.js';
import { CareRelationshipsService } from '../../care-relationships/services/care-relationships.service.js';
import {
  CARE_RELATIONSHIP_REPOSITORY,
  type ICareRelationshipRepository,
} from '../../care-relationships/interfaces/care-relationship-repository.interface.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';
import { CareRelationshipStatus } from '../../care-relationships/enums/care-relationship-status.enum.js';
import { ConsentScope } from '../../care-relationships/enums/consent-scope.enum.js';
import { ConsentStatus } from '../../care-relationships/enums/consent-status.enum.js';
import { TimelineEventType } from '../enums/timeline-event-type.enum.js';
import type { TimelineEventEntity } from '../entities/timeline-event.entity.js';
import type {
  PaginatedTimelineResponseDto,
  TimelineEventResponseDto,
  TimelineQueryDto,
} from '../dto/index.js';

export interface RecordTimelineEventInput {
  patientId: string;
  eventType: TimelineEventType;
  title: string;
  summary: string;
  sourceType: string;
  sourceId?: string | null | undefined;
  eventTimestamp?: Date | undefined;
  metadata?: Record<string, unknown> | null | undefined;
}

@Injectable()
export class HealthTimelineService {
  constructor(
    @Inject(HEALTH_TIMELINE_REPOSITORY)
    private readonly timelineRepo: IHealthTimelineRepository,
    @Inject(HEALTH_RECORDS_AUDIT_SERVICE)
    private readonly auditService: IHealthRecordsAuditService,
    private readonly careRelService: CareRelationshipsService,
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo: ICareRelationshipRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
  ) {}

  /**
   * System or domain event to record an entry on the patient's health timeline.
   */
  public async recordEvent(input: RecordTimelineEventInput): Promise<TimelineEventResponseDto> {
    const event = await this.timelineRepo.create({
      patientId: input.patientId,
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      eventTimestamp: input.eventTimestamp ?? new Date(),
      metadata: input.metadata ?? null,
    });

    this.auditService.logEvent({
      event: 'TIMELINE_EVENT_RECORDED',
      actorId: input.patientId,
      role: 'PATIENT',
      resource: `TIMELINE_EVENT:${event.id}`,
      action: 'RECORD_TIMELINE_EVENT',
      metadata: {
        eventType: input.eventType,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        publicEventId: event.publicEventId,
      },
    });

    return this.mapToResponseDto(event);
  }

  /**
   * Retrieves the health timeline for the authenticated patient.
   */
  public async getPatientTimeline(
    userId: string,
    query: TimelineQueryDto,
  ): Promise<PaginatedTimelineResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const { startDate, endDate } = this.resolveDateRange(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.timelineRepo.findMany({
      patientId: patient.id,
      eventType: query.eventType,
      startDate,
      endDate,
      page,
      limit,
    });

    this.auditService.logEvent({
      event: 'HEALTH_TIMELINE_ACCESSED',
      actorId: userId,
      role: 'PATIENT',
      resource: `PATIENT_TIMELINE:${patient.id}`,
      action: 'VIEW_TIMELINE',
      metadata: {
        total,
        page,
        limit,
      },
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: data.map((e) => this.mapToResponseDto(e, patient.publicPatientId)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retrieves a patient's health timeline for an authorized physician.
   * Defensively checks verification, active care relationship, and HEALTH_TIMELINE consent.
   */
  public async getDoctorPatientTimeline(
    doctorUserId: string,
    targetPatientId: string,
    query: TimelineQueryDto,
  ): Promise<PaginatedTimelineResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenError(
        'Access denied: physician verification required to access patient timeline',
      );
    }

    const patient = await this.resolvePatient(targetPatientId);

    const careRel = await this.careRelRepo.findCareRelationship(patient.id, doctor.id);
    if (!careRel || careRel.status !== CareRelationshipStatus.ACTIVE) {
      throw new ForbiddenError(
        'Access denied: active care relationship required to access patient timeline',
      );
    }

    const activeConsents = await this.careRelRepo.findConsentsByPatientId(patient.id, true);
    const hasConsent = activeConsents.some(
      (c) =>
        c.doctorId === doctor.id &&
        c.scope === ConsentScope.HEALTH_TIMELINE &&
        c.status === ConsentStatus.ACTIVE &&
        (!c.expiresAt || new Date(c.expiresAt).getTime() > Date.now()),
    );

    if (!hasConsent) {
      throw new ForbiddenError(
        'Access denied: explicit patient consent for HEALTH_TIMELINE is required or has expired',
      );
    }

    const { startDate, endDate } = this.resolveDateRange(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.timelineRepo.findMany({
      patientId: patient.id,
      eventType: query.eventType,
      startDate,
      endDate,
      page,
      limit,
    });

    this.auditService.logEvent({
      event: 'HEALTH_TIMELINE_ACCESSED',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `PATIENT_TIMELINE:${patient.id}`,
      action: 'VIEW_PATIENT_TIMELINE',
      metadata: {
        doctorId: doctor.id,
        patientId: patient.id,
        total,
      },
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: data.map((e) => this.mapToResponseDto(e, patient.publicPatientId)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  private async resolvePatient(patientId: string) {
    const patient = patientId.startsWith('PAT-')
      ? await this.careRelRepo.findPatientByPublicId(patientId)
      : await this.careRelRepo.findPatientById(patientId);

    if (!patient) {
      throw new NotFoundError('Patient resource not found');
    }
    return patient;
  }

  private resolveDateRange(query: TimelineQueryDto): {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
  } {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    if (startDate && isNaN(startDate.getTime())) {
      throw new ValidationError('Invalid startDate format');
    }
    if (endDate && isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid endDate format');
    }
    if (startDate && endDate && startDate > endDate) {
      throw new ValidationError('startDate cannot be after endDate');
    }

    return { startDate, endDate };
  }

  private mapToResponseDto(
    entity: TimelineEventEntity,
    publicPatientId?: string,
  ): TimelineEventResponseDto {
    return {
      id: entity.id,
      publicEventId: entity.publicEventId,
      patientId: entity.patientId,
      ...(publicPatientId !== undefined && { publicPatientId }),
      eventType: entity.eventType,
      title: entity.title,
      summary: entity.summary,
      sourceType: entity.sourceType,
      sourceId: entity.sourceId,
      eventTimestamp: entity.eventTimestamp.toISOString(),
      metadata: entity.metadata ?? null,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
