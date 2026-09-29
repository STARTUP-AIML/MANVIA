import { describe, it, expect, beforeEach } from 'vitest';
import { RefundsService } from '../../src/modules/refunds/services/refunds.service.js';
import { InMemoryRefundRepository } from '../../src/modules/refunds/repositories/in-memory-refund.repository.js';
import { RefundAuditService } from '../../src/modules/refunds/services/refund-audit.service.js';
import { SimulatedRefundProvider } from '../../src/modules/refunds/providers/simulated-refund.provider.js';
import { InMemoryAppointmentRepository } from '../../src/modules/appointments/repositories/in-memory-appointment.repository.js';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { NotificationService } from '../../src/common/notifications/notification.service.js';
import { RefundStatus } from '../../src/modules/refunds/enums/refund-status.enum.js';
import { AppointmentStatus } from '../../src/modules/appointments/enums/appointment-status.enum.js';
import { SlotReservationState } from '../../src/modules/appointments/enums/slot-reservation-state.enum.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../src/common/errors/app-error.js';

describe('RefundsService (Unit Tests)', () => {
  let refundsService: RefundsService;
  let refundRepo: InMemoryRefundRepository;
  let appointmentRepo: InMemoryAppointmentRepository;
  let careRelRepo: InMemoryCareRelationshipRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let refundProvider: SimulatedRefundProvider;

  const PATIENT_USER = 'patient-user-123';
  const OTHER_PATIENT_USER = 'patient-user-456';
  const DOCTOR_USER = 'doctor-user-789';
  const ADMIN_USER = 'admin-user-000';

  let testAppointmentId: string;
  let testPatientProfileId: string;
  let testDoctorProfileId: string;

  beforeEach(async () => {
    refundRepo = new InMemoryRefundRepository();
    appointmentRepo = new InMemoryAppointmentRepository();
    careRelRepo = new InMemoryCareRelationshipRepository();
    doctorsRepo = new InMemoryDoctorsRepository();
    const auditService = new RefundAuditService();
    refundProvider = new SimulatedRefundProvider();
    const notificationService = new NotificationService();

    refundsService = new RefundsService(
      refundRepo,
      refundProvider,
      auditService,
      appointmentRepo,
      careRelRepo,
      doctorsRepo,
      notificationService,
    );

    // Setup doctor
    const doctor = await doctorsRepo.createProfile({
      userId: DOCTOR_USER,
      publicDoctorId: 'DOC-12345678',
      displayName: 'Dr. John Watson',
      medicalRegistrationNumber: 'MED-777',
      licensingCouncil: 'Council',
      yearsOfExperience: 10,
      defaultConsultationFee: 100,
      currency: 'USD',
    });
    testDoctorProfileId = doctor.id;

    // Setup patient
    const patient = await careRelRepo.createPatientProfile(PATIENT_USER, {
      publicPatientId: 'PAT-12345678',
      legalFirstName: 'Alice',
      legalLastName: 'Smith',
    });
    testPatientProfileId = patient.id;

    // Setup appointment
    const startAt = new Date(Date.now() + 48 * 3600 * 1000);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
    const appt = await appointmentRepo.createAppointment({
      patientId: testPatientProfileId,
      doctorId: testDoctorProfileId,
      consultationOfferId: 'offer-1',
      startAt,
      endAt,
      status: AppointmentStatus.CANCELLED,
      reservationState: SlotReservationState.AVAILABLE,
    });
    testAppointmentId = appt.id;
  });

  describe('createRefund', () => {
    it('should create and process a refund successfully', async () => {
      const response = await refundsService.createRefund(
        {
          appointmentId: testAppointmentId,
          amount: 100,
          currency: 'USD',
          reason: 'Cancelled >24h prior',
          idempotencyKey: 'idem-test-1',
        },
        PATIENT_USER,
        'PATIENT',
      );

      expect(response).toBeDefined();
      expect(response.publicRefundId).toMatch(/^REF-[A-Z0-9]{8}$/);
      expect(response.status).toBe(RefundStatus.SUCCEEDED);
      expect(response.amount).toBe(100);
      expect(response.currency).toBe('USD');
      expect(response.providerReference).toBeDefined();
    });

    it('should enforce idempotency and not create duplicate refund for same key', async () => {
      const first = await refundsService.createRefund(
        {
          appointmentId: testAppointmentId,
          amount: 100,
          currency: 'USD',
          reason: 'Duplicate retry test',
          idempotencyKey: 'idem-duplicate-key',
        },
        PATIENT_USER,
        'PATIENT',
      );

      const second = await refundsService.createRefund(
        {
          appointmentId: testAppointmentId,
          amount: 100,
          currency: 'USD',
          reason: 'Duplicate retry test',
          idempotencyKey: 'idem-duplicate-key',
        },
        PATIENT_USER,
        'PATIENT',
      );

      expect(second.id).toBe(first.id);
      expect(second.publicRefundId).toBe(first.publicRefundId);
    });

    it('should reject invalid amount', async () => {
      await expect(
        refundsService.createRefund(
          {
            appointmentId: testAppointmentId,
            amount: 0,
            currency: 'USD',
            reason: 'Zero amount',
          },
          PATIENT_USER,
          'PATIENT',
        ),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle simulated provider failure and mark status as FAILED', async () => {
      const response = await refundsService.createRefund(
        {
          appointmentId: testAppointmentId,
          amount: 100,
          currency: 'USD',
          reason: 'Trigger provider failure: fail-simulation',
          idempotencyKey: 'idem-fail-test',
        },
        PATIENT_USER,
        'PATIENT',
      );

      expect(response.status).toBe(RefundStatus.FAILED);
      expect(response.failureReason).toContain('Simulated provider failure');
    });
  });

  describe('getRefundById & Authorization', () => {
    let createdRefundPublicId: string;

    beforeEach(async () => {
      const ref = await refundsService.createRefund(
        {
          appointmentId: testAppointmentId,
          amount: 50,
          currency: 'USD',
          reason: 'Patient cancellation refund',
          idempotencyKey: 'idem-auth-test',
        },
        PATIENT_USER,
        'PATIENT',
      );
      createdRefundPublicId = ref.publicRefundId;
    });

    it('should allow patient who owns the appointment to view the refund', async () => {
      const ref = await refundsService.getRefundById(
        { userId: PATIENT_USER, activeRole: 'PATIENT' },
        createdRefundPublicId,
      );
      expect(ref.publicRefundId).toBe(createdRefundPublicId);
    });

    it('should allow assigned doctor to view the refund', async () => {
      const ref = await refundsService.getRefundById(
        { userId: DOCTOR_USER, activeRole: 'DOCTOR' },
        createdRefundPublicId,
      );
      expect(ref.publicRefundId).toBe(createdRefundPublicId);
    });

    it('should allow admin to view any refund', async () => {
      const ref = await refundsService.getRefundById(
        { userId: ADMIN_USER, activeRole: 'ADMIN' },
        createdRefundPublicId,
      );
      expect(ref.publicRefundId).toBe(createdRefundPublicId);
    });

    it('should forbid other patients from viewing another patient’s refund', async () => {
      await careRelRepo.createPatientProfile(OTHER_PATIENT_USER, {
        publicPatientId: 'PAT-99999999',
        legalFirstName: 'Bob',
        legalLastName: 'Jones',
      });

      await expect(
        refundsService.getRefundById(
          { userId: OTHER_PATIENT_USER, activeRole: 'PATIENT' },
          createdRefundPublicId,
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should return 404 for non-existent refund ID', async () => {
      await expect(
        refundsService.getRefundById({ userId: ADMIN_USER, activeRole: 'ADMIN' }, 'REF-NONEXIST'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
