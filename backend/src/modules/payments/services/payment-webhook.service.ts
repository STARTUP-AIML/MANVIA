import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import {
  PAYMENT_REPOSITORY,
  type IPaymentRepository,
} from '../interfaces/payment-repository.interface.js';
import {
  PAYMENT_PROVIDER,
  type IPaymentProvider,
} from '../interfaces/payment-provider.interface.js';
import {
  PAYMENT_AUDIT_SERVICE,
  type IPaymentAuditService,
} from '../interfaces/payment-audit-service.interface.js';
import { InvoiceService } from './invoice.service.js';
import { PricingService } from './pricing.service.js';
import { DoctorPayoutService } from './doctor-payout.service.js';
import { PaymentWebhookEventEntity } from '../entities/payment-webhook-event.entity.js';
import { FinancialTransactionEntity } from '../entities/financial-transaction.entity.js';
import { FinancialTransactionType } from '../enums/financial-transaction-type.enum.js';
import { TransactionDirection } from '../enums/transaction-direction.enum.js';
import { PaymentStatus } from '../enums/payment-status.enum.js';
import { WebhookProcessingStatus } from '../enums/webhook-processing-status.enum.js';
import { IdGeneratorUtil } from '../utils/id-generator.util.js';
import { ValidationError, UnauthorizedError } from '../../../common/errors/app-error.js';
import type { IEventBus } from '../../../events/event-bus.interface.js';

export interface ProcessWebhookResult {
  processed: boolean;
  ignored: boolean;
  duplicate: boolean;
  eventId: string;
  eventType: string;
  message?: string;
}

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  public constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly repository: IPaymentRepository,
    @Inject(PAYMENT_PROVIDER)
    private readonly provider: IPaymentProvider,
    @Inject(PAYMENT_AUDIT_SERVICE)
    private readonly auditService: IPaymentAuditService,
    private readonly invoiceService: InvoiceService,
    private readonly pricingService: PricingService,
    private readonly payoutService: DoctorPayoutService,
    @Optional()
    @Inject('EVENT_BUS')
    private readonly eventBus?: IEventBus,
  ) {}

  /**
   * Processes incoming webhook from external payment gateway.
   */
  public async handleWebhook(
    providerName: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Buffer,
  ): Promise<ProcessWebhookResult> {
    const rawPayloadStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    // 1. Verify cryptographic signature
    const verification = await this.provider.verifyWebhook(headers, rawPayloadStr);
    if (!verification.valid) {
      this.logger.warn(
        `Rejected webhook with invalid signature from provider ${providerName}: ${verification.failureReason}`,
      );
      this.auditService.logEvent({
        event: 'WEBHOOK_SIGNATURE_FAILED',
        resource: 'PaymentWebhook',
        action: 'VERIFY_SIGNATURE',
        status: 'FAILURE',
        metadata: { provider: providerName, failureReason: verification.failureReason },
      });
      throw new UnauthorizedError(
        `Webhook signature verification failed: ${verification.failureReason}`,
      );
    }

    const { providerEventId, eventType, paymentId, providerPaymentId, status } = verification;

    // 2. Check Event Idempotency
    const existingEvent = await this.repository.findWebhookEvent(providerName, providerEventId);
    if (existingEvent) {
      this.logger.log(`Skipping duplicate webhook event ${providerEventId} from ${providerName}`);
      return {
        processed: true,
        ignored: false,
        duplicate: true,
        eventId: providerEventId,
        eventType,
        message: 'Duplicate event already processed',
      };
    }

    // 3. Persist received webhook event
    const payloadHash = createHash('sha256').update(rawPayloadStr).digest('hex');
    const webhookEvent = new PaymentWebhookEventEntity({
      id: randomUUID(),
      provider: providerName,
      providerEventId,
      eventType,
      payloadHash,
      payload: rawPayloadStr,
      processingStatus: WebhookProcessingStatus.RECEIVED,
      receivedAt: new Date(),
      createdAt: new Date(),
    });

    await this.repository.saveWebhookEvent(webhookEvent);

    // 4. Locate target payment
    let payment = paymentId ? await this.repository.findPaymentById(paymentId) : null;
    if (!payment && providerPaymentId) {
      payment = await this.repository.findPaymentByProviderPaymentId(providerPaymentId);
    }

    if (!payment) {
      webhookEvent.markIgnored(`No associated payment found for webhook event ${providerEventId}`);
      await this.repository.updateWebhookEvent(webhookEvent);
      return {
        processed: false,
        ignored: true,
        duplicate: false,
        eventId: providerEventId,
        eventType,
        message: 'No associated payment found',
      };
    }

    // 5. Apply state machine transition atomically
    try {
      const isRefundEvent = eventType.toLowerCase().includes('refund');
      if (isRefundEvent) {
        this.logger.log(
          `Received refund webhook event ${providerEventId} (${eventType}) for payment ${payment.publicPaymentId}`,
        );
        if (this.eventBus) {
          await this.eventBus.publish({
            eventId: randomUUID(),
            eventType: 'PAYMENT_REFUNDED',
            aggregateId: payment.id,
            occurredAt: new Date(),
            payload: {
              paymentId: payment.id,
              publicPaymentId: payment.publicPaymentId,
              patientId: payment.patientId,
              doctorId: payment.doctorId,
              appointmentId: payment.appointmentId,
            },
          });
        }
      } else if (eventType.includes('succeeded') || status === 'SUCCEEDED') {
        if (payment.status === PaymentStatus.SUCCEEDED) {
          this.logger.log(
            `Payment ${payment.publicPaymentId} is already in SUCCEEDED state. Preserving idempotency.`,
          );
        } else {
          payment.markSucceeded(providerPaymentId ?? undefined, new Date());
          await this.repository.savePayment(payment);

          // Calculate pricing breakdown
          const breakdown = await this.pricingService.calculateBreakdown({
            baseAmount: payment.amount,
            currency: payment.currency,
            doctorId: payment.doctorId,
            patientId: payment.patientId,
          });

          // Generate finalized invoice
          await this.invoiceService.generateInvoice({
            payment,
            appointmentId: payment.appointmentId,
            patientId: payment.patientId,
            doctorId: payment.doctorId,
            breakdown,
          });

          // Create pending doctor payout record
          await this.payoutService.createPendingPayout({
            payment,
            breakdown,
          });

          // Append to financial ledger
          const ledgerTx = new FinancialTransactionEntity({
            id: randomUUID(),
            publicTransactionId: IdGeneratorUtil.generatePublicTransactionId(),
            type: FinancialTransactionType.PAYMENT,
            direction: TransactionDirection.CREDIT,
            amount: payment.amount,
            currency: payment.currency,
            paymentId: payment.id,
            reference: providerPaymentId ?? providerEventId,
            status: 'POSTED',
            occurredAt: new Date(),
            createdAt: new Date(),
          });
          await this.repository.saveTransaction(ledgerTx);

          // Emit domain event for Phase 18 notification orchestrator
          if (this.eventBus) {
            await this.eventBus.publish({
              eventId: randomUUID(),
              eventType: 'PAYMENT_SUCCEEDED',
              aggregateId: payment.id,
              occurredAt: new Date(),
              payload: {
                paymentId: payment.id,
                publicPaymentId: payment.publicPaymentId,
                patientId: payment.patientId,
                doctorId: payment.doctorId,
                appointmentId: payment.appointmentId,
                amount: payment.amount,
                currency: payment.currency,
              },
            });
          }
        }
      } else if (eventType.includes('failed') || status === 'FAILED') {
        if (payment.canTransitionTo(PaymentStatus.FAILED)) {
          payment.markFailed(verification.failureReason || 'Webhook reported payment failure');
          await this.repository.savePayment(payment);

          if (this.eventBus) {
            await this.eventBus.publish({
              eventId: randomUUID(),
              eventType: 'PAYMENT_FAILED',
              aggregateId: payment.id,
              occurredAt: new Date(),
              payload: {
                paymentId: payment.id,
                publicPaymentId: payment.publicPaymentId,
                patientId: payment.patientId,
                appointmentId: payment.appointmentId,
                reason: payment.failureReason,
              },
            });
          }
        } else {
          this.logger.warn(
            `Ignoring stale webhook failure for payment ${payment.publicPaymentId} in status ${payment.status}`,
          );
        }
      }

      webhookEvent.markProcessed(new Date());
      await this.repository.updateWebhookEvent(webhookEvent);

      this.auditService.logEvent({
        event: 'WEBHOOK_PROCESSED',
        resource: 'PaymentWebhook',
        resourceId: providerEventId,
        action: 'PROCESS_WEBHOOK',
        status: 'SUCCESS',
        metadata: {
          provider: providerName,
          eventType,
          paymentId: payment.publicPaymentId,
        },
      });

      return {
        processed: true,
        ignored: false,
        duplicate: false,
        eventId: providerEventId,
        eventType,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown webhook error';
      webhookEvent.markFailed(errorMsg);
      await this.repository.updateWebhookEvent(webhookEvent);
      this.logger.error(
        `Webhook processing failure for event ${providerEventId}: ${errorMsg}`,
        err,
      );
      throw new ValidationError(`Webhook processing error: ${errorMsg}`);
    }
  }
}
