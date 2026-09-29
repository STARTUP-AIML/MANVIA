import { Injectable, Logger } from '@nestjs/common';
import type {
  IPaymentAuditService,
  PaymentAuditEvent,
} from '../interfaces/payment-audit-service.interface.js';

@Injectable()
export class PaymentAuditService implements IPaymentAuditService {
  private readonly logger = new Logger(PaymentAuditService.name);
  private readonly logs: PaymentAuditEvent[] = [];

  public logEvent(event: PaymentAuditEvent): void {
    const timestamp = event.timestamp ?? new Date();
    this.logs.push({ ...event, timestamp });
    this.logger.log(
      `[FINANCIAL_AUDIT] event=${event.event} actor=${event.actorId ?? 'system'} role=${event.role ?? 'system'} resource=${event.resource} resourceId=${event.resourceId ?? 'none'} action=${event.action} status=${event.status} metadata=${JSON.stringify(event.metadata ?? {})}`,
    );
  }

  public getAuditLogs(): PaymentAuditEvent[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs.length = 0;
  }
}
