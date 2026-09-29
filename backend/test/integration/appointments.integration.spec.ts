import { describe, it, expect, beforeEach } from 'vitest';
import { AppointmentsService } from '../../src/modules/appointments/services/appointments.service.js';
import { AppointmentStateMachineService } from '../../src/modules/appointments/services/appointment-state-machine.service.js';
import { PreConsultationService } from '../../src/modules/appointments/services/pre-consultation.service.js';
import { AppointmentAuditService } from '../../src/modules/appointments/services/appointment-audit.service.js';
import { InMemoryAppointmentRepository } from '../../src/modules/appointments/repositories/in-memory-appointment.repository.js';
import { CareRelationshipsService } from '../../src/modules/care-relationships/services/care-relationships.service.js';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { InMemoryDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/repositories/in-memory-doctor-availability.repository.js';
import { ConsentAuditService } from '../../src/modules/care-relationships/services/consent-audit.service.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConsultationType } from '../../src/modules/doctor-availability/enums/consultation-type.enum.js';
import { OfferStatus } from '../../src/modules/doctor-availability/enums/offer-status.enum.js';
import { DayOfWeek } from '../../src/modules/doctor-availability/enums/day-of-week.enum.js';
import { AppointmentStatus } from '../../src/modules/appointments/enums/appointment-status.enum.js';
import { SlotReservationState } from '../../src/modules/appointments/enums/slot-reservation-state.enum.js';
import { PreConsultationStatus } from '../../src/modules/appointments/enums/pre-consultation-status.enum.js';
import { ConflictError } from '../../src/common/errors/app-error.js';

describe('Appointments Integration & Concurrency Tests', () => {
  let appointmentsService: AppointmentsService;
  let preConsultationService: PreConsultationService;
  let appointmentRepo: InMemoryAppointmentRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let availabilityRepo: InMemoryDoctorAvailabilityRepository;
  let careRelRepo: InMemoryCareRelationshipRepository;

  const PATIENT_A = 'patient-user-alpha';
  const PATIENT_B = 'patient-user-beta';
  const DOCTOR_USER = 'doctor-user-chief';

  let doctorId: string;
  let offerId: string;

  beforeEach(async () => {
    appointmentRepo = new InMemoryAppointmentRepository();
    doctorsRepo = new InMemoryDoctorsRepository();
    availabilityRepo = new InMemoryDoctorAvailabilityRepository();
    careRelRepo = new InMemoryCareRelationshipRepository();

    const auditService = new AppointmentAuditService();
    const consentAuditService = new ConsentAuditService();
    const stateMachine = new AppointmentStateMachineService();

    const careRelService = new CareRelationshipsService(
      careRelRepo,
      doctorsRepo,
      consentAuditService,
    );

    preConsultationService = new PreConsultationService(
      appointmentRepo,
      auditService,
      careRelService,
      doctorsRepo,
    );

    appointmentsService = new AppointmentsService(
      appointmentRepo,
      auditService,
      stateMachine,
      preConsultationService,
      careRelService,
      careRelRepo,
      doctorsRepo,
      availabilityRepo,
    );

    // Setup doctor
    const doc = await doctorsRepo.createProfile({
      userId: DOCTOR_USER,
      publicDoctorId: 'DOC-99887766',
      displayName: 'Dr. John Watson',
      medicalRegistrationNumber: 'MED-998877',
      licensingCouncil: 'General Medical Council',
      yearsOfExperience: 12,
      defaultConsultationFee: 120,
      currency: 'USD',
    });
    await doctorsRepo.updateVerificationStatus(doc.id, VerificationStatus.VERIFIED);
    doctorId = doc.id;

    // Doctor availability window (Full week 08:00 - 20:00)
    for (const day of Object.values(DayOfWeek)) {
      await availabilityRepo.createAvailability(doctorId, {
        timezone: 'UTC',
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '20:00',
      });
    }

    // Doctor consultation offer
    const offer = await availabilityRepo.createOffer(doctorId, {
      title: 'Comprehensive Diagnostic Consultation',
      consultationType: ConsultationType.INITIAL,
      durationMinutes: 45,
      fee: 120,
      currency: 'USD',
      status: OfferStatus.ACTIVE,
    });
    offerId = offer.id;
  });

  describe('CONCURRENCY & RACE CONDITION TEST (Mandatory)', () => {
    it('executes competing booking attempts simultaneously: exactly ONE succeeds and ONE fails with 409 Conflict', async () => {
      // Pick a valid future slot
      const targetSlotTime = new Date('2026-11-15T10:00:00.000Z').toISOString();

      // Launch simultaneous competing booking promises from Patient A and Patient B
      const [resA, resB] = await Promise.allSettled([
        appointmentsService.createAppointment(PATIENT_A, {
          doctorId,
          consultationOfferId: offerId,
          startAt: targetSlotTime,
          notes: 'Patient A booking attempt',
        }),
        appointmentsService.createAppointment(PATIENT_B, {
          doctorId,
          consultationOfferId: offerId,
          startAt: targetSlotTime,
          notes: 'Patient B booking attempt',
        }),
      ]);

      const fulfilled = [resA, resB].filter((r) => r.status === 'fulfilled');
      const rejected = [resA, resB].filter((r) => r.status === 'rejected');

      // Invariant: Exactly one must succeed
      expect(fulfilled).toHaveLength(1);
      // Invariant: Exactly one must be rejected
      expect(rejected).toHaveLength(1);

      // The rejected one must be a ConflictError (double booking prevention)
      const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectedError).toBeInstanceOf(ConflictError);
      expect(rejectedError.statusCode).toBe(409);
      expect(rejectedError.message).toContain('already reserved or booked');

      // Verify authoritative database state
      const { data: allAppointments } = await appointmentRepo.findAppointments({ doctorId });
      expect(allAppointments).toHaveLength(1);
      expect(allAppointments[0]!.startAt.toISOString()).toBe('2026-11-15T10:00:00.000Z');
      expect(allAppointments[0]!.status).toBe(AppointmentStatus.REQUESTED);
    });

    it('competing slot reservations: exactly ONE hold succeeds and second receives ConflictError', async () => {
      const targetSlotTime = new Date('2026-11-16T14:00:00.000Z').toISOString();

      const [holdA, holdB] = await Promise.allSettled([
        appointmentsService.reserveSlot(PATIENT_A, {
          doctorId,
          consultationOfferId: offerId,
          startAt: targetSlotTime,
          holdDurationMinutes: 15,
        }),
        appointmentsService.reserveSlot(PATIENT_B, {
          doctorId,
          consultationOfferId: offerId,
          startAt: targetSlotTime,
          holdDurationMinutes: 15,
        }),
      ]);

      const fulfilled = [holdA, holdB].filter((r) => r.status === 'fulfilled');
      const rejected = [holdA, holdB].filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectedError).toBeInstanceOf(ConflictError);
      expect(rejectedError.statusCode).toBe(409);
    });
  });

  describe('End-to-End Clinical Flow Integration', () => {
    it('executes full workflow: Reserve -> Request -> Intake Draft -> Intake Submit -> Doctor Accept -> Start -> Complete', async () => {
      const slotTime = new Date('2026-11-20T09:00:00.000Z').toISOString();

      // 1. Patient requests appointment
      const appt = await appointmentsService.createAppointment(PATIENT_A, {
        doctorId,
        consultationOfferId: offerId,
        startAt: slotTime,
        notes: 'Annual clinical evaluation',
      });

      expect(appt.status).toBe(AppointmentStatus.REQUESTED);
      expect(appt.reservationState).toBe(SlotReservationState.BOOKED);

      // 2. Patient completes intake draft
      const draft = await preConsultationService.saveDraft(PATIENT_A, appt.id, {
        reasonForVisit: 'General checkup and health maintenance',
        symptoms: 'Mild fatigue',
        currentMedications: 'Vitamin D3 1000 IU',
        allergies: 'None',
      });
      expect(draft.status).toBe(PreConsultationStatus.IN_PROGRESS);

      // 3. Patient finalizes and submits intake
      const submittedIntake = await preConsultationService.submitPreConsultation(
        PATIENT_A,
        appt.id,
      );
      expect(submittedIntake.status).toBe(PreConsultationStatus.SUBMITTED);
      expect(submittedIntake.submittedAt).not.toBeNull();

      // 4. Doctor reviews submitted intake
      const doctorIntakeReview = await preConsultationService.getPreConsultationForDoctor(
        DOCTOR_USER,
        appt.id,
      );
      expect(doctorIntakeReview.reasonForVisit).toBe('General checkup and health maintenance');

      // 5. Doctor accepts appointment
      const confirmedAppt = await appointmentsService.acceptDoctorAppointment(DOCTOR_USER, appt.id);
      expect(confirmedAppt.status).toBe(AppointmentStatus.CONFIRMED);
      expect(confirmedAppt.confirmedAt).not.toBeNull();

      // 6. Doctor starts consultation session
      const startedAppt = await appointmentsService.startDoctorAppointment(DOCTOR_USER, appt.id);
      expect(startedAppt.status).toBe(AppointmentStatus.IN_PROGRESS);

      // 7. Doctor completes consultation session
      const completedAppt = await appointmentsService.completeDoctorAppointment(
        DOCTOR_USER,
        appt.id,
      );
      expect(completedAppt.status).toBe(AppointmentStatus.COMPLETED);
      expect(completedAppt.completedAt).not.toBeNull();
    });

    it('cancels appointment and ensures the slot becomes bookable again', async () => {
      const slotTime = new Date('2026-11-25T11:00:00.000Z').toISOString();

      // Patient A books slot
      const appt = await appointmentsService.createAppointment(PATIENT_A, {
        doctorId,
        consultationOfferId: offerId,
        startAt: slotTime,
      });

      // Patient B cannot book while active
      await expect(
        appointmentsService.createAppointment(PATIENT_B, {
          doctorId,
          consultationOfferId: offerId,
          startAt: slotTime,
        }),
      ).rejects.toThrow(ConflictError);

      // Patient A cancels
      await appointmentsService.cancelPatientAppointment(PATIENT_A, appt.id, {
        reason: 'Change of plans',
      });

      // Now Patient B CAN book the released slot!
      const apptB = await appointmentsService.createAppointment(PATIENT_B, {
        doctorId,
        consultationOfferId: offerId,
        startAt: slotTime,
      });

      expect(apptB.status).toBe(AppointmentStatus.REQUESTED);
      expect(apptB.patientId).not.toBe(appt.patientId);
    });
  });
});
