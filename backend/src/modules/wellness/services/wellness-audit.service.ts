import { Injectable, Logger } from '@nestjs/common';
import type {
  IWellnessAuditService,
  WellnessAuditEvent,
} from '../interfaces/wellness-audit-service.interface.js';

@Injectable()
export class WellnessAuditService implements IWellnessAuditService {
  private readonly logger = new Logger(WellnessAuditService.name);

  public logEvent(event: WellnessAuditEvent): void {
    // Structured audit logging compliant with HIPAA / GDPR and MANVIA SECURITY.md
    const sanitizedMetadata = event.metadata
      ? JSON.stringify(this.sanitizeMetadata(event.metadata))
      : undefined;

    this.logger.log(
      `[AUDIT] event=${event.event} actor=${event.actorId} role=${event.role} ` +
        `resource=${event.resource} action=${event.action}` +
        (sanitizedMetadata ? ` metadata=${sanitizedMetadata}` : ''),
    );
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = new Set([
      'note',
      'journal',
      'reflection',
      'password',
      'token',
      'authorization',
      'secret',
      'cookie',
    ]);

    for (const [key, value] of Object.entries(metadata)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
