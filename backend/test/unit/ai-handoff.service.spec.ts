import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIHandoffService } from '../../src/modules/ai/handoff/ai-handoff.service.js';
import { AIHandoffStatus, AIHandoffUrgency } from '../../src/modules/ai/handoff/handoff.enums.js';
import { ForbiddenError, ValidationError } from '../../src/common/errors/app-error.js';

import type { PrismaService } from '../../src/database/prisma.service.js';
import type { AIAuditService } from '../../src/modules/ai/services/ai-audit.service.js';

interface MockPrismaHandoff {
  aIHumanHandoff: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  doctorProfile: {
    findUnique: ReturnType<typeof vi.fn>;
  };
}

describe('AIHandoffService (Unit)', () => {
  let handoffService: AIHandoffService;
  let mockPrisma: MockPrismaHandoff;
  let mockAudit: { logEvent: ReturnType<typeof vi.fn> };

  const PATIENT_A = 'a0000000-0000-0000-0000-000000000001';
  const PATIENT_B = 'b0000000-0000-0000-0000-000000000002';
  const DOCTOR_USER_ID = 'd0000000-0000-0000-0000-000000000001';
  const DOCTOR_PROFILE_ID = 'dp000000-0000-0000-0000-000000000001';
  const HANDOFF_PUBLIC_ID = 'AIH-TEST1234';

  beforeEach(() => {
    mockPrisma = {
      aIHumanHandoff: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      doctorProfile: {
        findUnique: vi.fn(),
      },
    };
    mockAudit = {
      logEvent: vi.fn(),
    };

    handoffService = new AIHandoffService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AIAuditService,
    );
  });

  describe('Handoff Request', () => {
    it('should create human handoff request with explicit consent and requested state', async () => {
      mockPrisma.aIHumanHandoff.create.mockResolvedValue({
        id: 'aih-db-1',
        publicHandoffId: HANDOFF_PUBLIC_ID,
        userId: PATIENT_A,
        conversationId: null,
        reason: 'User requested doctor consultation for persistent fatigue',
        safetyLevel: 'ROUTINE',
        requestedUrgency: AIHandoffUrgency.URGENT,
        status: AIHandoffStatus.REQUESTED,
        consentGranted: true,
        userSummary: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await handoffService.requestHandoff(PATIENT_A, {
        reason: 'User requested doctor consultation for persistent fatigue',
        requestedUrgency: AIHandoffUrgency.URGENT,
        consentGranted: true,
      });

      expect(res.publicHandoffId).toBe(HANDOFF_PUBLIC_ID);
      expect(res.status).toBe(AIHandoffStatus.REQUESTED);
      expect(res.consentGranted).toBe(true);
      expect(mockPrisma.aIHumanHandoff.create).toHaveBeenCalled();
      expect(mockAudit.logEvent).toHaveBeenCalled();
    });
  });

  describe('Doctor Triage Queue', () => {
    it('should allow verified doctors to view open queued handoffs', async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue({
        id: DOCTOR_PROFILE_ID,
        userId: DOCTOR_USER_ID,
        verificationStatus: 'VERIFIED',
      });
      mockPrisma.aIHumanHandoff.findMany.mockResolvedValue([
        {
          id: 'aih-db-1',
          publicHandoffId: HANDOFF_PUBLIC_ID,
          userId: PATIENT_A,
          status: AIHandoffStatus.REQUESTED,
          safetyLevel: 'ROUTINE',
          requestedUrgency: AIHandoffUrgency.CRISIS,
          consentGranted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const queue = await handoffService.listPendingHandoffsForDoctor(DOCTOR_USER_ID);
      expect(queue).toHaveLength(1);
      expect(queue[0]!.publicHandoffId).toBe(HANDOFF_PUBLIC_ID);
      expect(mockPrisma.aIHumanHandoff.findMany).toHaveBeenCalled();
    });

    it('should reject unverified doctor profiles from viewing doctor triage queue', async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue({
        id: DOCTOR_PROFILE_ID,
        userId: DOCTOR_USER_ID,
        verificationStatus: 'PENDING',
      });

      await expect(handoffService.listPendingHandoffsForDoctor(DOCTOR_USER_ID)).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('should reject non-doctor users without profile from viewing doctor triage queue', async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue(null);

      await expect(handoffService.listPendingHandoffsForDoctor(PATIENT_A)).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('Doctor Handoff Acceptance & Workflow', () => {
    it('should allow verified doctor to accept queued handoff and assign profile', async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue({
        id: DOCTOR_PROFILE_ID,
        userId: DOCTOR_USER_ID,
        verificationStatus: 'VERIFIED',
      });
      mockPrisma.aIHumanHandoff.findFirst.mockResolvedValue({
        id: 'aih-db-1',
        publicHandoffId: HANDOFF_PUBLIC_ID,
        userId: PATIENT_A,
        status: AIHandoffStatus.REQUESTED,
        safetyLevel: 'ROUTINE',
        requestedUrgency: AIHandoffUrgency.ROUTINE,
        consentGranted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.aIHumanHandoff.update.mockResolvedValue({
        id: 'aih-db-1',
        publicHandoffId: HANDOFF_PUBLIC_ID,
        userId: PATIENT_A,
        assignedDoctorId: DOCTOR_PROFILE_ID,
        status: AIHandoffStatus.ACCEPTED,
        safetyLevel: 'ROUTINE',
        requestedUrgency: AIHandoffUrgency.ROUTINE,
        consentGranted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await handoffService.acceptHandoff(DOCTOR_USER_ID, HANDOFF_PUBLIC_ID);

      expect(res.status).toBe(AIHandoffStatus.ACCEPTED);
      expect(res.assignedDoctorId).toBe(DOCTOR_PROFILE_ID);
      expect(mockAudit.logEvent).toHaveBeenCalled();
    });

    it('should reject accepting already completed or cancelled handoff', async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue({
        id: DOCTOR_PROFILE_ID,
        userId: DOCTOR_USER_ID,
        verificationStatus: 'VERIFIED',
      });
      mockPrisma.aIHumanHandoff.findFirst.mockResolvedValue({
        id: 'aih-db-1',
        publicHandoffId: HANDOFF_PUBLIC_ID,
        userId: PATIENT_A,
        status: AIHandoffStatus.CANCELLED,
      });

      await expect(handoffService.acceptHandoff(DOCTOR_USER_ID, HANDOFF_PUBLIC_ID)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('Patient Handoff Cancellation', () => {
    it('should allow patient owner to cancel their own pending handoff', async () => {
      mockPrisma.aIHumanHandoff.findFirst.mockResolvedValue({
        id: 'aih-db-1',
        publicHandoffId: HANDOFF_PUBLIC_ID,
        userId: PATIENT_A,
        status: AIHandoffStatus.REQUESTED,
        safetyLevel: 'ROUTINE',
        requestedUrgency: AIHandoffUrgency.ROUTINE,
        consentGranted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.aIHumanHandoff.update.mockResolvedValue({
        id: 'aih-db-1',
        publicHandoffId: HANDOFF_PUBLIC_ID,
        userId: PATIENT_A,
        status: AIHandoffStatus.CANCELLED,
        safetyLevel: 'ROUTINE',
        requestedUrgency: AIHandoffUrgency.ROUTINE,
        consentGranted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await handoffService.cancelHandoff(PATIENT_A, HANDOFF_PUBLIC_ID);
      expect(res.status).toBe(AIHandoffStatus.CANCELLED);
      expect(mockAudit.logEvent).toHaveBeenCalled();
    });

    it('should forbid User B from cancelling User A handoff', async () => {
      mockPrisma.aIHumanHandoff.findFirst.mockResolvedValue({
        id: 'aih-db-1',
        publicHandoffId: HANDOFF_PUBLIC_ID,
        userId: PATIENT_A,
        status: AIHandoffStatus.REQUESTED,
      });

      await expect(handoffService.cancelHandoff(PATIENT_B, HANDOFF_PUBLIC_ID)).rejects.toThrow(
        ForbiddenError,
      );
    });
  });
});
