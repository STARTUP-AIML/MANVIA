import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { AdminModule } from '../../src/modules/admin/admin.module.js';
import { AdminUsersService } from '../../src/modules/admin/services/admin-users.service.js';
import { AdminAuditService } from '../../src/modules/admin/services/admin-audit.service.js';
import { SystemKillSwitchService } from '../../src/modules/admin/services/system-kill-switch.service.js';
import { AdminClinicalIncidentService } from '../../src/modules/admin/services/admin-clinical-incident.service.js';
import { AdminOversightService } from '../../src/modules/admin/services/admin-oversight.service.js';
import { Role, UserStatus } from '@prisma/client';

describe('Admin Module (Integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let adminUsersService: AdminUsersService;
  let adminAuditService: AdminAuditService;
  let killSwitchService: SystemKillSwitchService;
  let clinicalIncidentService: AdminClinicalIncidentService;
  let oversightService: AdminOversightService;

  let testAdminUserId: string;
  let testPatientUserId: string;
  let testPatientProfileId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, AdminModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    adminUsersService = moduleRef.get(AdminUsersService);
    adminAuditService = moduleRef.get(AdminAuditService);
    killSwitchService = moduleRef.get(SystemKillSwitchService);
    clinicalIncidentService = moduleRef.get(AdminClinicalIncidentService);
    oversightService = moduleRef.get(AdminOversightService);

    // Seed test users
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-int-${Date.now()}@manvia.com`,
        status: UserStatus.ACTIVE,
        roles: [Role.ADMIN],
      },
    });
    testAdminUserId = adminUser.id;

    const patientUser = await prisma.user.create({
      data: {
        email: `patient-int-${Date.now()}@manvia.com`,
        status: UserStatus.ACTIVE,
        roles: [Role.PATIENT],
        patientProfile: {
          create: {
            publicPatientId: `PAT-INT-${Math.floor(100000 + Math.random() * 900000)}`,
            displayName: 'Integration Test Patient',
          },
        },
      },
      include: {
        patientProfile: true,
      },
    });
    testPatientUserId = patientUser.id;
    testPatientProfileId = patientUser.patientProfile!.id;

    // Create session for patient
    await prisma.session.create({
      data: {
        userId: testPatientUserId,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });
  });

  afterAll(async () => {
    try {
      if (testPatientUserId) {
        await prisma.session.deleteMany({ where: { userId: testPatientUserId } });
        await prisma.patientProfile.deleteMany({ where: { userId: testPatientUserId } });
        await prisma.user.deleteMany({ where: { id: testPatientUserId } });
      }
      if (testAdminUserId) {
        await prisma.auditLog.deleteMany({ where: { actorUserId: testAdminUserId } });
        await prisma.user.deleteMany({ where: { id: testAdminUserId } });
      }
    } catch {
      // Ignore cleanup error
    }
    await moduleRef.close();
  });

  it('should list users with active session count and status filters', async () => {
    const res = await adminUsersService.listUsers({
      page: 1,
      limit: 20,
      status: UserStatus.ACTIVE,
    });
    expect(res.total).toBeGreaterThanOrEqual(2);
    expect(res.items.some((u) => u.id === testPatientUserId)).toBe(true);
  });

  it('should update user status to SUSPENDED and revoke all active sessions', async () => {
    const updated = await adminUsersService.updateUserStatus(
      testPatientUserId,
      {
        status: UserStatus.SUSPENDED,
        reason: 'Compromised account detected during integration test',
      },
      testAdminUserId,
    );

    expect(updated.status).toBe(UserStatus.SUSPENDED);

    // Verify session revoked
    const activeSessions = await prisma.session.findMany({
      where: {
        userId: testPatientUserId,
        revokedAt: null,
      },
    });
    expect(activeSessions.length).toBe(0);

    // Verify audit log exists
    const auditRes = await adminAuditService.queryAuditLogs({
      actorUserId: testAdminUserId,
      action: 'ADMIN.USER_STATUS_UPDATED',
    });
    expect(auditRes.total).toBeGreaterThanOrEqual(1);
  });

  it('should toggle emergency kill switch and update platform operational status', async () => {
    const switched = await killSwitchService.toggleSwitch(
      {
        subsystem: 'AI_COMPANION',
        enabled: false,
        justification: 'Automated integration test kill-switch engagement',
      },
      testAdminUserId,
    );

    expect(switched.enabled).toBe(false);
    expect(killSwitchService.isSubsystemActive('AI_COMPANION')).toBe(false);

    const status = killSwitchService.getSystemStatus();
    expect(status.status).toBe('DEGRADED_EMERGENCY_SHUTDOWN');

    // Restore switch
    await killSwitchService.toggleSwitch(
      {
        subsystem: 'AI_COMPANION',
        enabled: true,
        justification: 'Integration test cleanup',
      },
      testAdminUserId,
    );
  });

  it('should execute break-glass clinical access and create high-severity audit trail', async () => {
    const access = await clinicalIncidentService.executeBreakGlassAccess(
      {
        patientId: testPatientProfileId,
        incidentTicketId: 'INC-INT-2026',
        justification: 'Emergency clinical review of medication interaction alert in testing',
        acknowledgedTerms: true,
      },
      testAdminUserId,
    );

    expect(access.incidentTicketId).toBe('INC-INT-2026');
    expect(access.patient.id).toBe(testPatientProfileId);

    const auditRes = await adminAuditService.queryAuditLogs({
      actorUserId: testAdminUserId,
      action: 'ADMIN.BREAK_GLASS_CLINICAL_ACCESS',
    });
    expect(auditRes.total).toBeGreaterThanOrEqual(1);
  });

  it('should provide oversight aggregates for platform', async () => {
    const notifs = await oversightService.getNotificationsOverview();
    expect(notifs.deliveries).toBeDefined();

    const payments = await oversightService.getPaymentsOverview({ page: 1, limit: 10 });
    expect(payments.metrics).toBeDefined();
  });
});
