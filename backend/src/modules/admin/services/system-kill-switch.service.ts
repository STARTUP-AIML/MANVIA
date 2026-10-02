import { Injectable, Logger } from '@nestjs/common';
import type { KillSwitchDto } from '../dto/kill-switch.dto.js';
import { AdminAuditService } from './admin-audit.service.js';

export interface SubsystemState {
  subsystem: string;
  enabled: boolean;
  lastModifiedBy?: string;
  lastModifiedAt: string;
  justification?: string;
}

@Injectable()
export class SystemKillSwitchService {
  private readonly logger = new Logger(SystemKillSwitchService.name);
  private readonly switches = new Map<string, SubsystemState>();
  private readonly startedAt = Date.now();

  constructor(private readonly auditService: AdminAuditService) {
    // Initialize standard platform subsystems to ACTIVE/ENABLED by default
    const defaultSubsystems = [
      'REALTIME_VOICE_GATEWAY',
      'AI_COMPANION',
      'PAYMENTS_GATEWAY',
      'NOTIFICATIONS_DISPATCH',
      'APPOINTMENT_BOOKING',
    ];

    for (const sub of defaultSubsystems) {
      this.switches.set(sub, {
        subsystem: sub,
        enabled: true,
        lastModifiedAt: new Date().toISOString(),
        justification: 'System initialization default state',
      });
    }
  }

  public async toggleSwitch(dto: KillSwitchDto, adminUserId: string): Promise<SubsystemState> {
    const subsystemKey = dto.subsystem.trim().toUpperCase();
    const previous = this.switches.get(subsystemKey);

    const newState: SubsystemState = {
      subsystem: subsystemKey,
      enabled: dto.enabled,
      lastModifiedBy: adminUserId,
      lastModifiedAt: new Date().toISOString(),
      justification: dto.justification,
    };

    this.switches.set(subsystemKey, newState);

    this.logger.warn(
      `[EMERGENCY KILL SWITCH] Subsystem "${subsystemKey}" toggled to ${
        dto.enabled ? 'ENABLED' : 'DISABLED'
      } by admin ${adminUserId}. Reason: ${dto.justification}`,
    );

    await this.auditService.recordAdminAction({
      actorUserId: adminUserId,
      action: 'ADMIN.SYSTEM_KILL_SWITCH_TOGGLED',
      resourceType: 'PLATFORM_SUBSYSTEM',
      resourceId: subsystemKey,
      status: 'SUCCESS',
      details: {
        previousEnabled: previous?.enabled ?? true,
        newEnabled: dto.enabled,
        justification: dto.justification,
      },
    });

    return newState;
  }

  public isSubsystemActive(subsystem: string): boolean {
    const key = subsystem.trim().toUpperCase();
    const state = this.switches.get(key);
    return state ? state.enabled : true;
  }

  public getSystemStatus() {
    const subsystems = Array.from(this.switches.values());
    const allEnabled = subsystems.every((s) => s.enabled);

    return {
      status: allEnabled ? 'OPERATIONAL' : 'DEGRADED_EMERGENCY_SHUTDOWN',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
      subsystems,
    };
  }
}
