import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WaitlistController } from '../../src/modules/waitlist/controllers/waitlist.controller.js';
import { DoctorWaitlistController } from '../../src/modules/waitlist/controllers/doctor-waitlist.controller.js';
import type { WaitlistService } from '../../src/modules/waitlist/services/waitlist.service.js';
import { WaitlistStatus } from '../../src/modules/waitlist/enums/waitlist-status.enum.js';
import type { CurrentUserContext } from '../../src/modules/doctors/interfaces/auth-context.interface.js';

describe('Waitlist Controllers (Unit Tests)', () => {
  let patientController: WaitlistController;
  let doctorController: DoctorWaitlistController;
  let service: WaitlistService;

  const mockPatient: CurrentUserContext = {
    userId: 'patient-user-1',
    activeRole: 'PATIENT',
  };

  const mockDoctor: CurrentUserContext = {
    userId: 'doctor-user-1',
    activeRole: 'DOCTOR',
  };

  const mockWaitlistEntry = {
    id: 'wtl-uuid-1',
    publicWaitlistId: 'WTL-ABC12345',
    publicPatientId: 'PAT-11111111',
    publicDoctorId: 'DOC-22222222',
    doctorDisplayName: 'Dr. Gregory House',
    consultationOfferId: 'offer-1',
    priority: 0,
    status: WaitlistStatus.ACTIVE,
    preferredStartDate: null,
    preferredEndDate: null,
    notes: 'Morning please',
    joinedAt: '2026-10-01T10:00:00.000Z',
    offeredAt: null,
    offerExpiresAt: null,
    acceptedAt: null,
    declinedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    offeredAppointmentPublicId: null,
    queuePosition: 1,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };

  beforeEach(() => {
    service = {
      joinWaitlist: vi.fn().mockResolvedValue(mockWaitlistEntry),
      getPatientWaitlist: vi.fn().mockResolvedValue({
        data: [mockWaitlistEntry],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
      getPatientWaitlistEntryById: vi.fn().mockResolvedValue(mockWaitlistEntry),
      leaveWaitlist: vi.fn().mockResolvedValue({
        ...mockWaitlistEntry,
        status: WaitlistStatus.CANCELLED,
      }),
      acceptOffer: vi.fn().mockResolvedValue({
        ...mockWaitlistEntry,
        status: WaitlistStatus.FULFILLED,
      }),
      declineOffer: vi.fn().mockResolvedValue({
        ...mockWaitlistEntry,
        status: WaitlistStatus.DECLINED,
      }),
      getDoctorWaitlist: vi.fn().mockResolvedValue({
        data: [mockWaitlistEntry],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
    } as unknown as WaitlistService;

    patientController = new WaitlistController(service);
    doctorController = new DoctorWaitlistController(service);
  });

  describe('WaitlistController (Patient)', () => {
    it('should join waitlist', async () => {
      const res = await patientController.joinWaitlist(mockPatient, {
        doctorId: 'doc-uuid-1',
        consultationOfferId: 'offer-uuid-1',
      });
      expect(res.publicWaitlistId).toBe('WTL-ABC12345');
      expect(service.joinWaitlist).toHaveBeenCalledWith(mockPatient.userId, {
        doctorId: 'doc-uuid-1',
        consultationOfferId: 'offer-uuid-1',
      });
    });

    it('should get patient waitlist', async () => {
      const res = await patientController.getWaitlist(mockPatient, { page: 1, limit: 20 });
      expect(res.data.length).toBe(1);
      expect(service.getPatientWaitlist).toHaveBeenCalledWith(mockPatient.userId, {
        page: 1,
        limit: 20,
      });
    });

    it('should get entry by id', async () => {
      const res = await patientController.getWaitlistEntryById(mockPatient, 'wtl-uuid-1');
      expect(res.id).toBe('wtl-uuid-1');
      expect(service.getPatientWaitlistEntryById).toHaveBeenCalledWith(
        mockPatient.userId,
        'wtl-uuid-1',
      );
    });

    it('should leave waitlist', async () => {
      const res = await patientController.leaveWaitlist(mockPatient, 'wtl-uuid-1');
      expect(res.status).toBe(WaitlistStatus.CANCELLED);
      expect(service.leaveWaitlist).toHaveBeenCalledWith(mockPatient.userId, 'wtl-uuid-1');
    });

    it('should accept offer', async () => {
      const res = await patientController.acceptOffer(mockPatient, 'wtl-uuid-1');
      expect(res.status).toBe(WaitlistStatus.FULFILLED);
      expect(service.acceptOffer).toHaveBeenCalledWith(mockPatient.userId, 'wtl-uuid-1');
    });

    it('should decline offer', async () => {
      const res = await patientController.declineOffer(mockPatient, 'wtl-uuid-1', {
        reason: 'Busy',
      });
      expect(res.status).toBe(WaitlistStatus.DECLINED);
      expect(service.declineOffer).toHaveBeenCalledWith(mockPatient.userId, 'wtl-uuid-1', {
        reason: 'Busy',
      });
    });
  });

  describe('DoctorWaitlistController', () => {
    it('should get doctor waitlist', async () => {
      const res = await doctorController.getDoctorWaitlist(mockDoctor, { page: 1, limit: 20 });
      expect(res.data.length).toBe(1);
      expect(service.getDoctorWaitlist).toHaveBeenCalledWith(mockDoctor.userId, {
        page: 1,
        limit: 20,
      });
    });
  });
});
