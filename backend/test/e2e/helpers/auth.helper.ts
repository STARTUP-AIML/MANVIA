// ==============================================================================
// MANVIA — E2E Authentication & Test Harness Helper
// ==============================================================================
// Provides real trusted authentication flow for E2E tests:
// - Verifies Bearer tokens via TokenService & SessionService
// - Binds authenticated user context to request.user
// - Provides user creation, login, and cleanup utilities
// ==============================================================================

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import { createApp } from '../../../src/main.js';
import { PrismaService } from '../../../src/database/prisma.service.js';
import { TokenService } from '../../../src/modules/auth/services/token.service.js';
import { SessionService } from '../../../src/modules/auth/services/session.service.js';
import type { AuthenticatedUser } from '../../../src/modules/auth/auth.interface.js';
import { Role } from '@prisma/client';

export interface E2EUser {
  id: string;
  email: string;
  roles: Role[];
  activeRole: Role;
  token: string;
  headers: {
    authorization: string;
  };
}

export interface CreateE2EUserOptions {
  role?: Role | 'PATIENT' | 'DOCTOR' | 'ADMIN';
  email?: string;
  password?: string;
}

const DEFAULT_PASSWORD = 'Str0ngP@ssw0rd!2026';

/**
 * Attaches the trusted authentication resolution hook to the Fastify instance.
 * Validates cryptographic JWT signature and database session state,
 * populating request.user exactly as AuthGuard does in production.
 */
export function attachE2EAuthHook(app: NestFastifyApplication): void {
  const tokenService = app.get(TokenService);
  const sessionService = app.get(SessionService);
  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    if ((request as FastifyRequest & { user?: AuthenticatedUser }).user) {
      return;
    }
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return;
    }

    try {
      const payload = tokenService.verifyAccessToken(token);
      const { isValid, session } = await sessionService.validateSession(payload.sessionId);
      if (!isValid || !session || session.user.status !== 'ACTIVE') {
        return;
      }

      (request as FastifyRequest & { user?: AuthenticatedUser & { userId?: string } }).user = {
        id: session.user.id,
        userId: session.user.id,
        email: session.user.email,
        roles: session.user.roles,
        activeRole: payload.activeRole ?? session.user.roles[0] ?? 'PATIENT',
        sessionId: session.id,
      };
    } catch {
      // Invalid/expired token -> request.user remains undefined
    }
  });
}

/**
 * Initializes and bootstraps the NestFastifyApplication with the E2E trusted auth hook.
 */
export async function setupE2EApp(): Promise<NestFastifyApplication> {
  process.env.NODE_ENV = 'test';
  const app = await createApp();
  attachE2EAuthHook(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

/**
 * Creates, verifies, and logs in a real user through the auth endpoints,
 * returning the user profile, JWT token, and authorization headers.
 */
export async function createE2EUser(
  app: NestFastifyApplication,
  options: CreateE2EUserOptions = {},
): Promise<E2EUser> {
  const targetRole = (options.role as Role) ?? Role.PATIENT;
  const email =
    options.email ??
    `e2e_${targetRole.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`;
  const password = options.password ?? DEFAULT_PASSWORD;

  // 1. Register user
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password },
  });

  if (regRes.statusCode !== 201) {
    throw new Error(`Failed to register E2E user (${regRes.statusCode}): ${regRes.body}`);
  }

  const regData = JSON.parse(regRes.body);
  const userId = regData.user.id;
  let token = regData.accessToken;
  let roles = regData.user.roles as Role[];

  // 2. If target role is not the default PATIENT, update role in DB and re-login
  if (targetRole !== Role.PATIENT) {
    const prisma = app.get(PrismaService);
    await prisma.user.update({
      where: { id: userId },
      data: { roles: [targetRole] },
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });

    if (loginRes.statusCode !== 200) {
      throw new Error(`Failed to login E2E user (${loginRes.statusCode}): ${loginRes.body}`);
    }

    const loginData = JSON.parse(loginRes.body);
    token = loginData.accessToken;
    roles = [targetRole];
  }

  return {
    id: userId,
    email,
    roles,
    activeRole: targetRole,
    token,
    headers: {
      authorization: `Bearer ${token}`,
    },
  };
}

/**
 * Cleans up created E2E test users and their related entities.
 */
export async function cleanupE2EUsers(
  app: NestFastifyApplication,
  emails: (string | undefined | null)[],
): Promise<void> {
  const validEmails = emails.filter((e): e is string => typeof e === 'string' && !!e);
  if (!validEmails.length) return;
  try {
    const prisma = app.get(PrismaService);
    const users = await prisma.user.findMany({
      where: { email: { in: validEmails } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      const doctors = await prisma.doctorProfile.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      });
      const doctorIds = doctors.map((d) => d.id);
      if (doctorIds.length > 0) {
        const verifications = await prisma.doctorVerification.findMany({
          where: { doctorId: { in: doctorIds } },
          select: { id: true },
        });
        const verifIds = verifications.map((v) => v.id);
        if (verifIds.length > 0) {
          await prisma.verificationReview.deleteMany({
            where: { verificationId: { in: verifIds } },
          });
          await prisma.verificationDocument.deleteMany({
            where: { verificationId: { in: verifIds } },
          });
          await prisma.doctorVerification.deleteMany({ where: { id: { in: verifIds } } });
        }
        await prisma.consultationOffer.deleteMany({ where: { doctorId: { in: doctorIds } } });
        await prisma.doctorAvailability.deleteMany({ where: { doctorId: { in: doctorIds } } });
        await prisma.doctorSpecialty.deleteMany({ where: { doctorId: { in: doctorIds } } });
        await prisma.doctorLanguage.deleteMany({ where: { doctorId: { in: doctorIds } } });
        await prisma.doctorQualification.deleteMany({ where: { doctorId: { in: doctorIds } } });
        await prisma.doctorProfile.deleteMany({ where: { id: { in: doctorIds } } });
      }
      await prisma.patientProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  } catch {
    // Ignore cleanup errors during teardown
  }
}
