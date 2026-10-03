// ==============================================================================
// MANVIA — Authentication End-to-End (E2E) Test Suite
// ==============================================================================
// Phase 4: Full HTTP Lifecycle for Identity & Authentication
// ==============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';
import { PrismaService } from '../../src/database/prisma.service.js';

describe('Authentication API E2E (/api/v1/auth)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const testEmail = `e2e_auth_${Date.now()}@example.com`;
  const testPassword = 'Str0ngP@ssw0rd!2026';
  const newPassword = 'N3wStr0ngP@ssw0rd!2027';

  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: { contains: 'e2e_auth_' } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  it('POST /api/v1/auth/register — should register a new user identity', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: testEmail,
        password: testPassword,
        phone: '+14155552671',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);

    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(testEmail.toLowerCase());
    expect(body.user.roles).toContain('PATIENT');
    expect(body.user.password).toBeUndefined(); // Zero secret leakage!
    expect(body.user.passwordHash).toBeUndefined();

    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.tokenType).toBe('Bearer');
    expect(body.expiresIn).toBe(900);

    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('POST /api/v1/auth/register — should reject duplicate email with 409 Conflict', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('CONFLICT');
    expect(body.message).toContain('already exists');
  });

  it('POST /api/v1/auth/register — should reject weak password with 400 Bad Request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `another_${Date.now()}@example.com`,
        password: 'weak',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('VALIDATION_FAILED');
  });

  it('POST /api/v1/auth/login — should reject invalid password with 401 Unauthorized', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: 'WrongPassword!123',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.message).toBe('Invalid email or password');
  });

  it('POST /api/v1/auth/login — should authenticate with valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);

    expect(body.user.email).toBe(testEmail.toLowerCase());
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();

    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('GET /api/v1/auth/me — should return authenticated user profile', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.email).toBe(testEmail.toLowerCase());
    expect(body.roles).toContain('PATIENT');
    expect(body.password).toBeUndefined();
    expect(body.passwordHash).toBeUndefined();
  });

  it('GET /api/v1/auth/me — should reject request without token with 401 Unauthorized', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/auth/refresh — should rotate refresh token and return new credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);

    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.refreshToken).not.toBe(refreshToken);

    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('POST /api/v1/auth/change-password — should change password and invalidate prior sessions', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        currentPassword: testPassword,
        newPassword,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.message).toBe('Password updated successfully');

    // Login with old password must fail
    const oldLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });
    expect(oldLogin.statusCode).toBe(401);

    // Login with new password must succeed
    const newLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: newPassword,
      },
    });
    expect(newLogin.statusCode).toBe(200);
    const newBody = JSON.parse(newLogin.body);
    accessToken = newBody.accessToken;
  });

  it('POST /api/v1/auth/logout — should revoke active session', async () => {
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(logoutRes.statusCode).toBe(200);
    const body = JSON.parse(logoutRes.body);
    expect(body.message).toBe('Logged out successfully');

    // GET /api/v1/auth/me using revoked session's token must be rejected with 401
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(meRes.statusCode).toBe(401);
  });

  it('BREACH MITIGATION: Replaying already-used refresh token triggers family revocation', async () => {
    // 1. Log in to get fresh tokens
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: newPassword,
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const loginBody = JSON.parse(loginRes.body);
    const originalRefreshToken = loginBody.refreshToken;

    // 2. Rotate token legitimately
    const rotateRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken: originalRefreshToken,
      },
    });
    expect(rotateRes.statusCode).toBe(200);
    const rotateBody = JSON.parse(rotateRes.body);
    const rotatedAccessToken = rotateBody.accessToken;

    // 3. Replay the original already-used refresh token (replay attack simulation)
    const replayRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken: originalRefreshToken,
      },
    });
    expect(replayRes.statusCode).toBe(401);

    // 4. Verify that entire session family was revoked — subsequent requests with rotated token are now rejected!
    const meCheck = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${rotatedAccessToken}`,
      },
    });
    expect(meCheck.statusCode).toBe(401);
  });
});
