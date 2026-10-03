// ==============================================================================
// MANVIA — Authentication Audit Service
// ==============================================================================
// Phase 4: Security Event Audit Boundary for Authentication Lifecycle
// ==============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository.js';
import type { CreateAuditLogData } from '../auth.interface.js';

export const AUTH_AUDIT_ACTIONS = {
  REGISTER: 'AUTH.REGISTER',
  LOGIN_SUCCESS: 'AUTH.LOGIN_SUCCESS',
  LOGIN_FAILURE: 'AUTH.LOGIN_FAILURE',
  LOGOUT: 'AUTH.LOGOUT',
  TOKEN_REFRESH: 'AUTH.TOKEN_REFRESH',
  BREACH_ATTEMPT_DETECTED: 'AUTH.BREACH_ATTEMPT_DETECTED',
  SESSION_REVOKED: 'AUTH.SESSION_REVOKED',
  PASSWORD_CHANGE: 'AUTH.PASSWORD_CHANGE',
} as const;

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Records an authentication or security lifecycle audit event.
   * Execution is designed to never throw or break caller flow while ensuring forensic integrity.
   */
  public async logEvent(data: CreateAuditLogData): Promise<void> {
    try {
      this.logger.log(
        `[AUDIT] Action: ${data.action} | Status: ${data.status} | User: ${
          data.actorUserId ?? 'ANONYMOUS'
        } | IP: ${data.ipAddress ?? 'UNKNOWN'}`,
      );

      await this.auditLogRepository.create(data);
    } catch (err) {
      // Audit log failures must be logged with high severity but not crash user requests
      this.logger.error(
        `Failed to record audit log for action ${data.action}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
