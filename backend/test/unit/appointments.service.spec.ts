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
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../src/common/errors/app-error.js';

describe('AppointmentsService (Unit Tests)', () => {
  let service: AppointmentsService;
  let appointmentRepo: InMemoryAppointmentRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let availabilityRepo: InMemoryDoctorAvailabilityRepository;
  let careRelRepo: InMemoryCareRelationshipRepository;
  let careRelService: CareRelationshipsService;

  const PATIENT_USER = 'patient-user-1';
  const OTHER_PATIENT_USER = 'patient-user-2';
  const DOCTOR_USER = 'doctor-user-1';
  const OTHER_DOCTOR_USER = 'doctor-user-2';

  let verifiedDoctorId: string;
  let unverifiedDoctorId: string;
  let otherDoctorId: string;
  let validOfferId: string;
  let otherDoctorOfferId: string;

  beforeEach(async () => {
    appointmentRepo = new InMemoryAppointmentRepository();
    doctorsRepo = new InMemoryDoctorsRepository();
    availabilityRepo = new InMemoryDoctorAvailabilityRepository();
    careRelRepo = new InMemoryCareRelationshipRepository();

    const auditService = new AppointmentAuditService();
    const consentAuditService = new ConsentAuditService();
    const stateMachine = new AppointmentStateMachineService();

    careRelService = new CareRelationshipsService(careRelRepo, doctorsRepo, consentAuditService);

    const preConsultationService = new PreConsultationService(
      appointmentRepo,
      auditService,
      careRelService,
      doctorsRepo,
    );

    service = new AppointmentsService(
      appointmentRepo,
      auditService,
      stateMachine,
      preConsultationService,
      careRelService,
      careRelRepo,
      doctorsRepo,
      availabilityRepo,
    );

    // 1. Create verified doctor
    const doc1 = await doctorsRepo.createProfile({
      userId: DOCTOR_USER,
      publicDoctorId: 'DOC-11111111',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-12345',
      licensingCouncil: 'Medical Board',
      yearsOfExperience: 15,
      defaultConsultationFee: 100,
      currency: 'USD',
    });
    await doctorsRepo.updateVerificationStatus(doc1.id, VerificationStatus.VERIFIED);
    verifiedDoctorId = doc1.id;

    // 2. Create unverified doctor
    const docUnverified = await doctorsRepo.createProfile({
      userId: 'unverified-user',
      publicDoctorId: 'DOC-00000000',
      displayName: 'Dr. Fake Physician',
      medicalRegistrationNumber: 'MED-00000',
      licensingCouncil: 'Medical Board',
      yearsOfExperience: 1,
      defaultConsultationFee: 50,
      currency: 'USD',
    });
    unverifiedDoctorId = docUnverified.id;

    // 3. Create another doctor
    const doc2 = await doctorsRepo.createProfile({
      userId: OTHER_DOCTOR_USER,
      publicDoctorId: 'DOC-22222222',
      displayName: 'Dr. Allison Cameron',
      medicalRegistrationNumber: 'MED-67890',
      licensingCouncil: 'Medical Board',
      yearsOfExperience: 8,
      defaultConsultationFee: 80,
      currency: 'USD',
    });
    await doctorsRepo.updateVerificationStatus(doc2.id, VerificationStatus.VERIFIED);
    otherDoctorId = doc2.id;

    // 4. Create consultation offer for verified doctor
    const offer1 = await availabilityRepo.createOffer(verifiedDoctorId, {
      title: 'General Clinical Review',
      consultationType: ConsultationType.INITIAL,
      durationMinutes: 30,
      fee: 100,
      currency: 'USD',
      status: OfferStatus.ACTIVE,
    });
    validOfferId = offer1.id;

    // 5. Create consultation offer for doctor 2
    const offer2 = await availabilityRepo.createOffer(otherDoctorId, {
      title: 'Pediatric Care',
      consultationType: ConsultationType.INITIAL,
      durationMinutes: 30,
      fee: 80,
      currency: 'USD',
      status: OfferStatus.ACTIVE,
    });
    otherDoctorOfferId = offer2.id;
  });

  describe('Eligibility & Validation Controls', () => {
    it('rejects booking with an unverified doctor', async () => {
      const futureStart = new Date(Date.now() + 86400000).toISOString();
      await expect(
        service.createAppointment(PATIENT_USER, {
          doctorId: unverifiedDoctorId,
          consultationOfferId: validOfferId,
          startAt: futureStart,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects booking when consultation offer belongs to a different doctor', async () => {
      const futureStart = new Date(Date.now() + 86400000).toISOString();
      await expect(
        service.createAppointment(PATIENT_USER, {
          doctorId: verifiedDoctorId,
          consultationOfferId: otherDoctorOfferId,
          startAt: futureStart,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects booking when consultation offer is not active', async () => {
      const inactiveOffer = await availabilityRepo.createOffer(verifiedDoctorId, {
        title: 'Archived Offer',
        consultationType: ConsultationType.INITIAL,
        durationMinutes: 30,
        fee: 100,
        currency: 'USD',
        status: OfferStatus.INACTIVE,
      });

      const futureStart = new Date(Date.now() + 86400000).toISOString();
      await expect(
        service.createAppointment(PATIENT_USER, {
          doctorId: verifiedDoctorId,
          consultationOfferId: inactiveOffer.id,
          startAt: futureStart,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects booking with past timestamp', async () => {
      const pastStart = new Date(Date.now() - 3600000).toISOString();
      await expect(
        service.createAppointment(PATIENT_USER, {
          doctorId: verifiedDoctorId,
          consultationOfferId: validOfferId,
          startAt: pastStart,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects booking outside doctor published availability schedule', async () => {
      // Add schedule for Mondays only 09:00 - 17:00
      await availabilityRepo.createAvailability(verifiedDoctorId, {
        timezone: 'UTC',
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        endTime: '17:00',
      });

      // Target Tuesday slot
      const tuesday = new Date('2026-10-06T10:00:00.000Z').toISOString();
      await expect(
        service.createAppointment(PATIENT_USER, {
          doctorId: verifiedDoctorId,
          consultationOfferId: validOfferId,
          startAt: tuesday,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Slot Reservation & Booking', () => {
    it('successfully reserves a slot in HELD_IN_RESERVATION state', async () => {
      const futureStart = new Date(Date.now() + 86400000).toISOString();
      const res = await service.reserveSlot(PATIENT_USER, {
        doctorId: verifiedDoctorId,
        consultationOfferId: validOfferId,
        startAt: futureStart,
        holdDurationMinutes: 15,
      });

      expect(res.status).toBe(AppointmentStatus.RESERVED);
      expect(res.reservationState).toBe(SlotReservationState.HELD_IN_RESERVATION);
      expect(res.reservedUntil).not.toBeNull();
      expect(res.publicAppointmentId).toMatch(/^APT-[A-Z0-9]{8}$/);
    });

    it('successfully creates an appointment in REQUESTED state with pre-consultation draft', async () => {
      const futureStart = new Date(Date.now() + 86400000).toISOString();
      const res = await service.createAppointment(PATIENT_USER, {
        doctorId: verifiedDoctorId,
        consultationOfferId: validOfferId,
        startAt: futureStart,
        notes: 'Needs immediate diagnostic review',
        preConsultation: {
          reasonForVisit: 'Persistent migraines with aura',
          symptoms: 'Vision blurriness and nausea',
        },
      });

      expect(res.status).toBe(AppointmentStatus.REQUESTED);
      expect(res.reservationState).toBe(SlotReservationState.BOOKED);
      expect(res.hasPreConsultation).toBe(true);
      expect(res.preConsultation).toBeDefined();
    });

    it('prevents overlapping bookings for the same doctor and slot', async () => {
      const futureStart = new Date(Date.now() + 86400000).toISOString();
      await service.createAppointment(PATIENT_USER, {
        doctorId: verifiedDoctorId,
        consultationOfferId: validOfferId,
        startAt: futureStart,
      });

      // Second booking attempt on exact same time
      await expect(
        service.createAppointment(OTHER_PATIENT_USER, {
          doctorId: verifiedDoctorId,
          consultationOfferId: validOfferId,
          startAt: futureStart,
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('Doctor Actions & Lifecycle Transitions', () => {
    let appointmentId: string;

    beforeEach(async () => {
      const futureStart = new Date(Date.now() + 86400000).toISOString();
      const appt = await service.createAppointment(PATIENT_USER, {
        doctorId: verifiedDoctorId,
        consultationOfferId: validOfferId,
        startAt: futureStart,
      });
      appointmentId = appt.id;
    });

    it('allows assigned physician to confirm appointment', async () => {
      const confirmed = await service.acceptDoctorAppointment(DOCTOR_USER, appointmentId);
      expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);
      expect(confirmed.confirmedAt).not.toBeNull();
    });

    it('allows assigned physician to decline appointment and releases slot to AVAILABLE', async () => {
      const declined = await service.declineDoctorAppointment(DOCTOR_USER, appointmentId, {
        reason: 'Physician unavailable due to emergency surgery',
      });
      expect(declined.status).toBe(AppointmentStatus.DECLINED);
      expect(declined.reservationState).toBe(SlotReservationState.AVAILABLE);
      expect(declined.declineReason).toBe('Physician unavailable due to emergency surgery');
    });

    it('allows patient to cancel appointment and releases slot to AVAILABLE', async () => {
      const cancelled = await service.cancelPatientAppointment(PATIENT_USER, appointmentId, {
        reason: 'Schedule conflict',
      });
      expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);
      expect(cancelled.reservationState).toBe(SlotReservationState.AVAILABLE);
    });

    it('progresses confirmed appointment: CONFIRMED -> IN_PROGRESS -> COMPLETED', async () => {
      await service.acceptDoctorAppointment(DOCTOR_USER, appointmentId);
      const started = await service.startDoctorAppointment(DOCTOR_USER, appointmentId);
      expect(started.status).toBe(AppointmentStatus.IN_PROGRESS);

      const completed = await service.completeDoctorAppointment(DOCTOR_USER, appointmentId);
      expect(completed.status).toBe(AppointmentStatus.COMPLETED);
      expect(completed.completedAt).not.toBeNull();
    });

    it('allows physician to record patient NO_SHOW for confirmed appointment', async () => {
      await service.acceptDoctorAppointment(DOCTOR_USER, appointmentId);
      const noShow = await service.markNoShowDoctorAppointment(DOCTOR_USER, appointmentId);
      expect(noShow.status).toBe(AppointmentStatus.NO_SHOW);
      expect(noShow.noShowAt).not.toBeNull();
    });

    it('rejects another physician trying to act on the appointment', async () => {
      await expect(
        service.acceptDoctorAppointment(OTHER_DOCTOR_USER, appointmentId),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects another patient trying to cancel the appointment', async () => {
      await expect(
        service.cancelPatientAppointment(OTHER_PATIENT_USER, appointmentId, {
          reason: 'Unauthorized cancel attempt',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
