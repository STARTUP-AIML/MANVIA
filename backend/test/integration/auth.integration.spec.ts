// ==============================================================================
// MANVIA — Authentication Database Integration Test Suite
// ==============================================================================
// Phase 4: Real PostgreSQL 18 Integration Testing
// - User & PasswordCredential atomic persistence
// - Transaction rollback atomicity
// - Unique constraint enforcement (email & phone)
// - Session & RefreshToken lifecycle and cascade deletions
// ==============================================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { UserService } from '../../src/modules/identity/user.service.js';
import { PasswordCredentialRepository } from '../../src/modules/auth/repositories/password-credential.repository.js';
import { SessionRepository } from '../../src/modules/auth/repositories/session.repository.js';
import { AuditLogRepository } from '../../src/modules/auth/repositories/audit-log.repository.js';
import crypto from 'node:crypto';

describe('Authentication Database Integration (PostgreSQL 18)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let userService: UserService;
  let credRepo: PasswordCredentialRepository;
  let sessionRepo: SessionRepository;
  let auditLogRepo: AuditLogRepository;

  const testEmailPrefix = `test_int_${Date.now()}`;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
    userService = app.get(UserService);
    credRepo = app.get(PasswordCredentialRepository);
    sessionRepo = app.get(SessionRepository);
    auditLogRepo = app.get(AuditLogRepository);
  });

  afterAll(async () => {
    if (prisma) {
      // Clean up any remaining test data
      await prisma.user.deleteMany({
        where: { email: { contains: 'test_int_' } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'test_int_' } },
    });
  });

  it('should persist User and PasswordCredential in PostgreSQL', async () => {
    const email = `${testEmailPrefix}_1@example.com`;

    const user = await userService.createUser({
      email,
      roles: ['PATIENT'],
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe(email);

    const cred = await credRepo.create({
      userId: user.id,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$hash123',
    });

    expect(cred.id).toBeDefined();
    expect(cred.userId).toBe(user.id);

    // Verify relations and fetching from database
    const fetchedUser = await userService.findById(user.id);
    expect(fetchedUser).toBeDefined();
    expect(fetchedUser?.email).toBe(email);

    const fetchedCred = await credRepo.findByUserId(user.id);
    expect(fetchedCred?.passwordHash).toBe('$argon2id$v=19$m=65536,t=3,p=1$hash123');
  });

  it('should enforce database-level email uniqueness constraint', async () => {
    const email = `${testEmailPrefix}_unique@example.com`;

    await userService.createUser({ email });

    // Attempt concurrent duplicate insert
    await expect(userService.createUser({ email })).rejects.toThrow();
  });

  it('should guarantee registration atomicity and rollback if credential creation fails', async () => {
    const email = `${testEmailPrefix}_rollback@example.com`;

    let caughtError = false;
    try {
      await prisma.executeTransaction(async (tx) => {
        const u = await userService.createUser({ email }, tx);
        expect(u.id).toBeDefined();

        // Simulate unexpected failure inside transaction
        throw new Error('Forced registration failure after user creation');
      });
    } catch {
      caughtError = true;
    }

    expect(caughtError).toBe(true);

    // Verify User was rolled back and does NOT exist in the database
    const orphanedUser = await userService.findByEmail(email);
    expect(orphanedUser).toBeNull();
  });

  it('should persist Session and RefreshToken with foreign keys and cascade on user deletion', async () => {
    const email = `${testEmailPrefix}_session@example.com`;
    const user = await userService.createUser({ email });

    const session = await sessionRepo.createSession({
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600000),
      ipAddress: '192.168.1.1',
      userAgent: 'PostmanRuntime/7.29.0',
    });

    expect(session.id).toBeDefined();
    expect(session.userId).toBe(user.id);

    const tokenHash = crypto.createHash('sha256').update('test-token').digest('hex');
    const familyId = crypto.randomUUID();

    const refreshToken = await sessionRepo.createRefreshToken({
      sessionId: session.id,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + 3600000),
    });

    expect(refreshToken.id).toBeDefined();

    // Verify finding token with joined session and user
    const found = await sessionRepo.findRefreshTokenByHash(tokenHash);
    expect(found).toBeDefined();
    expect(found?.session.id).toBe(session.id);
    expect(found?.session.user.id).toBe(user.id);

    // Delete user and verify cascade delete cleans up session and tokens
    await prisma.user.delete({ where: { id: user.id } });

    const deletedSession = await sessionRepo.findSessionById(session.id);
    expect(deletedSession).toBeNull();

    const deletedToken = await sessionRepo.findRefreshTokenByHash(tokenHash);
    expect(deletedToken).toBeNull();
  });

  it('should record audit log in database with user reference', async () => {
    const email = `${testEmailPrefix}_audit@example.com`;
    const user = await userService.createUser({ email });

    const log = await auditLogRepo.create({
      actorUserId: user.id,
      action: 'AUTH.LOGIN_SUCCESS',
      resourceType: 'session',
      status: 'SUCCESS',
      ipAddress: '10.0.0.1',
      userAgent: 'TestBrowser',
    });

    expect(log.id).toBeDefined();
    expect(log.actorUserId).toBe(user.id);
    expect(log.action).toBe('AUTH.LOGIN_SUCCESS');

    const logs = await auditLogRepo.findByUserId(user.id);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]?.action).toBe('AUTH.LOGIN_SUCCESS');
  });
});
