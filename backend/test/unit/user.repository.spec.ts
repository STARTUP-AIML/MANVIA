// ==============================================================================
// MANVIA — User Repository Unit Tests
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from '../../src/modules/identity/user.repository.js';
import type { PrismaService } from '../../src/database/prisma.service.js';
import type { User } from '@prisma/client';

interface MockPrismaUser {
  user: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockPrisma: MockPrismaUser;

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    phone: '+14155552671',
    emailVerified: false,
    phoneVerified: false,
    status: 'ACTIVE',
    roles: ['PATIENT'],
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        create: vi.fn().mockResolvedValue(mockUser),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue(mockUser),
      },
    };

    repository = new UserRepository(mockPrisma as unknown as PrismaService);
  });

  it('should create user with lowercase trimmed email', async () => {
    const res = await repository.create({
      email: '  TEST@EXAMPLE.COM ',
      phone: ' +14155552671 ',
    });

    expect(res).toBe(mockUser);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'test@example.com',
        phone: '+14155552671',
      }),
    });
  });

  it('should find user by ID', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const res = await repository.findById('user-uuid-1');
    expect(res).toBe(mockUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-uuid-1' } });
  });

  it('should find user by email with normalization', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const res = await repository.findByEmail(' TEST@EXAMPLE.COM ');
    expect(res).toBe(mockUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('should find user by phone', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const res = await repository.findByPhone('+14155552671');
    expect(res).toBe(mockUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { phone: '+14155552671' } });
  });

  it('should update user status', async () => {
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, status: 'SUSPENDED' });
    const res = await repository.updateStatus('user-uuid-1', 'SUSPENDED');
    expect(res.status).toBe('SUSPENDED');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-uuid-1' },
      data: { status: 'SUSPENDED' },
    });
  });

  it('should record failed login with lockout timestamp', async () => {
    const lockoutDate = new Date();
    await repository.recordFailedLogin('user-uuid-1', 5, lockoutDate);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-uuid-1' },
      data: {
        failedLoginAttempts: 5,
        lockoutUntil: lockoutDate,
      },
    });
  });

  it('should record successful login resetting failed attempts', async () => {
    await repository.recordSuccessfulLogin('user-uuid-1');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-uuid-1' },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: expect.any(Date),
      },
    });
  });

  it('should support withTransaction returning scoped repository instance', () => {
    const fakeTx = { user: { findUnique: vi.fn() } } as unknown as Parameters<
      typeof repository.withTransaction
    >[0];
    const txRepo = repository.withTransaction(fakeTx);
    expect(txRepo).toBeInstanceOf(UserRepository);
  });
});
