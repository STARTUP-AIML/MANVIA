import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  AuditEventPayload,
  IVerificationAuditService,
} from '../interfaces/audit-service.interface.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class VerificationAuditService implements IVerificationAuditService {
  private readonly logger = new Logger('VerificationAuditService');
  private readonly memoryLog: AuditEventPayload[] = [];

  constructor(
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
  ) {}

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

    this.memoryLog.push(sanitizedEvent);

    if (this.prisma) {
      try {
        await this.prisma.auditLog.create({
          data: {
            actorUserId: event.actorId && UUID_REGEX.test(event.actorId) ? event.actorId : null,
            action: event.action || event.eventName,
            resourceType: event.resourceType,
            resourceId: event.resourceId,
            status: 'SUCCESS',
            details: {
              eventName: event.eventName,
              actorRole: event.actorRole,
              metadata: sanitizedMetadata,
            },
            createdAt: event.timestamp || new Date(),
          },
        });
      } catch (err) {
        this.logger.error(`Failed to persist audit log to database: ${err}`);
      }
    }

    this.logger.log(
      `[AUDIT] event=${sanitizedEvent.eventName} actor=${sanitizedEvent.actorId} role=${sanitizedEvent.actorRole} resource=${sanitizedEvent.resourceType}:${sanitizedEvent.resourceId} action=${sanitizedEvent.action}`,
    );
  }

  public async getEventsForResource(resourceId: string): Promise<AuditEventPayload[]> {
    if (this.prisma) {
      try {
        const dbLogs = await this.prisma.auditLog.findMany({
          where: { resourceId },
          orderBy: { createdAt: 'asc' },
        });

        if (dbLogs.length > 0) {
          return dbLogs.map((log) => {
            const details = (log.details as Record<string, unknown>) || {};
            return {
              eventName: (details['eventName'] as string) || log.action,
              actorId: log.actorUserId || '',
              actorRole: (details['actorRole'] as string) || 'SYSTEM',
              resourceId: log.resourceId || '',
              resourceType: log.resourceType,
              action: log.action,
              metadata:
                (details['metadata'] as Record<string, string | number | boolean | null>) || {},
              timestamp: log.createdAt,
            };
          });
        }
      } catch (err) {
        this.logger.warn(
          `Failed to fetch audit events from database, falling back to memory: ${err}`,
        );
      }
    }

    return this.memoryLog.filter((e) => e.resourceId === resourceId);
  }
}
