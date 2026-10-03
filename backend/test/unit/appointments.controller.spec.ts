import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatientAppointmentsController } from '../../src/modules/appointments/controllers/patient-appointments.controller.js';
import { DoctorAppointmentsController } from '../../src/modules/appointments/controllers/doctor-appointments.controller.js';
import type { AppointmentsService } from '../../src/modules/appointments/services/appointments.service.js';
import type { PreConsultationService } from '../../src/modules/appointments/services/pre-consultation.service.js';
import { AppointmentStatus } from '../../src/modules/appointments/enums/appointment-status.enum.js';
import { SlotReservationState } from '../../src/modules/appointments/enums/slot-reservation-state.enum.js';
import type { CurrentUserContext } from '../../src/modules/doctors/interfaces/auth-context.interface.js';

describe('Appointments Controllers (Unit Tests)', () => {
  let patientController: PatientAppointmentsController;
  let doctorController: DoctorAppointmentsController;
  let appointmentsService: AppointmentsService;
  let preConsultationService: PreConsultationService;

  const mockPatientUser: CurrentUserContext = {
    userId: 'patient-user-1',
    activeRole: 'PATIENT',
  };

  const mockDoctorUser: CurrentUserContext = {
    userId: 'doctor-user-1',
    activeRole: 'DOCTOR',
  };

  const mockAppointmentResponse = {
    id: 'appt-uuid-1',
    publicAppointmentId: 'APT-12345678',
    patientId: 'pat-1',
    doctorId: 'doc-1',
    consultationOfferId: 'off-1',
    startAt: '2026-10-05T10:00:00.000Z',
    endAt: '2026-10-05T10:30:00.000Z',
    status: AppointmentStatus.REQUESTED,
    reservationState: SlotReservationState.BOOKED,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };

  const mockCancellationDetails = {
    id: 'cnl-1',
    appointmentId: 'appt-uuid-1',
    publicAppointmentId: 'APT-12345678',
    cancelledBy: 'PAT-123',
    cancellationActorType: 'PATIENT',
    reason: 'Schedule conflict',
    reasonCode: null,
    cancelledAt: '2026-10-01T12:00:00.000Z',
  };

  beforeEach(() => {
    appointmentsService = {
      reserveSlot: vi.fn().mockResolvedValue(mockAppointmentResponse),
      createAppointment: vi.fn().mockResolvedValue(mockAppointmentResponse),
      getPatientAppointments: vi.fn().mockResolvedValue({
        data: [mockAppointmentResponse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
      getPatientAppointmentById: vi.fn().mockResolvedValue(mockAppointmentResponse),
      cancelPatientAppointment: vi.fn().mockResolvedValue({
        ...mockAppointmentResponse,
        status: AppointmentStatus.CANCELLED,
      }),
      getAppointmentCancellation: vi.fn().mockResolvedValue(mockCancellationDetails),
      getDoctorAppointments: vi.fn().mockResolvedValue({
        data: [mockAppointmentResponse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
      getDoctorAppointmentById: vi.fn().mockResolvedValue(mockAppointmentResponse),
      acceptDoctorAppointment: vi.fn().mockResolvedValue({
        ...mockAppointmentResponse,
        status: AppointmentStatus.CONFIRMED,
      }),
      declineDoctorAppointment: vi.fn().mockResolvedValue({
        ...mockAppointmentResponse,
        status: AppointmentStatus.DECLINED,
      }),
      cancelDoctorAppointment: vi.fn().mockResolvedValue({
        ...mockAppointmentResponse,
        status: AppointmentStatus.CANCELLED,
      }),
      startDoctorAppointment: vi.fn().mockResolvedValue({
        ...mockAppointmentResponse,
        status: AppointmentStatus.IN_PROGRESS,
      }),
      completeDoctorAppointment: vi.fn().mockResolvedValue({
        ...mockAppointmentResponse,
        status: AppointmentStatus.COMPLETED,
      }),
      markNoShowDoctorAppointment: vi.fn().mockResolvedValue({
        ...mockAppointmentResponse,
        status: AppointmentStatus.NO_SHOW,
      }),
    } as unknown as AppointmentsService;

    preConsultationService = {
      saveDraft: vi.fn().mockResolvedValue({}),
      submitPreConsultation: vi.fn().mockResolvedValue({}),
      getPreConsultationForPatient: vi.fn().mockResolvedValue({}),
      getPreConsultationForDoctor: vi.fn().mockResolvedValue({}),
    } as unknown as PreConsultationService;

    patientController = new PatientAppointmentsController(
      appointmentsService,
      preConsultationService,
    );
    doctorController = new DoctorAppointmentsController(
      appointmentsService,
      preConsultationService,
    );
  });

  describe('PatientAppointmentsController', () => {
    it('should reserve slot', async () => {
      const res = await patientController.reserveSlot(mockPatientUser, {
        doctorId: 'doc-1',
        consultationOfferId: 'off-1',
        startAt: '2026-10-05T10:00:00.000Z',
      });
      expect(res.publicAppointmentId).toBe('APT-12345678');
      expect(appointmentsService.reserveSlot).toHaveBeenCalled();
    });

    it('should cancel appointment', async () => {
      const res = await patientController.cancelAppointment(mockPatientUser, 'appt-uuid-1', {
        reason: 'Conflict',
      });
      expect(res.status).toBe(AppointmentStatus.CANCELLED);
      expect(appointmentsService.cancelPatientAppointment).toHaveBeenCalled();
    });

    it('should view cancellation details', async () => {
      const res = await patientController.getCancellation(mockPatientUser, 'appt-uuid-1');
      expect(res.cancellationActorType).toBe('PATIENT');
      expect(appointmentsService.getAppointmentCancellation).toHaveBeenCalledWith(
        mockPatientUser,
        'appt-uuid-1',
      );
    });
  });

  describe('DoctorAppointmentsController', () => {
    it('should accept appointment', async () => {
      const res = await doctorController.acceptAppointment(mockDoctorUser, 'appt-uuid-1');
      expect(res.status).toBe(AppointmentStatus.CONFIRMED);
      expect(appointmentsService.acceptDoctorAppointment).toHaveBeenCalledWith(
        mockDoctorUser.userId,
        'appt-uuid-1',
      );
    });

    it('should view doctor cancellation record', async () => {
      const res = await doctorController.getCancellation(mockDoctorUser, 'appt-uuid-1');
      expect(res.cancellationActorType).toBe('PATIENT');
      expect(appointmentsService.getAppointmentCancellation).toHaveBeenCalledWith(
        mockDoctorUser,
        'appt-uuid-1',
      );
    });
  });
});
