import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemKillSwitchService } from '../../src/modules/admin/services/system-kill-switch.service.js';
import type { AdminAuditService } from '../../src/modules/admin/services/admin-audit.service.js';

describe('SystemKillSwitchService (Unit)', () => {
  let service: SystemKillSwitchService;
  let mockAudit: {
    recordAdminAction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAudit = {
      recordAdminAction: vi.fn().mockResolvedValue(undefined),
    };

    service = new SystemKillSwitchService(mockAudit as unknown as AdminAuditService);
  });

  it('should initialize with standard subsystems active', () => {
    const status = service.getSystemStatus();
    expect(status.status).toBe('OPERATIONAL');
    expect(service.isSubsystemActive('REALTIME_VOICE_GATEWAY')).toBe(true);
    expect(service.isSubsystemActive('AI_COMPANION')).toBe(true);
    expect(service.isSubsystemActive('PAYMENTS_GATEWAY')).toBe(true);
  });

  it('should toggle subsystem kill switch and record audit log', async () => {
    const updated = await service.toggleSwitch(
      {
        subsystem: 'REALTIME_VOICE_GATEWAY',
        enabled: false,
        justification: 'External upstream provider incident',
      },
      'admin-1',
    );

    expect(updated.enabled).toBe(false);
    expect(service.isSubsystemActive('REALTIME_VOICE_GATEWAY')).toBe(false);

    const status = service.getSystemStatus();
    expect(status.status).toBe('DEGRADED_EMERGENCY_SHUTDOWN');

    expect(mockAudit.recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN.SYSTEM_KILL_SWITCH_TOGGLED',
        resourceType: 'PLATFORM_SUBSYSTEM',
        resourceId: 'REALTIME_VOICE_GATEWAY',
      }),
    );
  });

  it('should default unknown subsystems to active', () => {
    expect(service.isSubsystemActive('UNKNOWN_FEATURE')).toBe(true);
  });
});
