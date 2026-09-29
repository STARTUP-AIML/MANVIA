import { Injectable, Logger } from '@nestjs/common';
import type {
  ConsentAuditEvent,
  IConsentAuditService,
} from '../interfaces/consent-audit-service.interface.js';

@Injectable()
export class ConsentAuditService implements IConsentAuditService {
  private readonly logger = new Logger(ConsentAuditService.name);

  public logEvent(event: ConsentAuditEvent): void {
    // Structured audit logging compliant with HIPAA / GDPR and MANVIA SECURITY.md
    const sanitizedMetadata = event.metadata
      ? JSON.stringify(this.sanitizeMetadata(event.metadata))
      : undefined;

    const role = event.role ?? event.actorRole ?? 'UNKNOWN';
    this.logger.log(
      `[AUDIT] event=${event.event} actor=${event.actorId} role=${role} ` +
        `resource=${event.resource} action=${event.action}` +
        (sanitizedMetadata ? ` metadata=${sanitizedMetadata}` : ''),
    );
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = new Set(['password', 'token', 'authorization', 'secret', 'cookie']);

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
