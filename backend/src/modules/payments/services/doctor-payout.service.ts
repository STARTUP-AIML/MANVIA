import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PAYMENT_REPOSITORY,
  type IPaymentRepository,
  type FindPayoutsQuery,
} from '../interfaces/payment-repository.interface.js';
import { PAYOUT_PROVIDER, type IPayoutProvider } from '../interfaces/payout-provider.interface.js';
import {
  PAYMENT_AUDIT_SERVICE,
  type IPaymentAuditService,
} from '../interfaces/payment-audit-service.interface.js';
import { PayoutEligibilityService } from './payout-eligibility.service.js';
import { DoctorPayoutEntity } from '../entities/doctor-payout.entity.js';
import { DoctorPayoutStatus } from '../enums/doctor-payout-status.enum.js';
import { FinancialTransactionType } from '../enums/financial-transaction-type.enum.js';
import { TransactionDirection } from '../enums/transaction-direction.enum.js';
import { FinancialTransactionEntity } from '../entities/financial-transaction.entity.js';
import { IdGeneratorUtil } from '../utils/id-generator.util.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import type { PaymentEntity } from '../entities/payment.entity.js';
import type { PricingBreakdown } from '../entities/pricing-breakdown.entity.js';
import { randomUUID } from 'crypto';

export interface InitializeDoctorPayoutParams {
  payment: PaymentEntity;
  breakdown: PricingBreakdown;
}

@Injectable()
export class DoctorPayoutService {
  private readonly logger = new Logger(DoctorPayoutService.name);

  public constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly repository: IPaymentRepository,
    @Inject(PAYOUT_PROVIDER)
    private readonly payoutProvider: IPayoutProvider,
    @Inject(PAYMENT_AUDIT_SERVICE)
    private readonly auditService: IPaymentAuditService,
    private readonly eligibilityService: PayoutEligibilityService,
  ) {}

  /**
   * Initializes a pending payout record linked to a payment.
   */
  public async createPendingPayout(
    params: InitializeDoctorPayoutParams,
  ): Promise<DoctorPayoutEntity> {
    const existing = await this.repository.findPayoutByAppointmentId(params.payment.appointmentId);
    if (existing) {
      return existing;
    }

    this.logger.log(
      `Creating pending payout for doctor ${params.payment.doctorId} linked to payment ${params.payment.publicPaymentId}`,
    );

    const payout = new DoctorPayoutEntity({
      id: randomUUID(),
      publicPayoutId: IdGeneratorUtil.generatePublicPayoutId(),
      doctorId: params.payment.doctorId,
      appointmentId: params.payment.appointmentId,
      paymentId: params.payment.id,
      grossAmount: params.breakdown.baseAmount,
      platformFee: params.breakdown.platformFee,
      taxWithheld: params.breakdown.tax,
      providerFee: params.breakdown.providerFee,
      netAmount: params.breakdown.doctorShare,
      currency: params.payment.currency,
      status: DoctorPayoutStatus.PENDING,
      provider: this.payoutProvider.providerName,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.repository.savePayout(payout);

    this.auditService.logEvent({
      event: 'PAYOUT_CREATED',
      resource: 'DoctorPayout',
      resourceId: saved.publicPayoutId,
      action: 'CREATE_PAYOUT',
      status: 'SUCCESS',
      metadata: {
        doctorId: saved.doctorId,
        grossAmount: saved.grossAmount,
        netAmount: saved.netAmount,
      },
    });

    return saved;
  }

  /**
   * Checks conditions and transitions payout to ELIGIBLE.
   */
  public async checkAndMarkEligible(
    appointmentId: string,
    appointmentStatus: string,
    doctorVerified: boolean = true,
  ): Promise<DoctorPayoutEntity | null> {
    const payout = await this.repository.findPayoutByAppointmentId(appointmentId);
    if (!payout) {
      return null;
    }

    if (payout.status !== DoctorPayoutStatus.PENDING) {
      return payout;
    }

    const payment = await this.repository.findPaymentById(payout.paymentId);
    if (!payment) {
      return payout;
    }

    const evaluation = this.eligibilityService.evaluateEligibility({
      payment,
      appointmentStatus,
      doctorVerificationStatus: doctorVerified ? 'VERIFIED' : 'UNVERIFIED',
    });

    if (evaluation.isEligible) {
      payout.markEligible();
      const updated = await this.repository.savePayout(payout);

      this.auditService.logEvent({
        event: 'PAYOUT_ELIGIBLE',
        resource: 'DoctorPayout',
        resourceId: updated.publicPayoutId,
        action: 'MARK_PAYOUT_ELIGIBLE',
        status: 'SUCCESS',
        metadata: { appointmentId },
      });

      return updated;
    }

    return payout;
  }

  /**
   * Dispatches payout through the payout provider.
   */
  public async processPayout(
    identifier: string,
    actor: CurrentUserContext,
  ): Promise<DoctorPayoutEntity> {
    if (actor.activeRole !== 'ADMIN') {
      throw new ForbiddenError('Only administrative staff can trigger doctor payouts');
    }

    const payout =
      (await this.repository.findPayoutById(identifier)) ??
      (await this.repository.findPayoutByPublicId(identifier));

    if (!payout) {
      throw new NotFoundError(`Payout ${identifier} not found`);
    }

    if (payout.status === DoctorPayoutStatus.PAID) {
      return payout;
    }

    if (
      payout.status !== DoctorPayoutStatus.ELIGIBLE &&
      payout.status !== DoctorPayoutStatus.PENDING
    ) {
      throw new ConflictError(`Cannot process payout in status ${payout.status}`);
    }

    payout.markProcessing(this.payoutProvider.providerName);
    await this.repository.savePayout(payout);

    try {
      const result = await this.payoutProvider.createPayout({
        payoutId: payout.id,
        doctorId: payout.doctorId,
        amount: payout.netAmount,
        currency: payout.currency,
        appointmentId: payout.appointmentId,
      });

      if (result.status === 'PAID') {
        payout.markPaid(result.providerPayoutId);

        // Record financial ledger transaction (debit from platform to doctor)
        const ledgerTx = new FinancialTransactionEntity({
          id: randomUUID(),
          publicTransactionId: IdGeneratorUtil.generatePublicTransactionId(),
          type: FinancialTransactionType.PAYOUT,
          direction: TransactionDirection.DEBIT,
          amount: payout.netAmount,
          currency: payout.currency,
          paymentId: payout.paymentId,
          payoutId: payout.id,
          reference: result.providerPayoutId,
          status: 'POSTED',
          occurredAt: new Date(),
          createdAt: new Date(),
        });
        await this.repository.saveTransaction(ledgerTx);
      } else if (result.status === 'FAILED') {
        payout.markFailed(result.failureReason || 'Payout provider rejected transaction');
      }

      const updated = await this.repository.savePayout(payout);

      this.auditService.logEvent({
        event: result.status === 'PAID' ? 'PAYOUT_PROCESSED' : 'PAYOUT_FAILED',
        actorId: actor.userId,
        role: actor.activeRole,
        resource: 'DoctorPayout',
        resourceId: updated.publicPayoutId,
        action: 'EXECUTE_PAYOUT',
        status: result.status === 'PAID' ? 'SUCCESS' : 'FAILURE',
        metadata: {
          providerPayoutId: result.providerPayoutId,
          netAmount: updated.netAmount,
          status: updated.status,
        },
      });

      return updated;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown provider error';
      payout.markFailed(errorMessage);
      await this.repository.savePayout(payout);

      this.auditService.logEvent({
        event: 'PAYOUT_FAILED',
        actorId: actor.userId,
        role: actor.activeRole,
        resource: 'DoctorPayout',
        resourceId: payout.publicPayoutId,
        action: 'EXECUTE_PAYOUT',
        status: 'FAILURE',
        metadata: { error: errorMessage },
      });

      throw err;
    }
  }

  public async getPayoutById(
    identifier: string,
    actor: CurrentUserContext,
  ): Promise<DoctorPayoutEntity> {
    const payout =
      (await this.repository.findPayoutById(identifier)) ??
      (await this.repository.findPayoutByPublicId(identifier));

    if (!payout) {
      throw new NotFoundError(`Payout ${identifier} not found`);
    }

    if (actor.activeRole === 'DOCTOR' && payout.doctorId !== actor.userId) {
      throw new ForbiddenError('Doctors can only view their own payouts');
    } else if (actor.activeRole === 'PATIENT') {
      throw new ForbiddenError('Patients are not authorized to view doctor payouts');
    }

    return payout;
  }

  public async getPayouts(
    query: FindPayoutsQuery,
    actor: CurrentUserContext,
  ): Promise<{ items: DoctorPayoutEntity[]; total: number }> {
    const scopedQuery: FindPayoutsQuery = { ...query };

    if (actor.activeRole === 'DOCTOR') {
      scopedQuery.doctorId = actor.userId;
    } else if (actor.activeRole === 'PATIENT') {
      throw new ForbiddenError('Patients are not authorized to view doctor payouts');
    }

    return this.repository.findPayouts(scopedQuery);
  }
}
