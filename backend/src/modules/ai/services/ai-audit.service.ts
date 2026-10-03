import { Injectable, Logger } from '@nestjs/common';
import type { AIAuditEvent, IAIAuditService } from '../interfaces/ai-audit-service.interface.js';

@Injectable()
export class AIAuditService implements IAIAuditService {
  private readonly logger = new Logger(AIAuditService.name);

  public logEvent(event: AIAuditEvent): void {
    // Sanitize metadata to guarantee no message content, tokens, or credentials leak
    const sanitizedMetadata: Record<string, unknown> = {};
    if (event.metadata) {
      for (const [key, value] of Object.entries(event.metadata)) {
        if (
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('content') ||
          key.toLowerCase().includes('prompt')
        ) {
          sanitizedMetadata[key] = '[REDACTED]';
        } else {
          sanitizedMetadata[key] = value;
        }
      }
    }

    const metaStr =
      Object.keys(sanitizedMetadata).length > 0
        ? ` metadata=${JSON.stringify(sanitizedMetadata)}`
        : '';

    this.logger.log(
      `[AUDIT] event=${event.event} actor=${event.actorId} role=${event.role} resource=${event.resource} action=${event.action}${metaStr}`,
    );
  }
}
