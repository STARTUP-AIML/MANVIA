import { InvoiceStatus } from '../enums/invoice-status.enum.js';

export interface InvoiceProps {
  id: string;
  publicInvoiceId: string;
  invoiceNumber: string;
  paymentId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  subtotal: string;
  taxes: string;
  discount: string;
  platformFee: string;
  total: string;
  currency: string;
  status: InvoiceStatus;
  issuedAt: Date;
  paidAt?: Date | null;
  cancelledAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class InvoiceEntity {
  public readonly id: string;
  public readonly publicInvoiceId: string;
  public readonly invoiceNumber: string;
  public readonly paymentId: string;
  public readonly appointmentId: string;
  public readonly patientId: string;
  public readonly doctorId: string;
  public readonly subtotal: string;
  public readonly taxes: string;
  public readonly discount: string;
  public readonly platformFee: string;
  public readonly total: string;
  public readonly currency: string;
  private _status: InvoiceStatus;
  public readonly issuedAt: Date;
  private _paidAt?: Date | null;
  private _cancelledAt?: Date | null;
  private _metadata?: Record<string, unknown> | null;
  public readonly createdAt: Date;
  private _updatedAt: Date;

  public constructor(props: InvoiceProps) {
    this.id = props.id;
    this.publicInvoiceId = props.publicInvoiceId;
    this.invoiceNumber = props.invoiceNumber;
    this.paymentId = props.paymentId;
    this.appointmentId = props.appointmentId;
    this.patientId = props.patientId;
    this.doctorId = props.doctorId;
    this.subtotal = props.subtotal;
    this.taxes = props.taxes;
    this.discount = props.discount;
    this.platformFee = props.platformFee;
    this.total = props.total;
    this.currency = props.currency;
    this._status = props.status;
    this.issuedAt = props.issuedAt;
    this._paidAt = props.paidAt ?? null;
    this._cancelledAt = props.cancelledAt ?? null;
    this._metadata = props.metadata ?? null;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get status(): InvoiceStatus {
    return this._status;
  }

  public get paidAt(): Date | null | undefined {
    return this._paidAt;
  }

  public get cancelledAt(): Date | null | undefined {
    return this._cancelledAt;
  }

  public get metadata(): Record<string, unknown> | null | undefined {
    return this._metadata;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public markPaid(paidAt: Date = new Date()): void {
    if (this._status === InvoiceStatus.PAID) {
      return;
    }
    if (this._status === InvoiceStatus.CANCELLED) {
      throw new Error('Cannot mark a cancelled invoice as paid');
    }
    this._status = InvoiceStatus.PAID;
    this._paidAt = paidAt;
    this._updatedAt = new Date();
  }

  public markCancelled(cancelledAt: Date = new Date()): void {
    if (this._status === InvoiceStatus.PAID) {
      throw new Error('Cannot cancel a finalized and paid invoice');
    }
    this._status = InvoiceStatus.CANCELLED;
    this._cancelledAt = cancelledAt;
    this._updatedAt = new Date();
  }
}
