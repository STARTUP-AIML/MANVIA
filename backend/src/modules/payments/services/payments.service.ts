import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PAYMENT_REPOSITORY,
  type IPaymentRepository,
  type FindPaymentsQuery,
} from '../interfaces/payment-repository.interface.js';
import {
  PAYMENT_PROVIDER,
  type IPaymentProvider,
} from '../interfaces/payment-provider.interface.js';
import {
  PAYMENT_AUDIT_SERVICE,
  type IPaymentAuditService,
} from '../interfaces/payment-audit-service.interface.js';
import {
  APPOINTMENT_REPOSITORY,
  type IAppointmentRepository,
} from '../../appointments/interfaces/appointment-repository.interface.js';
import {
  DOCTOR_AVAILABILITY_REPOSITORY,
  type IDoctorAvailabilityRepository,
} from '../../doctor-availability/interfaces/availability-repository.interface.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';
import {
  CARE_RELATIONSHIP_REPOSITORY,
  type ICareRelationshipRepository,
} from '../../care-relationships/interfaces/care-relationship-repository.interface.js';
import { InvoiceService } from './invoice.service.js';
import { PricingService } from './pricing.service.js';
import { DoctorPayoutService } from './doctor-payout.service.js';
import { PaymentEntity } from '../entities/payment.entity.js';
import { PaymentAttemptEntity } from '../entities/payment-attempt.entity.js';
import { FinancialTransactionEntity } from '../entities/financial-transaction.entity.js';
import { PaymentStatus } from '../enums/payment-status.enum.js';
import { PaymentAttemptStatus } from '../enums/payment-attempt-status.enum.js';
import { FinancialTransactionType } from '../enums/financial-transaction-type.enum.js';
import { TransactionDirection } from '../enums/transaction-direction.enum.js';
import { IdGeneratorUtil } from '../utils/id-generator.util.js';
import { CurrencyUtil } from '../utils/currency.util.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import type { CreatePaymentDto } from '../dto/create-payment.dto.js';
import type { VerifyPaymentDto } from '../dto/verify-payment.dto.js';
import type { PaymentQueryDto } from '../dto/payment-query.dto.js';
import { PaymentResponseDto, PaymentAttemptResponseDto } from '../dto/payment-response.dto.js';
import type { IEventBus } from '../../../events/event-bus.interface.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  public constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepo: IPaymentRepository,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: IPaymentProvider,
    @Inject(PAYMENT_AUDIT_SERVICE)
    private readonly auditService: IPaymentAuditService,
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly invoiceService: InvoiceService,
    private readonly pricingService: PricingService,
    private readonly payoutService: DoctorPayoutService,
    @Optional()
    @Inject(DOCTOR_AVAILABILITY_REPOSITORY)
    private readonly availabilityRepo?: IDoctorAvailabilityRepository,
    @Optional()
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo?: IDoctorsRepository,
    @Optional()
    @Inject('EVENT_BUS')
    private readonly eventBus?: IEventBus,
    @Optional()
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo?: ICareRelationshipRepository,
  ) {}

  /**
   * Initiates payment creation and provider session.
   * Client-supplied amount is strictly ignored; amount is derived server-side.
   */
  public async createPayment(
    dto: CreatePaymentDto,
    actor: CurrentUserContext,
  ): Promise<PaymentResponseDto> {
    // 1. Idempotency Check
    if (dto.idempotencyKey) {
      const existing = await this.paymentRepo.findPaymentByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        this.logger.log(
          `[PAYMENT_IDEMPOTENT] Existing payment ${existing.publicPaymentId} returned for key ${dto.idempotencyKey}`,
        );
        const attempts = await this.paymentRepo.findAttemptsByPaymentId(existing.id);
        const dtoWithAttempts = PaymentResponseDto.fromEntity(existing);
        dtoWithAttempts.attempts = attempts.map((a) => PaymentAttemptResponseDto.fromEntity(a));
        return dtoWithAttempts;
      }
    }

    // 2. Fetch and validate Appointment
    const appointment = await this.appointmentRepo.findAppointmentById(dto.appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment '${dto.appointmentId}' not found`);
    }

    // 3. Authorization: Only the patient or admin may initiate payment
    if (
      actor.activeRole === 'PATIENT' &&
      !(await this.isPatientAuthorized(actor.userId, appointment.patientId))
    ) {
      throw new ForbiddenError('Patients are only authorized to pay for their own appointments');
    }

    // 4. Duplicate Payment Prevention: check existing payments for this appointment
    const existingPayment = await this.paymentRepo.findPaymentByAppointmentId(appointment.id);
    if (existingPayment) {
      if (existingPayment.status === PaymentStatus.SUCCEEDED) {
        throw new ConflictError('Appointment has already been paid in full');
      }
      // If already pending, reuse existing payment with a new attempt
      if (existingPayment.status === PaymentStatus.PENDING) {
        this.logger.log(
          `Appointment ${appointment.id} already has a pending payment ${existingPayment.publicPaymentId}`,
        );
        const attempts = await this.paymentRepo.findAttemptsByPaymentId(existingPayment.id);
        const dtoWithAttempts = PaymentResponseDto.fromEntity(existingPayment);
        dtoWithAttempts.attempts = attempts.map((a) => PaymentAttemptResponseDto.fromEntity(a));
        return dtoWithAttempts;
      }
    }

    // 5. Derive Amount Server-Side (Do NOT trust client)
    let derivedAmount = '100.00';
    let derivedCurrency = 'USD';

    if (appointment.consultationOfferId && this.availabilityRepo) {
      const offer = await this.availabilityRepo.findOfferById(appointment.consultationOfferId);
      if (offer && offer.fee > 0) {
        derivedAmount = CurrencyUtil.toDecimalString(CurrencyUtil.toMinorUnits(offer.fee));
        derivedCurrency = offer.currency || 'USD';
      }
    } else if (appointment.doctorId && this.doctorsRepo) {
      const doctor = await this.doctorsRepo.findById(appointment.doctorId);
      if (doctor && doctor.defaultConsultationFee && doctor.defaultConsultationFee > 0) {
        derivedAmount = CurrencyUtil.toDecimalString(
          CurrencyUtil.toMinorUnits(doctor.defaultConsultationFee),
        );
        derivedCurrency = doctor.currency || 'USD';
      }
    }

    // 6. Create internal Payment entity
    const paymentId = randomUUID();
    const publicPaymentId = IdGeneratorUtil.generatePublicPaymentId();

    const payment = new PaymentEntity({
      id: paymentId,
      publicPaymentId,
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      consultationOfferId: appointment.consultationOfferId ?? null,
      amount: derivedAmount,
      currency: derivedCurrency,
      status: PaymentStatus.PENDING,
      provider: dto.provider || this.paymentProvider.providerName,
      idempotencyKey: dto.idempotencyKey ?? null,
      metadata: dto.metadata ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 7. Request payment session from provider adapter
    const session = await this.paymentProvider.createPaymentSession({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      metadata: dto.metadata ?? undefined,
    });

    payment.setProviderPaymentId(session.providerPaymentId);

    // 8. Create Payment Attempt Record
    const attempt = new PaymentAttemptEntity({
      id: randomUUID(),
      publicAttemptId: IdGeneratorUtil.generatePublicAttemptId(),
      paymentId: payment.id,
      attemptNumber: 1,
      provider: payment.provider,
      providerAttemptId: session.providerPaymentId,
      amount: payment.amount,
      currency: payment.currency,
      status: PaymentAttemptStatus.INITIATED,
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 9. Persist in database
    const savedPayment = await this.paymentRepo.savePayment(payment);
    const savedAttempt = await this.paymentRepo.saveAttempt(attempt);

    // 10. Audit logging
    this.auditService.logEvent({
      event: 'PAYMENT_INITIATED',
      actorId: actor.userId,
      role: actor.activeRole,
      resource: 'Payment',
      resourceId: savedPayment.publicPaymentId,
      action: 'CREATE_PAYMENT',
      status: 'SUCCESS',
      metadata: {
        appointmentId: appointment.id,
        amount: savedPayment.amount,
        currency: savedPayment.currency,
        provider: savedPayment.provider,
        providerPaymentId: session.providerPaymentId,
      },
    });

    const response = PaymentResponseDto.fromEntity(savedPayment, {
      checkoutUrl: session.checkoutUrl ?? undefined,
      clientSecret: session.clientSecret ?? undefined,
    });
    response.attempts = [PaymentAttemptResponseDto.fromEntity(savedAttempt)];
    return response;
  }

  /**
   * Verifies payment completion via trusted server-side provider check.
   */
  public async verifyPayment(
    identifier: string,
    dto: VerifyPaymentDto,
    actor: CurrentUserContext,
  ): Promise<PaymentResponseDto> {
    const payment =
      (await this.paymentRepo.findPaymentById(identifier)) ??
      (await this.paymentRepo.findPaymentByPublicId(identifier));

    if (!payment) {
      throw new NotFoundError(`Payment '${identifier}' not found`);
    }

    // Authorization
    if (
      actor.activeRole === 'PATIENT' &&
      !(await this.isPatientAuthorized(actor.userId, payment.patientId))
    ) {
      throw new ForbiddenError('Patients are only authorized to verify their own payments');
    }

    // If already succeeded, return immediately (idempotent)
    if (payment.status === PaymentStatus.SUCCEEDED) {
      const attempts = await this.paymentRepo.findAttemptsByPaymentId(payment.id);
      const res = PaymentResponseDto.fromEntity(payment);
      res.attempts = attempts.map((a) => PaymentAttemptResponseDto.fromEntity(a));
      return res;
    }

    // Execute server-side verification with provider
    const verification = await this.paymentProvider.verifyPayment({
      paymentId: payment.id,
      providerPaymentId: dto.providerPaymentId,
      signature: dto.signature ?? undefined,
      rawPayload: dto.rawPayload ?? undefined,
    });

    const attempts = await this.paymentRepo.findAttemptsByPaymentId(payment.id);
    const latestAttempt = attempts[attempts.length - 1];

    if (!verification.verified || verification.status === 'FAILED') {
      if (latestAttempt) {
        latestAttempt.markFailed('VERIFICATION_FAILED', verification.failureReason);
        await this.paymentRepo.saveAttempt(latestAttempt);
      }
      payment.markFailed(verification.failureReason || 'Provider verification failed');
      await this.paymentRepo.savePayment(payment);

      this.auditService.logEvent({
        event: 'PAYMENT_VERIFICATION_FAILED',
        actorId: actor.userId,
        role: actor.activeRole,
        resource: 'Payment',
        resourceId: payment.publicPaymentId,
        action: 'VERIFY_PAYMENT',
        status: 'FAILURE',
        metadata: { failureReason: verification.failureReason },
      });

      throw new ValidationError(
        `Payment verification failed: ${verification.failureReason || 'Provider rejected verification'}`,
      );
    }

    // Success path
    if (latestAttempt) {
      latestAttempt.markSucceeded(dto.providerPaymentId);
      await this.paymentRepo.saveAttempt(latestAttempt);
    }

    payment.markSucceeded(dto.providerPaymentId, new Date());
    const updatedPayment = await this.paymentRepo.savePayment(payment);

    // Calculate Pricing Breakdown
    const breakdown = await this.pricingService.calculateBreakdown({
      baseAmount: updatedPayment.amount,
      currency: updatedPayment.currency,
      doctorId: updatedPayment.doctorId,
      patientId: updatedPayment.patientId,
    });

    // Generate Finalized Immutable Invoice
    await this.invoiceService.generateInvoice({
      payment: updatedPayment,
      appointmentId: updatedPayment.appointmentId,
      patientId: updatedPayment.patientId,
      doctorId: updatedPayment.doctorId,
      breakdown,
    });

    // Create Pending Doctor Payout Record
    await this.payoutService.createPendingPayout({
      payment: updatedPayment,
      breakdown,
    });

    // Append to Financial Ledger
    const ledgerTx = new FinancialTransactionEntity({
      id: randomUUID(),
      publicTransactionId: IdGeneratorUtil.generatePublicTransactionId(),
      type: FinancialTransactionType.PAYMENT,
      direction: TransactionDirection.CREDIT,
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
      paymentId: updatedPayment.id,
      reference: dto.providerPaymentId,
      status: 'POSTED',
      occurredAt: new Date(),
      createdAt: new Date(),
    });
    await this.paymentRepo.saveTransaction(ledgerTx);

    // Domain Event for Phase 18
    if (this.eventBus) {
      await this.eventBus.publish({
        eventId: randomUUID(),
        eventType: 'PAYMENT_SUCCEEDED',
        aggregateId: updatedPayment.id,
        occurredAt: new Date(),
        payload: {
          paymentId: updatedPayment.id,
          publicPaymentId: updatedPayment.publicPaymentId,
          patientId: updatedPayment.patientId,
          doctorId: updatedPayment.doctorId,
          appointmentId: updatedPayment.appointmentId,
          amount: updatedPayment.amount,
          currency: updatedPayment.currency,
        },
      });
    }

    // Audit Logging
    this.auditService.logEvent({
      event: 'PAYMENT_VERIFIED',
      actorId: actor.userId,
      role: actor.activeRole,
      resource: 'Payment',
      resourceId: updatedPayment.publicPaymentId,
      action: 'VERIFY_PAYMENT',
      status: 'SUCCESS',
      metadata: {
        providerPaymentId: dto.providerPaymentId,
        amount: updatedPayment.amount,
      },
    });

    const refreshedAttempts = await this.paymentRepo.findAttemptsByPaymentId(updatedPayment.id);
    const result = PaymentResponseDto.fromEntity(updatedPayment);
    result.attempts = refreshedAttempts.map((a) => PaymentAttemptResponseDto.fromEntity(a));
    return result;
  }

  public async getPaymentById(
    identifier: string,
    actor: CurrentUserContext,
  ): Promise<PaymentResponseDto> {
    const payment =
      (await this.paymentRepo.findPaymentById(identifier)) ??
      (await this.paymentRepo.findPaymentByPublicId(identifier));

    if (!payment) {
      throw new NotFoundError(`Payment '${identifier}' not found`);
    }

    if (
      actor.activeRole === 'PATIENT' &&
      !(await this.isPatientAuthorized(actor.userId, payment.patientId))
    ) {
      throw new ForbiddenError('Patients are only authorized to access their own payments');
    } else if (
      actor.activeRole === 'DOCTOR' &&
      !(await this.isDoctorAuthorized(actor.userId, payment.doctorId))
    ) {
      throw new ForbiddenError(
        'Doctors are only authorized to access payments for their consultations',
      );
    }

    const attempts = await this.paymentRepo.findAttemptsByPaymentId(payment.id);
    const dto = PaymentResponseDto.fromEntity(payment);
    dto.attempts = attempts.map((a) => PaymentAttemptResponseDto.fromEntity(a));
    return dto;
  }

  public async getPaymentAttempts(
    identifier: string,
    actor: CurrentUserContext,
  ): Promise<PaymentAttemptResponseDto[]> {
    const payment =
      (await this.paymentRepo.findPaymentById(identifier)) ??
      (await this.paymentRepo.findPaymentByPublicId(identifier));

    if (!payment) {
      throw new NotFoundError(`Payment '${identifier}' not found`);
    }

    if (
      actor.activeRole === 'PATIENT' &&
      !(await this.isPatientAuthorized(actor.userId, payment.patientId))
    ) {
      throw new ForbiddenError('Patients are only authorized to access their own payment attempts');
    } else if (
      actor.activeRole === 'DOCTOR' &&
      !(await this.isDoctorAuthorized(actor.userId, payment.doctorId))
    ) {
      throw new ForbiddenError(
        'Doctors are only authorized to access payment attempts for their consultations',
      );
    }

    const attempts = await this.paymentRepo.findAttemptsByPaymentId(payment.id);
    return attempts.map((a) => PaymentAttemptResponseDto.fromEntity(a));
  }

  public async getPayments(
    query: PaymentQueryDto,
    actor: CurrentUserContext,
  ): Promise<{ items: PaymentResponseDto[]; total: number }> {
    const scopedQuery: FindPaymentsQuery = { ...query };

    if (actor.activeRole === 'PATIENT') {
      scopedQuery.patientId = await this.resolvePatientId(actor.userId);
    } else if (actor.activeRole === 'DOCTOR') {
      scopedQuery.doctorId = await this.resolveDoctorId(actor.userId);
    }

    const { items, total } = await this.paymentRepo.findPayments(scopedQuery);
    return {
      items: items.map((p) => PaymentResponseDto.fromEntity(p)),
      total,
    };
  }

  /**
   * Dispatches provider refund for Phase 14 refund records.
   */
  public async executeRefund(
    paymentIdentifier: string,
    refundId: string,
    amount: string,
    reason?: string,
  ) {
    const payment =
      (await this.paymentRepo.findPaymentById(paymentIdentifier)) ??
      (await this.paymentRepo.findPaymentByPublicId(paymentIdentifier));

    if (!payment || !payment.providerPaymentId) {
      throw new NotFoundError(
        `Payment '${paymentIdentifier}' with active provider reference not found`,
      );
    }

    const result = await this.paymentProvider.refundPayment({
      paymentId: payment.id,
      providerPaymentId: payment.providerPaymentId,
      refundId,
      amount,
      currency: payment.currency,
      reason: reason ?? undefined,
    });

    if (result.status === 'SUCCEEDED') {
      const ledgerTx = new FinancialTransactionEntity({
        id: randomUUID(),
        publicTransactionId: IdGeneratorUtil.generatePublicTransactionId(),
        type: FinancialTransactionType.REFUND,
        direction: TransactionDirection.DEBIT,
        amount,
        currency: payment.currency,
        paymentId: payment.id,
        refundId,
        reference: result.providerRefundId,
        status: 'POSTED',
        occurredAt: new Date(),
        createdAt: new Date(),
      });
      await this.paymentRepo.saveTransaction(ledgerTx);
    }

    return result;
  }

  private async isPatientAuthorized(
    actorUserId: string,
    targetPatientId: string,
  ): Promise<boolean> {
    if (targetPatientId === actorUserId) return true;
    if (this.careRelRepo) {
      const patient = await this.careRelRepo.findPatientByUserId(actorUserId);
      if (
        patient &&
        (patient.id === targetPatientId || patient.publicPatientId === targetPatientId)
      ) {
        return true;
      }
    }
    return false;
  }

  private async isDoctorAuthorized(actorUserId: string, targetDoctorId: string): Promise<boolean> {
    if (targetDoctorId === actorUserId) return true;
    if (this.doctorsRepo) {
      const doctor = await this.doctorsRepo.findByUserId(actorUserId);
      if (doctor && (doctor.id === targetDoctorId || doctor.publicDoctorId === targetDoctorId)) {
        return true;
      }
    }
    return false;
  }

  private async resolvePatientId(actorUserId: string): Promise<string> {
    if (this.careRelRepo) {
      const patient = await this.careRelRepo.findPatientByUserId(actorUserId);
      if (patient) return patient.id;
    }
    return actorUserId;
  }

  private async resolveDoctorId(actorUserId: string): Promise<string> {
    if (this.doctorsRepo) {
      const doctor = await this.doctorsRepo.findByUserId(actorUserId);
      if (doctor) return doctor.id;
    }
    return actorUserId;
  }
}
