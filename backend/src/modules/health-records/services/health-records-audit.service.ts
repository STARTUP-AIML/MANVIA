import { Injectable, Logger } from '@nestjs/common';
import type {
  HealthRecordsAuditEvent,
  IHealthRecordsAuditService,
} from '../interfaces/health-records-audit-service.interface.js';

@Injectable()
export class HealthRecordsAuditService implements IHealthRecordsAuditService {
  private readonly logger = new Logger(HealthRecordsAuditService.name);

  public logEvent(event: HealthRecordsAuditEvent): void {
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
      'password',
      'token',
      'authorization',
      'secret',
      'cookie',
      'dek',
      'encrypteddek',
      'buffer',
      'filecontent',
      'signedurl',
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
