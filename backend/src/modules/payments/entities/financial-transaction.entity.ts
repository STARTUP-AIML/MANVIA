import type { FinancialTransactionType } from '../enums/financial-transaction-type.enum.js';
import type { TransactionDirection } from '../enums/transaction-direction.enum.js';

export interface FinancialTransactionProps {
  id: string;
  publicTransactionId: string;
  type: FinancialTransactionType;
  direction: TransactionDirection;
  amount: string;
  currency: string;
  paymentId?: string | null;
  payoutId?: string | null;
  refundId?: string | null;
  reference?: string | null;
  status: string;
  occurredAt: Date;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export class FinancialTransactionEntity {
  public readonly id: string;
  public readonly publicTransactionId: string;
  public readonly type: FinancialTransactionType;
  public readonly direction: TransactionDirection;
  public readonly amount: string;
  public readonly currency: string;
  public readonly paymentId?: string | null;
  public readonly payoutId?: string | null;
  public readonly refundId?: string | null;
  public readonly reference?: string | null;
  public readonly status: string;
  public readonly occurredAt: Date;
  public readonly metadata?: Record<string, unknown> | null;
  public readonly createdAt: Date;

  public constructor(props: FinancialTransactionProps) {
    this.id = props.id;
    this.publicTransactionId = props.publicTransactionId;
    this.type = props.type;
    this.direction = props.direction;
    this.amount = props.amount;
    this.currency = props.currency;
    this.paymentId = props.paymentId ?? null;
    this.payoutId = props.payoutId ?? null;
    this.refundId = props.refundId ?? null;
    this.reference = props.reference ?? null;
    this.status = props.status;
    this.occurredAt = props.occurredAt;
    this.metadata = props.metadata ?? null;
    this.createdAt = props.createdAt;
  }
}
