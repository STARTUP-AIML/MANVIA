import { Injectable, Logger } from '@nestjs/common';
import type {
  AppointmentAuditEvent,
  IAppointmentAuditService,
} from '../interfaces/appointment-audit-service.interface.js';

@Injectable()
export class AppointmentAuditService implements IAppointmentAuditService {
  private readonly logger = new Logger(AppointmentAuditService.name);

  public logEvent(event: AppointmentAuditEvent): void {
    const metaStr = event.metadata ? ` metadata=${JSON.stringify(event.metadata)}` : '';
    this.logger.log(
      `[AUDIT] event=${event.event} actor=${event.actorId} role=${event.role} resource=${event.resource} action=${event.action}${metaStr}`,
    );
  }
}
