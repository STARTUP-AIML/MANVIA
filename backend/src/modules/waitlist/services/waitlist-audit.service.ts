import { Injectable, Logger } from '@nestjs/common';
import type {
  IWaitlistAuditService,
  WaitlistAuditEvent,
} from '../interfaces/waitlist-audit-service.interface.js';

@Injectable()
export class WaitlistAuditService implements IWaitlistAuditService {
  private readonly logger = new Logger(WaitlistAuditService.name);
  private readonly logs: WaitlistAuditEvent[] = [];

  public logEvent(event: WaitlistAuditEvent): void {
    this.logs.push({ ...event });
    this.logger.log(
      `[AUDIT] event=${event.event} actor=${event.actorId} role=${event.role} resource=${event.resource} action=${event.action} metadata=${JSON.stringify(event.metadata ?? {})}`,
    );
  }

  public getAuditLogs(): WaitlistAuditEvent[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs.length = 0;
  }
}
