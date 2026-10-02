import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminUsersService } from '../../src/modules/admin/services/admin-users.service.js';
import type { PrismaService } from '../../src/database/prisma.service.js';
import type { AdminAuditService } from '../../src/modules/admin/services/admin-audit.service.js';
import { NotFoundError, ConflictError } from '../../src/common/errors/app-error.js';
import { UserStatus, Role } from '@prisma/client';

describe('AdminUsersService (Unit)', () => {
  let service: AdminUsersService;
  let mockPrisma: {
    user: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    session: {
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockAudit: {
    recordAdminAction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      session: {
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
    };

    mockAudit = {
      recordAdminAction: vi.fn().mockResolvedValue(undefined),
    };

    service = new AdminUsersService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AdminAuditService,
    );
  });

  it('should list users with pagination and active session count', async () => {
    const mockUsers = [
      {
        id: 'u-1',
        email: 'alice@example.com',
        phone: '+1234567890',
        status: UserStatus.ACTIVE,
        roles: [Role.PATIENT],
        sessions: [{ id: 's-1' }, { id: 's-2' }],
      },
    ];

    mockPrisma.user.findMany.mockResolvedValue(mockUsers);
    mockPrisma.user.count.mockResolvedValue(1);

    const result = await service.listUsers({ page: 1, limit: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0]?.activeSessionCount).toBe(2);
    expect(mockPrisma.user.findMany).toHaveBeenCalled();
  });

  it('should filter users by role and search string', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    await service.listUsers({
      page: 1,
      limit: 10,
      role: Role.DOCTOR,
      status: UserStatus.ACTIVE,
      search: 'doctor@manvia.com',
    });

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          roles: { has: Role.DOCTOR },
          status: UserStatus.ACTIVE,
        }),
      }),
    );
  });

  it('should return user details by id', async () => {
    const userDetail = {
      id: 'u-1',
      email: 'alice@example.com',
      status: UserStatus.ACTIVE,
      patientProfile: { id: 'p-1' },
      doctorProfile: null,
    };
    mockPrisma.user.findUnique.mockResolvedValue(userDetail);

    const result = await service.getUserById('u-1');
    expect(result.id).toBe('u-1');
  });

  it('should throw NotFoundError if user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(service.getUserById('non-existent')).rejects.toThrow(NotFoundError);
  });

  it('should prevent admin from suspending their own account', async () => {
    await expect(
      service.updateUserStatus(
        'admin-1',
        { status: UserStatus.SUSPENDED, reason: 'Accidental self-lockout' },
        'admin-1',
      ),
    ).rejects.toThrow(ConflictError);
  });

  it('should update user status and revoke all active sessions on suspension', async () => {
    const targetUser = {
      id: 'u-2',
      email: 'target@example.com',
      status: UserStatus.ACTIVE,
      roles: [Role.PATIENT],
    };
    mockPrisma.user.findUnique.mockResolvedValue(targetUser);

    const result = await service.updateUserStatus(
      'u-2',
      { status: UserStatus.SUSPENDED, reason: 'Compromised credentials detected' },
      'admin-1',
    );

    expect(result.status).toBe(UserStatus.SUSPENDED);
    expect(result.previousStatus).toBe(UserStatus.ACTIVE);
    expect(mockPrisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u-2', revokedAt: null },
      }),
    );
    expect(mockAudit.recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN.USER_STATUS_UPDATED',
        resourceType: 'USER',
        resourceId: 'u-2',
      }),
    );
  });
});
