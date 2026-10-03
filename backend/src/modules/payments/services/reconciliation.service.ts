import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PAYMENT_REPOSITORY,
  type IPaymentRepository,
} from '../interfaces/payment-repository.interface.js';
import {
  PAYMENT_PROVIDER,
  type IPaymentProvider,
} from '../interfaces/payment-provider.interface.js';
import { PAYOUT_PROVIDER, type IPayoutProvider } from '../interfaces/payout-provider.interface.js';
import {
  PAYMENT_AUDIT_SERVICE,
  type IPaymentAuditService,
} from '../interfaces/payment-audit-service.interface.js';
import type {
  ReconciliationDiscrepancy,
  ReconciliationSummaryDto,
} from '../dto/reconciliation-response.dto.js';
import { PaymentStatus } from '../enums/payment-status.enum.js';
import { DoctorPayoutStatus } from '../enums/doctor-payout-status.enum.js';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  public constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly repository: IPaymentRepository,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: IPaymentProvider,
    @Inject(PAYOUT_PROVIDER)
    private readonly payoutProvider: IPayoutProvider,
    @Inject(PAYMENT_AUDIT_SERVICE)
    private readonly auditService: IPaymentAuditService,
  ) {}

  /**
   * Reconciles all pending and processing payments against the provider.
   */
  public async reconcilePayments(): Promise<ReconciliationSummaryDto> {
    const { items: pendingPayments } = await this.repository.findPayments({
      limit: 100,
    });

    const discrepancies: ReconciliationDiscrepancy[] = [];
    let matchedCount = 0;

    for (const payment of pendingPayments) {
      if (!payment.providerPaymentId) {
        continue;
      }

      try {
        const providerRecord = await this.paymentProvider.fetchPayment(payment.providerPaymentId);

        if (!providerRecord.verified) {
          discrepancies.push({
            entityType: 'PAYMENT',
            internalId: payment.id,
            publicId: payment.publicPaymentId,
            providerPaymentId: payment.providerPaymentId,
            internalStatus: payment.status,
            providerStatus: 'NOT_FOUND',
            internalAmount: payment.amount,
            discrepancyType: 'MISSING_IN_PROVIDER',
            details: providerRecord.failureReason ?? undefined,
          });
          continue;
        }

        // Compare status
        const isStatusAligned =
          (payment.status === PaymentStatus.SUCCEEDED && providerRecord.status === 'SUCCEEDED') ||
          (payment.status === PaymentStatus.PENDING && providerRecord.status === 'PENDING') ||
          (payment.status === PaymentStatus.FAILED && providerRecord.status === 'FAILED');

        if (!isStatusAligned) {
          discrepancies.push({
            entityType: 'PAYMENT',
            internalId: payment.id,
            publicId: payment.publicPaymentId,
            providerPaymentId: payment.providerPaymentId,
            internalStatus: payment.status,
            providerStatus: providerRecord.status,
            internalAmount: payment.amount,
            providerAmount: providerRecord.amount ?? undefined,
            discrepancyType: 'STATUS_MISMATCH',
            details: `Internal status is ${payment.status} but provider status is ${providerRecord.status}`,
          });
        } else {
          matchedCount++;
        }
      } catch (err: unknown) {
        this.logger.error(`Error querying provider for payment ${payment.publicPaymentId}`, err);
      }
    }

    this.auditService.logEvent({
      event: 'RECONCILIATION_RUN',
      resource: 'PaymentReconciliation',
      action: 'RUN_RECONCILIATION',
      status: 'SUCCESS',
      metadata: {
        totalChecked: pendingPayments.length,
        discrepanciesCount: discrepancies.length,
        matchedCount,
      },
    });

    return {
      totalChecked: pendingPayments.length,
      matched: matchedCount,
      discrepanciesCount: discrepancies.length,
      discrepancies,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Reconciles doctor payouts against the payout provider.
   */
  public async reconcilePayouts(): Promise<ReconciliationSummaryDto> {
    const { items: payouts } = await this.repository.findPayouts({ limit: 100 });
    const discrepancies: ReconciliationDiscrepancy[] = [];
    let matchedCount = 0;

    for (const payout of payouts) {
      if (!payout.providerPayoutId) {
        continue;
      }

      try {
        const providerRecord = await this.payoutProvider.fetchPayout(payout.providerPayoutId);

        const isStatusAligned =
          (payout.status === DoctorPayoutStatus.PAID && providerRecord.status === 'PAID') ||
          (payout.status === DoctorPayoutStatus.PROCESSING &&
            providerRecord.status === 'PROCESSING') ||
          (payout.status === DoctorPayoutStatus.FAILED && providerRecord.status === 'FAILED');

        if (!isStatusAligned) {
          discrepancies.push({
            entityType: 'PAYOUT',
            internalId: payout.id,
            publicId: payout.publicPayoutId,
            providerPaymentId: payout.providerPayoutId,
            internalStatus: payout.status,
            providerStatus: providerRecord.status,
            internalAmount: payout.netAmount,
            discrepancyType: 'STATUS_MISMATCH',
            details: `Internal payout status is ${payout.status} but provider status is ${providerRecord.status}`,
          });
        } else {
          matchedCount++;
        }
      } catch (err: unknown) {
        this.logger.error(`Error reconciling payout ${payout.publicPayoutId}`, err);
      }
    }

    return {
      totalChecked: payouts.length,
      matched: matchedCount,
      discrepanciesCount: discrepancies.length,
      discrepancies,
      checkedAt: new Date().toISOString(),
    };
  }
}
