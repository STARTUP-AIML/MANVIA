import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminAISafetyService } from '../../src/modules/admin/services/admin-ai-safety.service.js';
import type { PrismaService } from '../../src/database/prisma.service.js';
import type { AdminAuditService } from '../../src/modules/admin/services/admin-audit.service.js';
import { NotFoundError } from '../../src/common/errors/app-error.js';
import { AIHandoffStatus } from '@prisma/client';

describe('AdminAISafetyService (Unit)', () => {
  let service: AdminAISafetyService;
  let mockPrisma: {
    aISafetyEvent: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    aIHumanHandoff: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let mockAudit: {
    recordAdminAction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      aISafetyEvent: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      aIHumanHandoff: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    mockAudit = {
      recordAdminAction: vi.fn().mockResolvedValue(undefined),
    };

    service = new AdminAISafetyService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AdminAuditService,
    );
  });

  it('should list AI safety events with pagination and filters', async () => {
    mockPrisma.aISafetyEvent.findMany.mockResolvedValue([{ id: 'ev-1' }]);
    mockPrisma.aISafetyEvent.count.mockResolvedValue(1);

    const result = await service.listSafetyEvents({ page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.items.length).toBe(1);
  });

  it('should list AI human handoffs with pagination and filters', async () => {
    mockPrisma.aIHumanHandoff.findMany.mockResolvedValue([{ id: 'h-1' }]);
    mockPrisma.aIHumanHandoff.count.mockResolvedValue(1);

    const result = await service.listHumanHandoffs({ page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.items.length).toBe(1);
  });

  it('should adjudicate an existing handoff and record an audit log', async () => {
    const existing = {
      id: 'h-1',
      status: AIHandoffStatus.REQUESTED,
      metadata: {},
    };
    mockPrisma.aIHumanHandoff.findUnique.mockResolvedValue(existing);
    mockPrisma.aIHumanHandoff.update.mockResolvedValue({
      ...existing,
      status: AIHandoffStatus.ASSIGNED,
    });

    const updated = await service.adjudicateHandoff(
      'h-1',
      {
        status: AIHandoffStatus.ASSIGNED,
        assignedDoctorId: 'doc-uuid-1',
        adminNotes: 'Assigned to duty specialist',
      },
      'admin-1',
    );

    expect(updated.status).toBe(AIHandoffStatus.ASSIGNED);
    expect(mockAudit.recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN.AI_HANDOFF_ADJUDICATED',
        resourceType: 'AI_HUMAN_HANDOFF',
        resourceId: 'h-1',
      }),
    );
  });

  it('should throw NotFoundError if handoff does not exist', async () => {
    mockPrisma.aIHumanHandoff.findUnique.mockResolvedValue(null);

    await expect(
      service.adjudicateHandoff(
        'missing-h',
        {
          status: AIHandoffStatus.ASSIGNED,
          adminNotes: 'Notes',
        },
        'admin-1',
      ),
    ).rejects.toThrow(NotFoundError);
  });
});
