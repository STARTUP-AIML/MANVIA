import { Injectable, Logger } from '@nestjs/common';
import type {
  IRefundAuditService,
  RefundAuditEvent,
} from '../interfaces/refund-audit-service.interface.js';

@Injectable()
export class RefundAuditService implements IRefundAuditService {
  private readonly logger = new Logger(RefundAuditService.name);
  private readonly logs: RefundAuditEvent[] = [];

  public logEvent(event: RefundAuditEvent): void {
    this.logs.push({ ...event });
    this.logger.log(
      `[AUDIT] event=${event.event} actor=${event.actorId} role=${event.role} resource=${event.resource} action=${event.action} metadata=${JSON.stringify(event.metadata ?? {})}`,
    );
  }

  public getAuditLogs(): RefundAuditEvent[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs.length = 0;
  }
}
