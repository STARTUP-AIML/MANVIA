// ==============================================================================
// MANVIA — Authentication Repositories Unit Tests
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PasswordCredentialRepository } from '../../src/modules/auth/repositories/password-credential.repository.js';
import { SessionRepository } from '../../src/modules/auth/repositories/session.repository.js';
import { AuditLogRepository } from '../../src/modules/auth/repositories/audit-log.repository.js';
import type { PrismaService } from '../../src/database/prisma.service.js';

interface MockPrismaAuth {
  passwordCredential: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  session: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  refreshToken: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  auditLog: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
}

describe('Authentication Repositories', () => {
  let mockPrisma: MockPrismaAuth;

  beforeEach(() => {
    mockPrisma = {
      passwordCredential: {
        create: vi.fn().mockResolvedValue({ id: 'cred-1', userId: 'user-1' }),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'cred-1', passwordHash: 'new' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      session: {
        create: vi.fn().mockResolvedValue({ id: 'sess-1', userId: 'user-1' }),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'sess-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 3 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      refreshToken: {
        create: vi.fn().mockResolvedValue({ id: 'token-1' }),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'token-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
  });

  describe('PasswordCredentialRepository', () => {
    let repo: PasswordCredentialRepository;

    beforeEach(() => {
      repo = new PasswordCredentialRepository(mockPrisma as unknown as PrismaService);
    });

    it('should create password credential', async () => {
      const res = await repo.create({ userId: 'user-1', passwordHash: 'hash-123' });
      expect(res.id).toBe('cred-1');
      expect(mockPrisma.passwordCredential.create).toHaveBeenCalled();
    });

    it('should find password credential by userId', async () => {
      mockPrisma.passwordCredential.findUnique.mockResolvedValue({ id: 'cred-1' });
      const res = await repo.findByUserId('user-1');
      expect(res?.id).toBe('cred-1');
    });

    it('should update password hash', async () => {
      const res = await repo.updatePasswordHash('user-1', 'new-hash');
      expect(res.passwordHash).toBe('new');
    });

    it('should delete credential by userId', async () => {
      const res = await repo.deleteByUserId('user-1');
      expect(res).toBe(true);
    });

    it('should support withTransaction', () => {
      const txRepo = repo.withTransaction(
        {} as unknown as Parameters<typeof repo.withTransaction>[0],
      );
      expect(txRepo).toBeInstanceOf(PasswordCredentialRepository);
    });
  });

  describe('SessionRepository', () => {
    let repo: SessionRepository;

    beforeEach(() => {
      repo = new SessionRepository(mockPrisma as unknown as PrismaService);
    });

    it('should create session', async () => {
      const res = await repo.createSession({
        userId: 'user-1',
        expiresAt: new Date(),
        ipAddress: '127.0.0.1',
      });
      expect(res.id).toBe('sess-1');
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });

    it('should find session by id with user', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'sess-1' });
      const res = await repo.findSessionById('sess-1');
      expect(res?.id).toBe('sess-1');
    });

    it('should update session activity timestamp', async () => {
      await repo.updateSessionActivity('sess-1');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'sess-1' },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should revoke session', async () => {
      await repo.revokeSession('sess-1');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'sess-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should revoke all user sessions', async () => {
      const count = await repo.revokeAllUserSessions('user-1');
      expect(count).toBe(3);
    });

    it('should find active sessions by user id', async () => {
      await repo.findActiveSessionsByUserId('user-1');
      expect(mockPrisma.session.findMany).toHaveBeenCalled();
    });

    it('should create and find refresh tokens', async () => {
      await repo.createRefreshToken({
        sessionId: 'sess-1',
        tokenHash: 'hash-val',
        familyId: 'fam-1',
        expiresAt: new Date(),
      });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();

      await repo.findRefreshTokenByHash('hash-val');
      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalled();
    });

    it('should mark refresh token used and revoke family', async () => {
      await repo.markRefreshTokenUsed('token-1');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { usedAt: expect.any(Date) },
      });

      await repo.revokeRefreshToken('token-1');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { revokedAt: expect.any(Date) },
      });

      const count = await repo.revokeTokenFamily('fam-1');
      expect(count).toBe(2);
    });
  });

  describe('AuditLogRepository', () => {
    let repo: AuditLogRepository;

    beforeEach(() => {
      repo = new AuditLogRepository(mockPrisma as unknown as PrismaService);
    });

    it('should create audit log', async () => {
      const res = await repo.create({
        actorUserId: 'user-1',
        action: 'AUTH.LOGIN_SUCCESS',
        resourceType: 'session',
        status: 'SUCCESS',
      });
      expect(res.id).toBe('log-1');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should find audit logs by user id', async () => {
      await repo.findByUserId('user-1');
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
    });
  });
});
