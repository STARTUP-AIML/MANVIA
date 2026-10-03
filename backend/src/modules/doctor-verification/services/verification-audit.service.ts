import { Injectable, Logger } from '@nestjs/common';
import type {
  AuditEventPayload,
  IVerificationAuditService,
} from '../interfaces/audit-service.interface.js';

@Injectable()
export class VerificationAuditService implements IVerificationAuditService {
  private readonly logger = new Logger('VerificationAuditService');
  private readonly auditLog: AuditEventPayload[] = [];

  public async recordEvent(event: AuditEventPayload): Promise<void> {
    // Sanitize metadata: remove any potential secrets, passwords, or binary data
    const sanitizedMetadata: Record<string, string | number | boolean | null> = {};
    if (event.metadata) {
      for (const [key, value] of Object.entries(event.metadata)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('token') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('authorization') ||
          lowerKey.includes('key')
        ) {
          sanitizedMetadata[key] = '[REDACTED]';
        } else {
          sanitizedMetadata[key] = value;
        }
      }
    }

    const sanitizedEvent: AuditEventPayload = {
      ...event,
      metadata: sanitizedMetadata,
    };

    this.auditLog.push(sanitizedEvent);

    this.logger.log(
      `[AUDIT] event=${sanitizedEvent.eventName} actor=${sanitizedEvent.actorId} role=${sanitizedEvent.actorRole} resource=${sanitizedEvent.resourceType}:${sanitizedEvent.resourceId} action=${sanitizedEvent.action}`,
    );
  }

  public async getEventsForResource(resourceId: string): Promise<AuditEventPayload[]> {
    return this.auditLog.filter((e) => e.resourceId === resourceId);
  }
}
