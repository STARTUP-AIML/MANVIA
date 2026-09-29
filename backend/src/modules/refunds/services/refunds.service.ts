import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { RefundStatus } from '../enums/refund-status.enum.js';
import {
  REFUND_REPOSITORY,
  type IRefundRepository,
} from '../interfaces/refund-repository.interface.js';
import { REFUND_PROVIDER, type IRefundProvider } from '../interfaces/refund-provider.interface.js';
import {
  REFUND_AUDIT_SERVICE,
  type IRefundAuditService,
} from '../interfaces/refund-audit-service.interface.js';
import {
  NOTIFICATION_SERVICE,
  type INotificationService,
} from '../../../common/notifications/notification.interface.js';
import { generatePublicRefundId } from '../utils/public-refund-id.util.js';
import type { CreateRefundDto } from '../dto/create-refund.dto.js';
import { RefundResponseDto, PaginatedRefundsResponseDto } from '../dto/refund-response.dto.js';
import type { RefundQueryDto } from '../dto/refund-query.dto.js';
import type { RefundEntity } from '../entities/refund.entity.js';
import {
  APPOINTMENT_REPOSITORY,
  type IAppointmentRepository,
} from '../../appointments/interfaces/appointment-repository.interface.js';
import {
  CARE_RELATIONSHIP_REPOSITORY,
  type ICareRelationshipRepository,
} from '../../care-relationships/interfaces/care-relationship-repository.interface.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    @Inject(REFUND_REPOSITORY)
    private readonly refundRepo: IRefundRepository,
    @Inject(REFUND_PROVIDER)
    private readonly refundProvider: IRefundProvider,
    @Inject(REFUND_AUDIT_SERVICE)
    private readonly auditService: IRefundAuditService,
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepo: IAppointmentRepository,
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo: ICareRelationshipRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
    @Optional()
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService?: INotificationService,
  ) {}

  /**
   * Idempotently creates and processes a refund transaction.
   */
  public async createRefund(
    dto: CreateRefundDto,
    actorUserId: string,
    actorRole: string,
  ): Promise<RefundResponseDto> {
    if (dto.amount <= 0) {
      throw new ValidationError('Refund amount must be strictly greater than zero');
    }

    // 1. Idempotency Check
    if (dto.idempotencyKey) {
      const existing = await this.refundRepo.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        this.logger.log(
          `[REFUND_IDEMPOTENT] Existing refund ${existing.publicRefundId} returned for key ${dto.idempotencyKey}`,
        );
        return this.mapToResponseDto(existing);
      }
    }

    // 2. Validate Target Appointment
    const appointment = await this.appointmentRepo.findAppointmentById(dto.appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment '${dto.appointmentId}' not found for refund`);
    }

    const publicRefundId = generatePublicRefundId();

    // 3. Persist Initial Refund Record (REQUESTED)
    const refund = await this.refundRepo.createRefund({
      publicRefundId,
      appointmentId: appointment.id,
      paymentId: dto.paymentId ?? null,
      amount: dto.amount,
      currency: dto.currency ?? 'USD',
      reason: dto.reason.trim(),
      status: RefundStatus.REQUESTED,
      idempotencyKey: dto.idempotencyKey ?? null,
    });

    this.auditService.logEvent({
      event: 'REFUND_REQUESTED',
      actorId: actorUserId,
      role: actorRole,
      resource: `REFUND:${refund.id}`,
      action: 'REQUEST_REFUND',
      metadata: {
        publicRefundId: refund.publicRefundId,
        appointmentId: appointment.id,
        amount: refund.amount,
        currency: refund.currency,
      },
    });

    // 4. Provider Execution (Simulated / Gateway Abstraction)
    try {
      const execResult = await this.refundProvider.executeRefund({
        refundId: refund.id,
        publicRefundId: refund.publicRefundId,
        appointmentId: appointment.id,
        paymentId: refund.paymentId,
        amount: refund.amount,
        currency: refund.currency,
        reason: refund.reason,
      });

      const updated = await this.refundRepo.updateRefund(refund.id, {
        status: execResult.status,
        processedAt: execResult.processedAt,
        providerReference: execResult.providerReference ?? null,
        failureReason: execResult.failureReason ?? null,
      });

      if (execResult.success && execResult.status === RefundStatus.SUCCEEDED) {
        this.auditService.logEvent({
          event: 'REFUND_SUCCEEDED',
          actorId: actorUserId,
          role: actorRole,
          resource: `REFUND:${refund.id}`,
          action: 'PROCESS_REFUND_SUCCESS',
          metadata: {
            publicRefundId: refund.publicRefundId,
            providerReference: execResult.providerReference,
          },
        });

        // Notify patient of processed refund
        const patient = await this.careRelRepo.findPatientById(appointment.patientId);
        if (patient && this.notificationService) {
          await this.notificationService.send({
            recipientId: patient.userId,
            type: 'REFUND_PROCESSED',
            title: 'Refund Processed',
            message: `Your refund of ${refund.amount} ${refund.currency} has been processed successfully.`,
            metadata: {
              publicRefundId: refund.publicRefundId,
              publicAppointmentId: appointment.publicAppointmentId,
              amount: refund.amount,
            },
          });
        }
      } else {
        this.auditService.logEvent({
          event: 'REFUND_FAILED',
          actorId: actorUserId,
          role: actorRole,
          resource: `REFUND:${refund.id}`,
          action: 'PROCESS_REFUND_FAILURE',
          metadata: {
            publicRefundId: refund.publicRefundId,
            failureReason: execResult.failureReason,
          },
        });
      }

      return this.mapToResponseDto(updated);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown provider error';
      const updated = await this.refundRepo.updateRefund(refund.id, {
        status: RefundStatus.FAILED,
        failureReason: errorMessage,
        processedAt: new Date(),
      });

      this.auditService.logEvent({
        event: 'REFUND_FAILED',
        actorId: actorUserId,
        role: actorRole,
        resource: `REFUND:${refund.id}`,
        action: 'PROCESS_REFUND_ERROR',
        metadata: {
          publicRefundId: refund.publicRefundId,
          error: errorMessage,
        },
      });

      return this.mapToResponseDto(updated);
    }
  }

  /**
   * Retrieves a refund with strict authorization controls.
   */
  public async getRefundById(
    userContext: CurrentUserContext,
    idOrPublicId: string,
  ): Promise<RefundResponseDto> {
    const refund = idOrPublicId.startsWith('REF-')
      ? await this.refundRepo.findByPublicId(idOrPublicId)
      : await this.refundRepo.findById(idOrPublicId);

    if (!refund) {
      throw new NotFoundError(`Refund '${idOrPublicId}' not found`);
    }

    const appointment = await this.appointmentRepo.findAppointmentById(refund.appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Associated appointment for refund '${idOrPublicId}' not found`);
    }

    // Role-based Access Check
    if (userContext.activeRole === 'ADMIN') {
      // Admins have platform-wide access
    } else if (userContext.activeRole === 'PATIENT') {
      const patient = await this.careRelRepo.findPatientByUserId(userContext.userId);
      if (!patient || patient.id !== appointment.patientId) {
        throw new ForbiddenError('You are not authorized to view another patient’s refund');
      }
    } else if (userContext.activeRole === 'DOCTOR') {
      const doctor = await this.doctorsRepo.findByUserId(userContext.userId);
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenError(
          'You are not authorized to view a refund for an unassigned appointment',
        );
      }
    } else {
      throw new ForbiddenError('Access denied: unpermitted role for refund access');
    }

    this.auditService.logEvent({
      event: 'REFUND_ACCESSED',
      actorId: userContext.userId,
      role: userContext.activeRole,
      resource: `REFUND:${refund.id}`,
      action: 'VIEW_REFUND',
      metadata: { publicRefundId: refund.publicRefundId },
    });

    return this.mapToResponseDto(refund);
  }

  /**
   * Retrieves refunds for an appointment.
   */
  public async getRefundsForAppointment(appointmentId: string): Promise<RefundResponseDto[]> {
    const list = await this.refundRepo.findByAppointmentId(appointmentId);
    return list.map((r) => this.mapToResponseDto(r));
  }

  /**
   * Lists paginated refunds for the authenticated patient.
   */
  public async getPatientRefunds(
    patientUserId: string,
    query: RefundQueryDto,
  ): Promise<PaginatedRefundsResponseDto> {
    const patient = await this.careRelRepo.findPatientByUserId(patientUserId);
    if (!patient) {
      return { data: [], total: 0, page: query.page, limit: query.limit, totalPages: 1 };
    }

    const patientAppts = await this.appointmentRepo.findAppointments({
      patientId: patient.id,
      limit: 1000,
    });

    const apptIds = new Set(patientAppts.data.map((a) => a.id));

    const { data: allRefunds } = await this.refundRepo.findRefunds({
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    // Filter to patient's appointments
    const filtered = allRefunds.filter((r) => apptIds.has(r.appointmentId));
    const totalPages = Math.ceil(filtered.length / query.limit) || 1;

    return {
      data: filtered.map((r) => this.mapToResponseDto(r)),
      total: filtered.length,
      page: query.page,
      limit: query.limit,
      totalPages,
    };
  }

  private mapToResponseDto(entity: RefundEntity): RefundResponseDto {
    return {
      id: entity.id,
      publicRefundId: entity.publicRefundId,
      appointmentId: entity.appointmentId,
      paymentId: entity.paymentId,
      amount: entity.amount,
      currency: entity.currency,
      reason: entity.reason,
      status: entity.status,
      idempotencyKey: entity.idempotencyKey,
      requestedAt: entity.requestedAt.toISOString(),
      processedAt: entity.processedAt ? entity.processedAt.toISOString() : null,
      failureReason: entity.failureReason,
      providerReference: entity.providerReference,
      metadata: entity.metadata ? JSON.parse(entity.metadata) : null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
