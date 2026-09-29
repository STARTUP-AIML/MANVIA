// ==============================================================================
// MANVIA — Authorization End-to-End (E2E) Test Suite
// ==============================================================================
// Phase 5: Full HTTP Lifecycle for RBAC, Ownership, and Role Switching
// ==============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { Controller, Get, Param, UseGuards, VersioningType } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../src/app.module.js';
import { createFastifyAdapter } from '../../src/main.js';
import { ConfigService } from '../../src/config/config.service.js';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter.js';
import { createValidationPipe } from '../../src/common/pipes/validation.pipe.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { AuthGuard } from '../../src/modules/auth/guards/auth.guard.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { AuthorizationModule } from '../../src/modules/authorization/authorization.module.js';
import { RolesGuard } from '../../src/modules/authorization/guards/roles.guard.js';
import { ResourceOwnerGuard } from '../../src/modules/authorization/guards/resource-owner.guard.js';
import { Roles } from '../../src/modules/authorization/decorators/roles.decorator.js';
import { RequireOwnership } from '../../src/modules/authorization/decorators/require-ownership.decorator.js';
import { Role } from '@prisma/client';

/**
 * Isolated test controller for exercising RBAC & ownership guards over HTTP.
 * Not exposed in production application code.
 */
@Controller({ path: 'test-authz', version: '1' })
class TestAuthzController {
  @Get('patient-only')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  public patientOnly() {
    return { status: 'patient_allowed' };
  }

  @Get('doctor-only')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  public doctorOnly() {
    return { status: 'doctor_allowed' };
  }

  @Get('admin-only')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  public adminOnly() {
    return { status: 'admin_allowed' };
  }

  @Get('users/:userId/records')
  @UseGuards(AuthGuard, ResourceOwnerGuard)
  @RequireOwnership({ paramName: 'userId' })
  public getRecords(@Param('userId') userId: string) {
    return { status: 'records_accessed', userId };
  }

  @Get('admin-override/:userId')
  @UseGuards(AuthGuard, ResourceOwnerGuard)
  @RequireOwnership({ paramName: 'userId', allowAdmin: true })
  public adminOverride(@Param('userId') userId: string) {
    return { status: 'admin_override_accessed', userId };
  }
}

describe('Authorization & Security Foundation (E2E)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const patientEmail = `e2e_patient_${Date.now()}@example.com`;
  const doctorEmail = `e2e_doctor_${Date.now()}@example.com`;
  const adminEmail = `e2e_admin_${Date.now()}@example.com`;
  const defaultPassword = 'Str0ngP@ssw0rd!2026';

  let patientToken: string;
  let patientUserId: string;

  let doctorToken: string;
  let doctorUserId: string;

  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, AuthModule, AuthorizationModule],
      controllers: [TestAuthzController],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(createFastifyAdapter());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(createValidationPipe());
    const configService = app.get(ConfigService);
    app.useGlobalFilters(new GlobalExceptionFilter(configService.raw));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);

    // 1. Create Patient User
    const patReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: patientEmail, password: defaultPassword },
    });
    const patData = JSON.parse(patReg.body);
    patientToken = patData.accessToken;
    patientUserId = patData.user.id;

    // 2. Create Doctor User
    const docReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: doctorEmail, password: defaultPassword },
    });
    const docData = JSON.parse(docReg.body);
    doctorUserId = docData.user.id;

    // Update Doctor user in DB to have DOCTOR role
    await prisma.user.update({
      where: { id: doctorUserId },
      data: { roles: [Role.DOCTOR] },
    });

    const docLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: doctorEmail, password: defaultPassword },
    });
    doctorToken = JSON.parse(docLogin.body).accessToken;

    // 3. Create Admin User
    const admReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: adminEmail, password: defaultPassword },
    });
    const admData = JSON.parse(admReg.body);
    adminUserId = admData.user.id;

    // Update Admin user in DB to have ADMIN role
    await prisma.user.update({
      where: { id: adminUserId },
      data: { roles: [Role.ADMIN] },
    });

    const admLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: adminEmail, password: defaultPassword },
    });
    adminToken = JSON.parse(admLogin.body).accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: { in: [patientEmail, doctorEmail, adminEmail] },
        },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('Unauthenticated Access (401 Unauthorized)', () => {
    it('should reject unauthenticated request to protected endpoint with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-authz/patient-only',
      });
      expect(res.statusCode).toBe(401);
    });

    it('should reject unauthenticated request to ownership endpoint with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/test-authz/users/${patientUserId}/records`,
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow PATIENT to access @Roles(Role.PATIENT) route', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-authz/patient-only',
        headers: { authorization: `Bearer ${patientToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).status).toBe('patient_allowed');
    });

    it('should forbid PATIENT from accessing @Roles(Role.DOCTOR) route (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-authz/doctor-only',
        headers: { authorization: `Bearer ${patientToken}` },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).message).toContain('insufficient role privileges');
    });

    it('should forbid PATIENT from accessing @Roles(Role.ADMIN) route (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-authz/admin-only',
        headers: { authorization: `Bearer ${patientToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('should allow DOCTOR to access @Roles(Role.DOCTOR) route', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-authz/doctor-only',
        headers: { authorization: `Bearer ${doctorToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).status).toBe('doctor_allowed');
    });

    it('should forbid DOCTOR from accessing @Roles(Role.ADMIN) route (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-authz/admin-only',
        headers: { authorization: `Bearer ${doctorToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('should allow ADMIN to access @Roles(Role.ADMIN) route', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-authz/admin-only',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).status).toBe('admin_allowed');
    });
  });

  describe('Resource Ownership & IDOR Protection', () => {
    it('should allow user to access their own private resource', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/test-authz/users/${patientUserId}/records`,
        headers: { authorization: `Bearer ${patientToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).status).toBe('records_accessed');
    });

    it('should forbid user from accessing another user resource (horizontal privilege escalation prevented)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/test-authz/users/${doctorUserId}/records`,
        headers: { authorization: `Bearer ${patientToken}` }, // patient tries to read doctor's records
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).message).toContain('you do not have permission');
    });

    it('should deny ADMIN access by default to private records without explicit override', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/test-authz/users/${patientUserId}/records`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('should permit ADMIN access when allowAdmin is explicitly true on route', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/test-authz/admin-override/${patientUserId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).status).toBe('admin_override_accessed');
    });
  });

  describe('Role Switching & Permissions APIs', () => {
    it('GET /api/v1/auth/permissions — should return active permissions for authenticated user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/permissions',
        headers: { authorization: `Bearer ${patientToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.activeRole).toBe('PATIENT');
      expect(body.permissions).toContain('patient_profile:read');
    });

    it('POST /api/v1/auth/switch-role — should reject switching to an unassigned role (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/switch-role',
        headers: { authorization: `Bearer ${patientToken}` },
        payload: { role: Role.ADMIN }, // Patient is NOT an admin!
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).message).toContain('not assigned the requested role');
    });

    it('POST /api/v1/auth/switch-role — should switch active role for multi-role user and mint new token', async () => {
      // Grant DOCTOR role as secondary role to Patient user in database
      await prisma.user.update({
        where: { id: patientUserId },
        data: { roles: [Role.PATIENT, Role.DOCTOR] },
      });

      // User requests new active role DOCTOR
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/switch-role',
        headers: { authorization: `Bearer ${patientToken}` },
        payload: { role: Role.DOCTOR },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.activeRole).toBe('DOCTOR');
      expect(body.accessToken).toBeDefined();

      // Use the newly minted token to verify active permissions changed
      const permRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/permissions',
        headers: { authorization: `Bearer ${body.accessToken}` },
      });
      expect(permRes.statusCode).toBe(200);
      const permBody = JSON.parse(permRes.body);
      expect(permBody.activeRole).toBe('DOCTOR');
      expect(permBody.permissions).toContain('doctor_profile:read');
    });
  });
});
