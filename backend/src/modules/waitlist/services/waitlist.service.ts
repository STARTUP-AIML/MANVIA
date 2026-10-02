import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import { WaitlistStatus } from '../enums/waitlist-status.enum.js';
import {
  WAITLIST_REPOSITORY,
  type IWaitlistRepository,
} from '../interfaces/waitlist-repository.interface.js';
import {
  WAITLIST_AUDIT_SERVICE,
  type IWaitlistAuditService,
} from '../interfaces/waitlist-audit-service.interface.js';
import {
  NOTIFICATION_SERVICE,
  type INotificationService,
} from '../../../common/notifications/notification.interface.js';
import { generatePublicWaitlistId } from '../utils/public-waitlist-id.util.js';
import type { JoinWaitlistDto } from '../dto/join-waitlist.dto.js';
import type { DeclineOfferDto } from '../dto/decline-offer.dto.js';
import type { WaitlistQueryDto } from '../dto/waitlist-query.dto.js';
import {
  WaitlistEntryResponseDto,
  PaginatedWaitlistResponseDto,
} from '../dto/waitlist-response.dto.js';
import type { WaitlistEntryEntity } from '../entities/waitlist-entry.entity.js';
import { CareRelationshipsService } from '../../care-relationships/services/care-relationships.service.js';
import { CareRelationshipStatus } from '../../care-relationships/enums/care-relationship-status.enum.js';
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
import {
  APPOINTMENT_REPOSITORY,
  type IAppointmentRepository,
} from '../../appointments/interfaces/appointment-repository.interface.js';
import { AppointmentStatus } from '../../appointments/enums/appointment-status.enum.js';
import { SlotReservationState } from '../../appointments/enums/slot-reservation-state.enum.js';
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @Inject(WAITLIST_REPOSITORY)
    private readonly waitlistRepo: IWaitlistRepository,
    @Inject(WAITLIST_AUDIT_SERVICE)
    private readonly auditService: IWaitlistAuditService,
    @Inject(CareRelationshipsService)
    private readonly careRelService: CareRelationshipsService,
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo: ICareRelationshipRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
    @Inject(DOCTOR_AVAILABILITY_REPOSITORY)
    private readonly availabilityRepo: IDoctorAvailabilityRepository,
    @Inject(forwardRef(() => APPOINTMENT_REPOSITORY))
    private readonly appointmentRepo: IAppointmentRepository,
    @Optional()
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService?: INotificationService,
  ) {}

  /**
   * Patient joins the waitlist for a specific doctor.
   */
  public async joinWaitlist(
    patientUserId: string,
    dto: JoinWaitlistDto,
  ): Promise<WaitlistEntryResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);

    // Validate Doctor
    const doctor = dto.doctorId.startsWith('DOC-')
      ? await this.doctorsRepo.findByPublicId(dto.doctorId)
      : await this.doctorsRepo.findById(dto.doctorId);

    if (!doctor) {
      throw new NotFoundError(`Doctor '${dto.doctorId}' not found`);
    }

    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ValidationError('Cannot join waitlist for unverified healthcare provider');
    }

    // Validate Consultation Offer if provided
    let offerId = dto.consultationOfferId;
    if (offerId) {
      const offer = await this.availabilityRepo.findOfferById(offerId);
      if (!offer || offer.doctorId !== doctor.id) {
        throw new NotFoundError(
          `Consultation offer '${offerId}' not found for Dr. ${doctor.displayName}`,
        );
      }
    } else {
      // Find doctor's default/first active offer
      const offers = await this.availabilityRepo.findOffersByDoctorId(doctor.id);
      if (offers.length > 0) {
        offerId = offers[0]?.id;
      }
    }

    // Concurrency / Duplicate active entry check
    const existing = await this.waitlistRepo.findActiveByPatientAndDoctor(
      patient.id,
      doctor.id,
      offerId,
    );
    if (existing) {
      throw new ConflictError(
        'Patient already has an active waitlist entry for this healthcare provider',
      );
    }

    const publicWaitlistId = generatePublicWaitlistId();
    const preferredStart = dto.preferredStartDate ? new Date(dto.preferredStartDate) : null;
    const preferredEnd = dto.preferredEndDate ? new Date(dto.preferredEndDate) : null;

    if (preferredStart && preferredEnd && preferredEnd <= preferredStart) {
      throw new ValidationError('preferredEndDate must be strictly after preferredStartDate');
    }

    const entry = await this.waitlistRepo.createEntry({
      publicWaitlistId,
      patientId: patient.id,
      doctorId: doctor.id,
      consultationOfferId: offerId ?? null,
      priority: dto.priority ?? 0,
      status: WaitlistStatus.ACTIVE,
      preferredStartDate: preferredStart,
      preferredEndDate: preferredEnd,
      notes: dto.notes ? dto.notes.trim() : null,
    });

    this.auditService.logEvent({
      event: 'WAITLIST_JOINED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `WAITLIST:${entry.id}`,
      action: 'JOIN_WAITLIST',
      metadata: {
        publicWaitlistId: entry.publicWaitlistId,
        doctorId: doctor.id,
        patientId: patient.id,
        priority: entry.priority,
      },
    });

    if (this.notificationService) {
      await this.notificationService.send({
        recipientId: patientUserId,
        type: 'WAITLIST_JOINED',
        title: 'Joined Waitlist',
        message: `You have joined the waitlist for Dr. ${doctor.displayName}. We will notify you when a slot becomes available.`,
        metadata: { publicWaitlistId: entry.publicWaitlistId },
      });
    }

    const queuePosition = await this.waitlistRepo.getQueuePosition(patient.id, doctor.id);
    return this.mapToResponseDto(
      entry,
      patient.publicPatientId,
      doctor.publicDoctorId,
      doctor.displayName,
      null,
      queuePosition,
    );
  }

  /**
   * Retrieves paginated waitlist entries for the authenticated patient.
   */
  public async getPatientWaitlist(
    patientUserId: string,
    query: WaitlistQueryDto,
  ): Promise<PaginatedWaitlistResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);

    const { data, total } = await this.waitlistRepo.findEntries({
      patientId: patient.id,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    const items = await Promise.all(
      data.map(async (entry) => {
        const doctor = await this.doctorsRepo.findById(entry.doctorId);
        let apptPublicId: string | null = null;
        if (entry.offeredAppointmentId) {
          const appt = await this.appointmentRepo.findAppointmentById(entry.offeredAppointmentId);
          apptPublicId = appt?.publicAppointmentId ?? null;
        }
        const queuePos = await this.waitlistRepo.getQueuePosition(patient.id, entry.doctorId);
        return this.mapToResponseDto(
          entry,
          patient.publicPatientId,
          doctor?.publicDoctorId ?? 'UNKNOWN',
          doctor?.displayName,
          apptPublicId,
          queuePos,
        );
      }),
    );

    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const totalPages = Math.ceil(total / limit) || 1;

    return { data: items, total, page, limit, totalPages };
  }

  /**
   * Retrieves a single waitlist entry by UUID or public ID.
   */
  public async getPatientWaitlistEntryById(
    patientUserId: string,
    idOrPublicId: string,
  ): Promise<WaitlistEntryResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);
    const entry = idOrPublicId.startsWith('WTL-')
      ? await this.waitlistRepo.findByPublicId(idOrPublicId)
      : await this.waitlistRepo.findById(idOrPublicId);

    if (!entry) {
      throw new NotFoundError(`Waitlist entry '${idOrPublicId}' not found`);
    }

    if (entry.patientId !== patient.id) {
      throw new ForbiddenError('You are not authorized to view another patient’s waitlist entry');
    }

    const doctor = await this.doctorsRepo.findById(entry.doctorId);
    let apptPublicId: string | null = null;
    if (entry.offeredAppointmentId) {
      const appt = await this.appointmentRepo.findAppointmentById(entry.offeredAppointmentId);
      apptPublicId = appt?.publicAppointmentId ?? null;
    }
    const queuePos = await this.waitlistRepo.getQueuePosition(patient.id, entry.doctorId);

    this.auditService.logEvent({
      event: 'WAITLIST_ACCESSED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `WAITLIST:${entry.id}`,
      action: 'VIEW_WAITLIST_ENTRY',
      metadata: { publicWaitlistId: entry.publicWaitlistId },
    });

    return this.mapToResponseDto(
      entry,
      patient.publicPatientId,
      doctor?.publicDoctorId ?? 'UNKNOWN',
      doctor?.displayName,
      apptPublicId,
      queuePos,
    );
  }

  /**
   * Patient cancels / leaves the waitlist.
   */
  public async leaveWaitlist(
    patientUserId: string,
    idOrPublicId: string,
  ): Promise<WaitlistEntryResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);
    const entry = idOrPublicId.startsWith('WTL-')
      ? await this.waitlistRepo.findByPublicId(idOrPublicId)
      : await this.waitlistRepo.findById(idOrPublicId);

    if (!entry) {
      throw new NotFoundError(`Waitlist entry '${idOrPublicId}' not found`);
    }

    if (entry.patientId !== patient.id) {
      throw new ForbiddenError('You are not authorized to cancel another patient’s waitlist entry');
    }

    if (
      entry.status === WaitlistStatus.FULFILLED ||
      entry.status === WaitlistStatus.CANCELLED ||
      entry.status === WaitlistStatus.EXPIRED
    ) {
      throw new ConflictError(`Cannot leave waitlist from terminal status '${entry.status}'`);
    }

    // If an offer was active, release the reserved appointment back to available
    if (entry.status === WaitlistStatus.OFFERED && entry.offeredAppointmentId) {
      await this.appointmentRepo.updateAppointment(entry.offeredAppointmentId, {
        status: AppointmentStatus.CANCELLED,
        reservationState: SlotReservationState.AVAILABLE,
        cancellationReason: 'Waitlist offer cancelled by patient',
        cancelledAt: new Date(),
        cancelledBy: patient.publicPatientId,
      });
    }

    const updated = await this.waitlistRepo.updateEntry(entry.id, {
      status: WaitlistStatus.CANCELLED,
      cancelledAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'WAITLIST_CANCELLED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `WAITLIST:${entry.id}`,
      action: 'LEAVE_WAITLIST',
      metadata: { publicWaitlistId: updated.publicWaitlistId },
    });

    const doctor = await this.doctorsRepo.findById(updated.doctorId);
    return this.mapToResponseDto(
      updated,
      patient.publicPatientId,
      doctor?.publicDoctorId ?? 'UNKNOWN',
      doctor?.displayName,
      null,
    );
  }

  /**
   * Patient accepts an offered slot from the waitlist.
   */
  public async acceptOffer(
    patientUserId: string,
    idOrPublicId: string,
  ): Promise<WaitlistEntryResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);
    const entry = idOrPublicId.startsWith('WTL-')
      ? await this.waitlistRepo.findByPublicId(idOrPublicId)
      : await this.waitlistRepo.findById(idOrPublicId);

    if (!entry) {
      throw new NotFoundError(`Waitlist entry '${idOrPublicId}' not found`);
    }

    if (entry.patientId !== patient.id) {
      throw new ForbiddenError('You are not authorized to accept an offer for another patient');
    }

    if (entry.status !== WaitlistStatus.OFFERED) {
      throw new ConflictError(
        `Waitlist entry is not in OFFERED state (current status: '${entry.status}')`,
      );
    }

    if (entry.offerExpiresAt && entry.offerExpiresAt.getTime() <= Date.now()) {
      // Mark offer expired
      await this.waitlistRepo.updateEntry(entry.id, {
        status: WaitlistStatus.EXPIRED,
      });
      if (entry.offeredAppointmentId) {
        await this.appointmentRepo.updateAppointment(entry.offeredAppointmentId, {
          status: AppointmentStatus.EXPIRED,
          reservationState: SlotReservationState.AVAILABLE,
        });
      }
      throw new ConflictError('The waitlist slot offer has expired');
    }

    if (!entry.offeredAppointmentId) {
      throw new ValidationError('No reserved appointment found for this waitlist offer');
    }

    // Transition reserved appointment to CONFIRMED
    const appt = await this.appointmentRepo.updateAppointment(entry.offeredAppointmentId, {
      status: AppointmentStatus.CONFIRMED,
      reservationState: SlotReservationState.BOOKED,
      confirmedAt: new Date(),
    });

    // Establish care relationship if not present
    const existingCareRel = await this.careRelRepo.findCareRelationship(patient.id, entry.doctorId);
    if (!existingCareRel) {
      await this.careRelRepo.createCareRelationship({
        patientId: patient.id,
        doctorId: entry.doctorId,
        status: CareRelationshipStatus.ACTIVE,
        establishedAt: new Date(),
        notes: `Care relationship established via waitlist offer acceptance ${appt.publicAppointmentId}`,
      });
    }

    const updated = await this.waitlistRepo.updateEntry(entry.id, {
      status: WaitlistStatus.FULFILLED,
      acceptedAt: new Date(),
      fulfilledAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'WAITLIST_ACCEPTED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `WAITLIST:${entry.id}`,
      action: 'ACCEPT_WAITLIST_OFFER',
      metadata: {
        publicWaitlistId: updated.publicWaitlistId,
        appointmentId: appt.id,
        publicAppointmentId: appt.publicAppointmentId,
      },
    });

    this.auditService.logEvent({
      event: 'WAITLIST_FULFILLED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `WAITLIST:${entry.id}`,
      action: 'FULFILL_WAITLIST',
      metadata: {
        publicWaitlistId: updated.publicWaitlistId,
        appointmentId: appt.id,
      },
    });

    const doctor = await this.doctorsRepo.findById(updated.doctorId);
    return this.mapToResponseDto(
      updated,
      patient.publicPatientId,
      doctor?.publicDoctorId ?? 'UNKNOWN',
      doctor?.displayName,
      appt.publicAppointmentId,
    );
  }

  /**
   * Patient declines an offered slot from the waitlist.
   */
  public async declineOffer(
    patientUserId: string,
    idOrPublicId: string,
    dto: DeclineOfferDto,
  ): Promise<WaitlistEntryResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(patientUserId);
    const entry = idOrPublicId.startsWith('WTL-')
      ? await this.waitlistRepo.findByPublicId(idOrPublicId)
      : await this.waitlistRepo.findById(idOrPublicId);

    if (!entry) {
      throw new NotFoundError(`Waitlist entry '${idOrPublicId}' not found`);
    }

    if (entry.patientId !== patient.id) {
      throw new ForbiddenError('You are not authorized to decline an offer for another patient');
    }

    if (entry.status !== WaitlistStatus.OFFERED) {
      throw new ConflictError(
        `Waitlist entry is not in OFFERED state (current status: '${entry.status}')`,
      );
    }

    // Release temporary reserved appointment back to AVAILABLE
    let freedStartAt: Date | null = null;
    let freedEndAt: Date | null = null;
    let offerId: string | null = null;

    if (entry.offeredAppointmentId) {
      const appt = await this.appointmentRepo.findAppointmentById(entry.offeredAppointmentId);
      if (appt) {
        freedStartAt = appt.startAt;
        freedEndAt = appt.endAt;
        offerId = appt.consultationOfferId;
      }
      await this.appointmentRepo.updateAppointment(entry.offeredAppointmentId, {
        status: AppointmentStatus.DECLINED,
        reservationState: SlotReservationState.AVAILABLE,
        declineReason: dto.reason ?? 'Waitlist offer declined by patient',
        declinedAt: new Date(),
      });
    }

    const updated = await this.waitlistRepo.updateEntry(entry.id, {
      status: WaitlistStatus.DECLINED,
      declinedAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'WAITLIST_DECLINED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `WAITLIST:${entry.id}`,
      action: 'DECLINE_WAITLIST_OFFER',
      metadata: {
        publicWaitlistId: updated.publicWaitlistId,
        reason: dto.reason,
      },
    });

    // Re-trigger matching for the next candidate in line
    if (freedStartAt && freedEndAt) {
      this.matchAndOfferSlot(entry.doctorId, freedStartAt, freedEndAt, offerId ?? undefined).catch(
        (err) => this.logger.error(`Cascading waitlist match failed: ${err.message}`),
      );
    }

    const doctor = await this.doctorsRepo.findById(updated.doctorId);
    return this.mapToResponseDto(
      updated,
      patient.publicPatientId,
      doctor?.publicDoctorId ?? 'UNKNOWN',
      doctor?.displayName,
      null,
    );
  }

  /**
   * Matches an available slot against the active waitlist queue and offers it to the highest candidate.
   * Concurrency-safe: atomically reserves the slot before transitioning waitlist state.
   */
  public async matchAndOfferSlot(
    doctorId: string,
    startAt: Date,
    endAt: Date,
    consultationOfferId?: string,
  ): Promise<WaitlistEntryEntity | null> {
    // 1. Double-booking / active booking check on the slot
    const overlapping = await this.appointmentRepo.findOverlappingActiveAppointment(
      doctorId,
      startAt,
      endAt,
    );
    if (
      overlapping &&
      overlapping.status !== AppointmentStatus.CANCELLED &&
      overlapping.status !== AppointmentStatus.DECLINED &&
      overlapping.status !== AppointmentStatus.EXPIRED
    ) {
      this.logger.warn(
        `Cannot offer slot: doctor ${doctorId} already has active appointment at ${startAt.toISOString()}`,
      );
      return null;
    }

    // 2. Identify eligible candidates
    const eligible = await this.waitlistRepo.findEligibleEntriesForDoctor(doctorId, startAt, endAt);
    if (eligible.length === 0) {
      return null;
    }

    // Find first candidate without an overlapping active appointment and with a valid consultation offer
    let candidate: WaitlistEntryEntity | null = null;
    let offerToUse: string | null = null;

    for (const entry of eligible) {
      const neededOfferId = consultationOfferId ?? entry.consultationOfferId;
      if (!neededOfferId) continue;

      // Check if patient already has an active overlapping appointment during [startAt, endAt]
      const { data: patientAppts } = await this.appointmentRepo.findAppointments({
        patientId: entry.patientId,
        startDate: startAt,
        endDate: endAt,
      });

      const hasConflict = patientAppts.some(
        (a) =>
          a.status !== AppointmentStatus.CANCELLED &&
          a.status !== AppointmentStatus.DECLINED &&
          a.status !== AppointmentStatus.EXPIRED &&
          a.startAt < endAt &&
          a.endAt > startAt,
      );

      if (!hasConflict) {
        candidate = entry;
        offerToUse = neededOfferId;
        break;
      }
    }

    if (!candidate || !offerToUse) {
      return null;
    }

    // 3. Atomically create temporary reservation (15-30 min hold)
    const holdExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const appointment = await this.appointmentRepo.createAppointment({
      patientId: candidate.patientId,
      doctorId: candidate.doctorId,
      consultationOfferId: offerToUse,
      startAt,
      endAt,
      status: AppointmentStatus.RESERVED,
      reservationState: SlotReservationState.HELD_IN_RESERVATION,
      reservedUntil: holdExpiresAt,
      notes: 'Reserved via Waitlist Allocation',
    });

    // 4. Update waitlist entry to OFFERED
    const updated = await this.waitlistRepo.updateEntry(candidate.id, {
      status: WaitlistStatus.OFFERED,
      offeredAt: new Date(),
      offerExpiresAt: holdExpiresAt,
      offeredAppointmentId: appointment.id,
    });

    this.auditService.logEvent({
      event: 'WAITLIST_OFFERED',
      actorId: 'SYSTEM',
      role: 'SYSTEM',
      resource: `WAITLIST:${candidate.id}`,
      action: 'OFFER_WAITLIST_SLOT',
      metadata: {
        publicWaitlistId: candidate.publicWaitlistId,
        appointmentId: appointment.id,
        publicAppointmentId: appointment.publicAppointmentId,
        offerExpiresAt: holdExpiresAt.toISOString(),
      },
    });

    // 5. Notify patient
    const patient = await this.careRelRepo.findPatientById(candidate.patientId);
    if (patient && this.notificationService) {
      await this.notificationService.send({
        recipientId: patient.userId,
        type: 'WAITLIST_OFFER_CREATED',
        title: 'Appointment Slot Available!',
        message: `An appointment slot on ${startAt.toUTCString()} is now available with Dr. Please accept within 30 minutes to claim it.`,
        metadata: {
          publicWaitlistId: candidate.publicWaitlistId,
          publicAppointmentId: appointment.publicAppointmentId,
          offerExpiresAt: holdExpiresAt.toISOString(),
        },
      });
    }

    return updated;
  }

  /**
   * Scans and expires overdue waitlist offers, releasing held slots and cascading to next candidate.
   */
  public async expireOffers(now: Date = new Date()): Promise<number> {
    const overdue = await this.waitlistRepo.findExpiredOffers(now);
    let expiredCount = 0;

    for (const entry of overdue) {
      await this.waitlistRepo.updateEntry(entry.id, {
        status: WaitlistStatus.EXPIRED,
      });

      let freedStartAt: Date | null = null;
      let freedEndAt: Date | null = null;
      let offerId: string | null = null;

      if (entry.offeredAppointmentId) {
        const appt = await this.appointmentRepo.findAppointmentById(entry.offeredAppointmentId);
        if (appt) {
          freedStartAt = appt.startAt;
          freedEndAt = appt.endAt;
          offerId = appt.consultationOfferId;
        }
        await this.appointmentRepo.updateAppointment(entry.offeredAppointmentId, {
          status: AppointmentStatus.EXPIRED,
          reservationState: SlotReservationState.AVAILABLE,
        });
      }

      this.auditService.logEvent({
        event: 'WAITLIST_EXPIRED',
        actorId: 'SYSTEM',
        role: 'SYSTEM',
        resource: `WAITLIST:${entry.id}`,
        action: 'EXPIRE_WAITLIST_OFFER',
        metadata: { publicWaitlistId: entry.publicWaitlistId },
      });

      expiredCount++;

      // Cascade matching to the next candidate
      if (freedStartAt && freedEndAt) {
        await this.matchAndOfferSlot(
          entry.doctorId,
          freedStartAt,
          freedEndAt,
          offerId ?? undefined,
        );
      }
    }

    return expiredCount;
  }

  /**
   * Retrieves waitlist queue for a doctor practice.
   */
  public async getDoctorWaitlist(
    doctorUserId: string,
    query: WaitlistQueryDto,
  ): Promise<PaginatedWaitlistResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    const { data, total } = await this.waitlistRepo.findEntries({
      doctorId: doctor.id,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    const items = await Promise.all(
      data.map(async (entry) => {
        const patient = await this.careRelRepo.findPatientById(entry.patientId);
        let apptPublicId: string | null = null;
        if (entry.offeredAppointmentId) {
          const appt = await this.appointmentRepo.findAppointmentById(entry.offeredAppointmentId);
          apptPublicId = appt?.publicAppointmentId ?? null;
        }
        return this.mapToResponseDto(
          entry,
          patient?.publicPatientId ?? 'UNKNOWN',
          doctor.publicDoctorId,
          doctor.displayName,
          apptPublicId,
        );
      }),
    );

    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const totalPages = Math.ceil(total / limit) || 1;

    return { data: items, total, page, limit, totalPages };
  }

  /**
   * Fulfills or clears any active waitlist entry for a patient and doctor upon direct booking.
   */
  public async fulfillActiveWaitlistForPatientAndDoctor(
    patientId: string,
    doctorId: string,
  ): Promise<void> {
    const active = await this.waitlistRepo.findActiveByPatientAndDoctor(patientId, doctorId);
    if (active) {
      if (active.status === WaitlistStatus.OFFERED && active.offeredAppointmentId) {
        await this.appointmentRepo.updateAppointment(active.offeredAppointmentId, {
          status: AppointmentStatus.CANCELLED,
          reservationState: SlotReservationState.AVAILABLE,
          cancellationReason: 'Superseded by direct appointment booking',
          cancelledAt: new Date(),
        });
      }
      await this.waitlistRepo.updateEntry(active.id, {
        status: WaitlistStatus.FULFILLED,
        fulfilledAt: new Date(),
      });
      this.auditService.logEvent({
        event: 'WAITLIST_FULFILLED',
        actorId: patientId,
        role: 'PATIENT',
        resource: `WAITLIST:${active.id}`,
        action: 'FULFILL_WAITLIST_DIRECT_BOOKING',
        metadata: { publicWaitlistId: active.publicWaitlistId, doctorId },
      });
    }
  }

  private mapToResponseDto(
    entity: WaitlistEntryEntity,
    publicPatientId: string,
    publicDoctorId: string,
    doctorDisplayName?: string,
    offeredAppointmentPublicId?: string | null,
    queuePosition?: number,
  ): WaitlistEntryResponseDto {
    return {
      id: entity.id,
      publicWaitlistId: entity.publicWaitlistId,
      publicPatientId,
      publicDoctorId,
      doctorDisplayName,
      consultationOfferId: entity.consultationOfferId,
      priority: entity.priority,
      status: entity.status,
      preferredStartDate: entity.preferredStartDate
        ? entity.preferredStartDate.toISOString()
        : null,
      preferredEndDate: entity.preferredEndDate ? entity.preferredEndDate.toISOString() : null,
      notes: entity.notes,
      joinedAt: entity.joinedAt.toISOString(),
      offeredAt: entity.offeredAt ? entity.offeredAt.toISOString() : null,
      offerExpiresAt: entity.offerExpiresAt ? entity.offerExpiresAt.toISOString() : null,
      acceptedAt: entity.acceptedAt ? entity.acceptedAt.toISOString() : null,
      declinedAt: entity.declinedAt ? entity.declinedAt.toISOString() : null,
      fulfilledAt: entity.fulfilledAt ? entity.fulfilledAt.toISOString() : null,
      cancelledAt: entity.cancelledAt ? entity.cancelledAt.toISOString() : null,
      offeredAppointmentPublicId: offeredAppointmentPublicId ?? null,
      queuePosition,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
