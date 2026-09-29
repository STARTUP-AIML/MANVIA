import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PAYMENT_REPOSITORY,
  type IPaymentRepository,
  type FindInvoicesQuery,
} from '../interfaces/payment-repository.interface.js';
import {
  PAYMENT_AUDIT_SERVICE,
  type IPaymentAuditService,
} from '../interfaces/payment-audit-service.interface.js';
import { InvoiceEntity } from '../entities/invoice.entity.js';
import { InvoiceStatus } from '../enums/invoice-status.enum.js';
import { IdGeneratorUtil } from '../utils/id-generator.util.js';
import { CurrencyUtil } from '../utils/currency.util.js';
import { NotFoundError, ForbiddenError } from '../../../common/errors/app-error.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import type { PaymentEntity } from '../entities/payment.entity.js';
import type { PricingBreakdown } from '../entities/pricing-breakdown.entity.js';
import { randomUUID } from 'crypto';

export interface GenerateInvoiceParams {
  payment: PaymentEntity;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  breakdown?: PricingBreakdown;
  paidAt?: Date;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  public constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly repository: IPaymentRepository,
    @Inject(PAYMENT_AUDIT_SERVICE)
    private readonly auditService: IPaymentAuditService,
  ) {}

  /**
   * Generates a finalized immutable invoice for a succeeded payment.
   */
  public async generateInvoice(params: GenerateInvoiceParams): Promise<InvoiceEntity> {
    const existing = await this.repository.findInvoiceByPaymentId(params.payment.id);
    if (existing) {
      this.logger.log(
        `Invoice already exists for payment ${params.payment.id}: ${existing.invoiceNumber}`,
      );
      return existing;
    }

    const subtotal = params.breakdown?.taxableAmount ?? params.payment.amount;
    const taxes = params.breakdown?.tax ?? '0.00';
    const discount = params.breakdown?.discount ?? '0.00';
    const platformFee = params.breakdown?.platformFee ?? '0.00';
    const total = params.breakdown?.total ?? CurrencyUtil.add(subtotal, taxes);

    const invoice = new InvoiceEntity({
      id: randomUUID(),
      publicInvoiceId: IdGeneratorUtil.generatePublicInvoiceId(),
      invoiceNumber: IdGeneratorUtil.generateInvoiceNumber(),
      paymentId: params.payment.id,
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      doctorId: params.doctorId,
      subtotal,
      taxes,
      discount,
      platformFee,
      total,
      currency: params.payment.currency,
      status: InvoiceStatus.PAID, // Issued directly upon payment success
      issuedAt: new Date(),
      paidAt: params.paidAt ?? new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.repository.saveInvoice(invoice);

    this.auditService.logEvent({
      event: 'INVOICE_ISSUED',
      resource: 'Invoice',
      resourceId: saved.publicInvoiceId,
      action: 'ISSUE_INVOICE',
      status: 'SUCCESS',
      metadata: {
        invoiceNumber: saved.invoiceNumber,
        paymentId: params.payment.publicPaymentId,
        total: saved.total,
        currency: saved.currency,
      },
    });

    this.logger.log(
      `Generated invoice ${saved.invoiceNumber} for payment ${params.payment.publicPaymentId}`,
    );
    return saved;
  }

  public async getInvoiceById(
    identifier: string,
    actor: CurrentUserContext,
  ): Promise<InvoiceEntity> {
    const invoice =
      (await this.repository.findInvoiceById(identifier)) ??
      (await this.repository.findInvoiceByPublicId(identifier)) ??
      (await this.repository.findInvoiceByNumber(identifier));

    if (!invoice) {
      throw new NotFoundError(`Invoice ${identifier} not found`);
    }

    // Role-based resource isolation
    if (actor.activeRole === 'PATIENT') {
      if (invoice.patientId !== actor.userId) {
        throw new ForbiddenError('Patients are only authorized to access their own invoices');
      }
    } else if (actor.activeRole === 'DOCTOR') {
      if (invoice.doctorId !== actor.userId) {
        throw new ForbiddenError(
          'Doctors are only authorized to access invoices for their consultations',
        );
      }
    }

    return invoice;
  }

  public async getInvoices(
    query: FindInvoicesQuery,
    actor: CurrentUserContext,
  ): Promise<{ items: InvoiceEntity[]; total: number }> {
    const scopedQuery: FindInvoicesQuery = { ...query };

    if (actor.activeRole === 'PATIENT') {
      scopedQuery.patientId = actor.userId;
    } else if (actor.activeRole === 'DOCTOR') {
      scopedQuery.doctorId = actor.userId;
    }

    return this.repository.findInvoices(scopedQuery);
  }
}
