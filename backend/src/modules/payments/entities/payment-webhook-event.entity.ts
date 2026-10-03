import type { WebhookProcessingStatus } from '../enums/webhook-processing-status.enum.js';

export interface PaymentWebhookEventProps {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  payload: string;
  processingStatus: WebhookProcessingStatus;
  receivedAt: Date;
  processedAt?: Date | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export class PaymentWebhookEventEntity {
  public readonly id: string;
  public readonly provider: string;
  public readonly providerEventId: string;
  public readonly eventType: string;
  public readonly payloadHash: string;
  public readonly payload: string;
  private _processingStatus: WebhookProcessingStatus;
  public readonly receivedAt: Date;
  private _processedAt?: Date | null;
  private _failureReason?: string | null;
  private _metadata?: Record<string, unknown> | null;
  public readonly createdAt: Date;

  public constructor(props: PaymentWebhookEventProps) {
    this.id = props.id;
    this.provider = props.provider;
    this.providerEventId = props.providerEventId;
    this.eventType = props.eventType;
    this.payloadHash = props.payloadHash;
    this.payload = props.payload;
    this._processingStatus = props.processingStatus;
    this.receivedAt = props.receivedAt;
    this._processedAt = props.processedAt ?? null;
    this._failureReason = props.failureReason ?? null;
    this._metadata = props.metadata ?? null;
    this.createdAt = props.createdAt;
  }

  public get processingStatus(): WebhookProcessingStatus {
    return this._processingStatus;
  }

  public get processedAt(): Date | null | undefined {
    return this._processedAt;
  }

  public get failureReason(): string | null | undefined {
    return this._failureReason;
  }

  public get metadata(): Record<string, unknown> | null | undefined {
    return this._metadata;
  }

  public markProcessed(processedAt: Date = new Date()): void {
    this._processingStatus = 'PROCESSED' as WebhookProcessingStatus;
    this._processedAt = processedAt;
    this._failureReason = null;
  }

  public markFailed(reason: string): void {
    this._processingStatus = 'FAILED' as WebhookProcessingStatus;
    this._failureReason = reason;
  }

  public markIgnored(reason?: string): void {
    this._processingStatus = 'IGNORED' as WebhookProcessingStatus;
    if (reason) {
      this._failureReason = reason;
    }
  }
}
