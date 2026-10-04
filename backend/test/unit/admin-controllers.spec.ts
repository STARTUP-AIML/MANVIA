import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdminUsersController } from '../../src/modules/admin/controllers/admin-users.controller.js';
import { AdminOversightController } from '../../src/modules/admin/controllers/admin-oversight.controller.js';
import { AdminAuditController } from '../../src/modules/admin/controllers/admin-audit.controller.js';
import { AdminAISafetyController } from '../../src/modules/admin/controllers/admin-ai-safety.controller.js';
import { AdminSystemController } from '../../src/modules/admin/controllers/admin-system.controller.js';
import { AdminClinicalIncidentController } from '../../src/modules/admin/controllers/admin-clinical-incident.controller.js';
import { AdminAuthGuard } from '../../src/modules/admin/guards/admin-auth.guard.js';
import type { AdminUsersService } from '../../src/modules/admin/services/admin-users.service.js';
import type { AdminOversightService } from '../../src/modules/admin/services/admin-oversight.service.js';
import type { AdminAuditService } from '../../src/modules/admin/services/admin-audit.service.js';
import type { AdminAISafetyService } from '../../src/modules/admin/services/admin-ai-safety.service.js';
import type { SystemKillSwitchService } from '../../src/modules/admin/services/system-kill-switch.service.js';
import type { AdminClinicalIncidentService } from '../../src/modules/admin/services/admin-clinical-incident.service.js';
import type { CurrentUserContext } from '../../src/modules/doctors/interfaces/auth-context.interface.js';
import { UnauthorizedError, ForbiddenError } from '../../src/common/errors/app-error.js';
import { UserStatus, AIHandoffStatus } from '@prisma/client';

describe('Admin Controllers & Guards (Unit)', () => {
  describe('AdminAuthGuard', () => {
    let guard: AdminAuthGuard;

    beforeEach(() => {
      guard = new AdminAuthGuard();
    });

    it('should throw UnauthorizedError when no credentials exist', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
        }),
      } as unknown as ExecutionContext;
      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedError);
    });

    it('should throw ForbiddenError when user has activeRole !== ADMIN', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-user-id': 'u-pat',
              'x-user-role': 'PATIENT',
            },
            user: {
              userId: 'u-pat',
              activeRole: 'PATIENT',
            },
          }),
        }),
      } as unknown as ExecutionContext;
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenError);
    });

    it('should allow access when authenticated user activeRole === ADMIN', () => {
      const mockRequest: {
        headers: Record<string, string>;
        user?: CurrentUserContext;
      } = {
        headers: {
          'x-user-id': 'u-adm',
          'x-user-role': 'ADMIN',
        },
        user: {
          userId: 'u-adm',
          activeRole: 'ADMIN',
        },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;
      expect(guard.canActivate(mockContext)).toBe(true);
      expect(mockRequest.user?.activeRole).toBe('ADMIN');
    });
  });

  describe('AdminUsersController', () => {
    let controller: AdminUsersController;
    let mockService: {
      listUsers: ReturnType<typeof vi.fn>;
      getUserById: ReturnType<typeof vi.fn>;
      updateUserStatus: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockService = {
        listUsers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        getUserById: vi.fn().mockResolvedValue({ id: 'u-1' }),
        updateUserStatus: vi.fn().mockResolvedValue({ status: UserStatus.SUSPENDED }),
      };
      controller = new AdminUsersController(mockService as unknown as AdminUsersService);
    });

    it('should delegate listUsers to service', async () => {
      const res = await controller.listUsers({ page: 1, limit: 10 });
      expect(res.total).toBe(0);
      expect(mockService.listUsers).toHaveBeenCalled();
    });

    it('should delegate getUserById to service', async () => {
      const res = await controller.getUserById('u-1');
      expect(res.id).toBe('u-1');
      expect(mockService.getUserById).toHaveBeenCalledWith('u-1');
    });

    it('should delegate updateUserStatus to service', async () => {
      const res = await controller.updateUserStatus(
        'u-1',
        { status: UserStatus.SUSPENDED, reason: 'Valid reason' },
        { userId: 'admin-1', activeRole: 'ADMIN' },
      );
      expect(res.status).toBe(UserStatus.SUSPENDED);
      expect(mockService.updateUserStatus).toHaveBeenCalled();
    });
  });

  describe('AdminOversightController', () => {
    let controller: AdminOversightController;
    let mockService: {
      listPatients: ReturnType<typeof vi.fn>;
      listDoctors: ReturnType<typeof vi.fn>;
      listAppointments: ReturnType<typeof vi.fn>;
      listCareRelationships: ReturnType<typeof vi.fn>;
      getPaymentsOverview: ReturnType<typeof vi.fn>;
      getNotificationsOverview: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockService = {
        listPatients: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        listDoctors: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        listAppointments: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        listCareRelationships: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        getPaymentsOverview: vi.fn().mockResolvedValue({ total: 0 }),
        getNotificationsOverview: vi.fn().mockResolvedValue({ deliveries: {} }),
      };
      controller = new AdminOversightController(mockService as unknown as AdminOversightService);
    });

    it('should delegate listPatients, listDoctors, and appointments', async () => {
      await controller.listPatients(1, 20, 'test');
      expect(mockService.listPatients).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'test',
      });

      await controller.listDoctors(1, 20, 'Cardio', 'VERIFIED', 'doc');
      expect(mockService.listDoctors).toHaveBeenCalled();

      await controller.listAppointments({ page: 1, limit: 10 });
      expect(mockService.listAppointments).toHaveBeenCalled();
    });
  });

  describe('AdminAuditController', () => {
    it('should delegate queryAuditLogs', async () => {
      const mockService = {
        queryAuditLogs: vi.fn().mockResolvedValue({ items: [] }),
      };
      const controller = new AdminAuditController(mockService as unknown as AdminAuditService);
      const res = await controller.queryAuditLogs({ page: 1, limit: 50 });
      expect(res.items).toBeDefined();
      expect(mockService.queryAuditLogs).toHaveBeenCalled();
    });
  });

  describe('AdminAISafetyController', () => {
    it('should delegate safety events, handoffs, and adjudication', async () => {
      const mockService = {
        listSafetyEvents: vi.fn().mockResolvedValue({ items: [] }),
        listHumanHandoffs: vi.fn().mockResolvedValue({ items: [] }),
        adjudicateHandoff: vi.fn().mockResolvedValue({ id: 'h-1' }),
      };
      const controller = new AdminAISafetyController(
        mockService as unknown as AdminAISafetyService,
      );

      await controller.listSafetyEvents({ page: 1, limit: 10 });
      expect(mockService.listSafetyEvents).toHaveBeenCalled();

      await controller.listHumanHandoffs({ page: 1, limit: 10 });
      expect(mockService.listHumanHandoffs).toHaveBeenCalled();

      await controller.adjudicateHandoff(
        'h-1',
        { status: AIHandoffStatus.ASSIGNED, adminNotes: 'Adjudicated' },
        { userId: 'admin-1', activeRole: 'ADMIN' },
      );
      expect(mockService.adjudicateHandoff).toHaveBeenCalled();
    });
  });

  describe('AdminSystemController', () => {
    it('should delegate kill switches and system status', async () => {
      const mockService = {
        getSystemStatus: vi.fn().mockReturnValue({ status: 'OPERATIONAL' }),
        toggleSwitch: vi.fn().mockResolvedValue({ enabled: false }),
      };
      const controller = new AdminSystemController(
        mockService as unknown as SystemKillSwitchService,
      );

      const status = await controller.getSystemStatus();
      expect(status.status).toBe('OPERATIONAL');

      await controller.toggleKillSwitch(
        { subsystem: 'AI_COMPANION', enabled: false, justification: 'High error rate' },
        { userId: 'admin-1', activeRole: 'ADMIN' },
      );
      expect(mockService.toggleSwitch).toHaveBeenCalled();
    });
  });

  describe('AdminClinicalIncidentController', () => {
    it('should delegate break-glass access', async () => {
      const mockService = {
        executeBreakGlassAccess: vi.fn().mockResolvedValue({ incidentTicketId: 'INC-1' }),
      };
      const controller = new AdminClinicalIncidentController(
        mockService as unknown as AdminClinicalIncidentService,
      );

      const mockReq = {
        headers: { 'x-forwarded-for': '127.0.0.1', 'user-agent': 'Jest/Vitest' },
        ip: '127.0.0.1',
      } as unknown as FastifyRequest;

      const res = await controller.executeBreakGlassAccess(
        {
          patientId: 'p-1',
          incidentTicketId: 'INC-1',
          justification: 'Emergency clinical investigation into severe prescription issue',
          acknowledgedTerms: true,
        },
        { userId: 'admin-1', activeRole: 'ADMIN' },
        mockReq,
      );

      expect(res.incidentTicketId).toBe('INC-1');
      expect(mockService.executeBreakGlassAccess).toHaveBeenCalled();
    });
  });
});
