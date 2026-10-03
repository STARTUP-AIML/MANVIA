import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminAuditService } from '../../src/modules/admin/services/admin-audit.service.js';
import type { PrismaService } from '../../src/database/prisma.service.js';

describe('AdminAuditService (Unit)', () => {
  let service: AdminAuditService;
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    auditLog: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'admin-1' }),
      },
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new AdminAuditService(mockPrisma as unknown as PrismaService);
  });

  it('should record an admin action in auditLog', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'aud-1' });

    await service.recordAdminAction({
      actorUserId: 'admin-1',
      action: 'ADMIN.TEST_ACTION',
      resourceType: 'TEST_RESOURCE',
      resourceId: 'res-1',
      details: { foo: 'bar' },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorUserId: 'admin-1',
          action: 'ADMIN.TEST_ACTION',
          resourceType: 'TEST_RESOURCE',
        }),
      }),
    );
  });

  it('should query audit logs with date range and filters', async () => {
    const mockLogs = [
      {
        id: 'aud-1',
        action: 'ADMIN.USER_STATUS_UPDATED',
        createdAt: new Date(),
      },
    ];

    mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await service.queryAuditLogs({
      page: 1,
      limit: 10,
      action: 'USER_STATUS',
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-30T23:59:59.000Z',
    });

    expect(result.total).toBe(1);
    expect(result.items.length).toBe(1);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
  });
});
