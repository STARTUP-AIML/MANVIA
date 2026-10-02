import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminClinicalIncidentService } from '../../src/modules/admin/services/admin-clinical-incident.service.js';
import type { PrismaService } from '../../src/database/prisma.service.js';
import type { AdminAuditService } from '../../src/modules/admin/services/admin-audit.service.js';
import { NotFoundError } from '../../src/common/errors/app-error.js';

describe('AdminClinicalIncidentService (Unit)', () => {
  let service: AdminClinicalIncidentService;
  let mockPrisma: {
    patientProfile: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    healthRecord: {
      findMany: ReturnType<typeof vi.fn>;
    };
    wellnessCheckIn: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let mockAudit: {
    recordAdminAction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      patientProfile: {
        findUnique: vi.fn(),
      },
      healthRecord: {
        findMany: vi.fn(),
      },
      wellnessCheckIn: {
        findMany: vi.fn(),
      },
    };

    mockAudit = {
      recordAdminAction: vi.fn().mockResolvedValue(undefined),
    };

    service = new AdminClinicalIncidentService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AdminAuditService,
    );
  });

  it('should throw NotFoundError if patient does not exist', async () => {
    mockPrisma.patientProfile.findUnique.mockResolvedValue(null);

    await expect(
      service.executeBreakGlassAccess(
        {
          patientId: 'e0000000-0000-4000-a000-000000000001',
          incidentTicketId: 'INC-2026-9999',
          justification: 'Critical safety escalation review for severe adverse event.',
          acknowledgedTerms: true,
        },
        'admin-1',
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('should authorize break-glass access, create audit log, and return clinical records', async () => {
    const mockPatient = {
      id: 'p-1',
      publicPatientId: 'PAT-12345678',
      displayName: 'Jane Doe',
      gender: 'Female',
      bloodGroup: 'O+',
      emergencyContactName: 'John Doe',
      preferredLanguage: 'en',
    };
    mockPrisma.patientProfile.findUnique.mockResolvedValue(mockPatient);
    mockPrisma.healthRecord.findMany.mockResolvedValue([
      { id: 'hr-1', publicRecordId: 'REC-1', title: 'Blood Panel', category: 'LAB_REPORT' },
    ]);
    mockPrisma.wellnessCheckIn.findMany.mockResolvedValue([
      { id: 'w-1', mood: 4, stress: 2, energy: 4 },
    ]);

    const result = await service.executeBreakGlassAccess(
      {
        patientId: 'p-1',
        incidentTicketId: 'INC-2026-1029',
        justification: 'Emergency clinical verification required for medication conflict',
        acknowledgedTerms: true,
      },
      'admin-1',
      '192.168.1.1',
      'Mozilla/5.0',
    );

    expect(result.incidentTicketId).toBe('INC-2026-1029');
    expect(result.patient.publicPatientId).toBe('PAT-12345678');
    expect(result.clinicalRecords.totalRecords).toBe(1);

    expect(mockAudit.recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-1',
        action: 'ADMIN.BREAK_GLASS_CLINICAL_ACCESS',
        resourceType: 'PATIENT_CLINICAL_RECORD',
        resourceId: 'p-1',
        status: 'SUCCESS',
      }),
    );
  });
});
