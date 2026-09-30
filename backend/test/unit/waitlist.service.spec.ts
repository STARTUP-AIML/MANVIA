import { describe, it, expect, beforeEach } from 'vitest';
import { WaitlistService } from '../../src/modules/waitlist/services/waitlist.service.js';
import { InMemoryWaitlistRepository } from '../../src/modules/waitlist/repositories/in-memory-waitlist.repository.js';
import { WaitlistAuditService } from '../../src/modules/waitlist/services/waitlist-audit.service.js';
import { InMemoryAppointmentRepository } from '../../src/modules/appointments/repositories/in-memory-appointment.repository.js';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { CareRelationshipsService } from '../../src/modules/care-relationships/services/care-relationships.service.js';
import { ConsentAuditService } from '../../src/modules/care-relationships/services/consent-audit.service.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { InMemoryDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/repositories/in-memory-doctor-availability.repository.js';
import { NotificationService } from '../../src/common/notifications/notification.service.js';
import { WaitlistStatus } from '../../src/modules/waitlist/enums/waitlist-status.enum.js';
import { AppointmentStatus } from '../../src/modules/appointments/enums/appointment-status.enum.js';
import { SlotReservationState } from '../../src/modules/appointments/enums/slot-reservation-state.enum.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { OfferStatus } from '../../src/modules/doctor-availability/enums/offer-status.enum.js';
import { ConsultationType } from '../../src/modules/doctor-availability/enums/consultation-type.enum.js';
import { DayOfWeek } from '../../src/modules/doctor-availability/enums/day-of-week.enum.js';
import { ConflictError, ForbiddenError } from '../../src/common/errors/app-error.js';

describe('WaitlistService (Unit Tests)', () => {
  let waitlistService: WaitlistService;
  let waitlistRepo: InMemoryWaitlistRepository;
  let appointmentRepo: InMemoryAppointmentRepository;
  let careRelRepo: InMemoryCareRelationshipRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let availabilityRepo: InMemoryDoctorAvailabilityRepository;

  const PATIENT_USER_1 = 'patient-user-1';
  const PATIENT_USER_2 = 'patient-user-2';
  const DOCTOR_USER = 'doctor-user-1';

  let doctorId: string;
  let offerId: string;

  beforeEach(async () => {
    waitlistRepo = new InMemoryWaitlistRepository();
    appointmentRepo = new InMemoryAppointmentRepository();
    careRelRepo = new InMemoryCareRelationshipRepository();
    doctorsRepo = new InMemoryDoctorsRepository();
    availabilityRepo = new InMemoryDoctorAvailabilityRepository();

    const auditService = new WaitlistAuditService();
    const notificationService = new NotificationService();
    const consentAuditService = new ConsentAuditService();
    const careRelService = new CareRelationshipsService(
      careRelRepo,
      doctorsRepo,
      consentAuditService,
    );

    waitlistService = new WaitlistService(
      waitlistRepo,
      auditService,
      careRelService,
      careRelRepo,
      doctorsRepo,
      availabilityRepo,
      appointmentRepo,
      notificationService,
    );

    // Setup doctor
    const doctor = await doctorsRepo.createProfile({
      userId: DOCTOR_USER,
      publicDoctorId: 'DOC-WAIT-001',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-12345',
      licensingCouncil: 'Medical Board',
      yearsOfExperience: 15,
      defaultConsultationFee: 100,
      currency: 'USD',
    });
    await doctorsRepo.updateVerificationStatus(doctor.id, VerificationStatus.VERIFIED);
    doctorId = doctor.id;

    // Create consultation offer
    const offer = await availabilityRepo.createOffer(doctorId, {
      title: 'General Consultation',
      durationMinutes: 30,
      fee: 100,
      currency: 'USD',
      consultationType: ConsultationType.INITIAL,
      status: OfferStatus.ACTIVE,
    });
    offerId = offer.id;

    // Setup availability window on Mondays
    await availabilityRepo.createAvailability(doctorId, {
      timezone: 'UTC',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '17:00',
    });
  });

  describe('joinWaitlist', () => {
    it('should join waitlist and return active entry with publicWaitlistId', async () => {
      const entry = await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
        priority: 5,
        notes: 'Available on short notice',
      });

      expect(entry).toBeDefined();
      expect(entry.publicWaitlistId).toMatch(/^WTL-[A-Z0-9]{8}$/);
      expect(entry.status).toBe(WaitlistStatus.ACTIVE);
      expect(entry.priority).toBe(5);
      expect(entry.queuePosition).toBe(1);
    });

    it('should prevent joining waitlist twice for same doctor and offer', async () => {
      await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
      });

      await expect(
        waitlistService.joinWaitlist(PATIENT_USER_1, {
          doctorId,
          consultationOfferId: offerId,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should deterministic queue ordering by priority DESC and joinedAt ASC', async () => {
      // Patient 1 joins with priority 0
      const entry1 = await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
        priority: 0,
      });

      // Patient 2 joins with higher priority 10
      const entry2 = await waitlistService.joinWaitlist(PATIENT_USER_2, {
        doctorId,
        consultationOfferId: offerId,
        priority: 10,
      });

      // Patient 2 has higher priority, so queue position is 1
      const patient2Entry = await waitlistService.getPatientWaitlistEntryById(
        PATIENT_USER_2,
        entry2.id,
      );
      expect(patient2Entry.queuePosition).toBe(1);

      const patient1Entry = await waitlistService.getPatientWaitlistEntryById(
        PATIENT_USER_1,
        entry1.id,
      );
      expect(patient1Entry.queuePosition).toBe(2);
    });
  });

  describe('cancelWaitlistEntry', () => {
    it('should allow patient to leave/cancel their waitlist entry', async () => {
      const entry = await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
      });

      const cancelled = await waitlistService.leaveWaitlist(PATIENT_USER_1, entry.id);
      expect(cancelled.status).toBe(WaitlistStatus.CANCELLED);
      expect(cancelled.cancelledAt).toBeDefined();
    });

    it('should forbid other patients from cancelling someone else’s entry', async () => {
      const entry = await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
      });

      await expect(waitlistService.leaveWaitlist(PATIENT_USER_2, entry.id)).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('matchAndOfferSlot & Offer Acceptance Flow', () => {
    it('should offer available slot to highest priority waitlist candidate and hold reservation', async () => {
      await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
        priority: 1,
      });

      const slotStart = new Date('2026-10-05T10:00:00.000Z'); // Monday 10:00
      const slotEnd = new Date('2026-10-05T10:30:00.000Z');

      const matched = await waitlistService.matchAndOfferSlot(
        doctorId,
        slotStart,
        slotEnd,
        offerId,
      );

      expect(matched).not.toBeNull();
      expect(matched?.status).toBe(WaitlistStatus.OFFERED);
      expect(matched?.offeredAt).toBeDefined();
      expect(matched?.offerExpiresAt).toBeDefined();
      expect(matched?.offeredAppointmentId).toBeDefined();

      // Check temporary hold reservation
      const appt = await appointmentRepo.findAppointmentById(matched!.offeredAppointmentId!);
      expect(appt).toBeDefined();
      expect(appt?.status).toBe(AppointmentStatus.RESERVED);
      expect(appt?.reservationState).toBe(SlotReservationState.HELD_IN_RESERVATION);
    });

    it('should allow patient to accept offer and transition to CONFIRMED appointment and FULFILLED waitlist', async () => {
      const entry = await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
      });

      const slotStart = new Date('2026-10-05T10:00:00.000Z');
      const slotEnd = new Date('2026-10-05T10:30:00.000Z');
      await waitlistService.matchAndOfferSlot(doctorId, slotStart, slotEnd, offerId);

      const accepted = await waitlistService.acceptOffer(PATIENT_USER_1, entry.id);
      expect(accepted.status).toBe(WaitlistStatus.FULFILLED);
      expect(accepted.acceptedAt).toBeDefined();
      expect(accepted.fulfilledAt).toBeDefined();

      // The appointment should now be confirmed
      const patientEntries = await waitlistService.getPatientWaitlist(PATIENT_USER_1, {
        page: 1,
        limit: 10,
      });
      const target = patientEntries.data[0];
      expect(target!.status).toBe(WaitlistStatus.FULFILLED);
    });

    it('should allow patient to decline offer, release reservation and cascade offer to next candidate', async () => {
      // Patient 1
      const entry1 = await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
        priority: 5,
      });

      // Patient 2
      const entry2 = await waitlistService.joinWaitlist(PATIENT_USER_2, {
        doctorId,
        consultationOfferId: offerId,
        priority: 2,
      });

      const slotStart = new Date('2026-10-05T10:00:00.000Z');
      const slotEnd = new Date('2026-10-05T10:30:00.000Z');
      await waitlistService.matchAndOfferSlot(doctorId, slotStart, slotEnd, offerId);

      // Patient 1 declines
      const declined = await waitlistService.declineOffer(PATIENT_USER_1, entry1.id, {
        reason: 'Time does not suit me',
      });
      expect(declined.status).toBe(WaitlistStatus.DECLINED);

      // Patient 2 should now receive the offer
      const p2Entry = await waitlistService.getPatientWaitlistEntryById(PATIENT_USER_2, entry2.id);
      expect(p2Entry.status).toBe(WaitlistStatus.OFFERED);
    });
  });

  describe('processExpiredOffers', () => {
    it('should expire overdue offers and release held appointment slots', async () => {
      const entry = await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
      });

      const slotStart = new Date('2026-10-05T10:00:00.000Z');
      const slotEnd = new Date('2026-10-05T10:30:00.000Z');
      await waitlistService.matchAndOfferSlot(doctorId, slotStart, slotEnd, offerId);

      // Fast forward past offer expiry time
      const futureNow = new Date(Date.now() + 60 * 60 * 1000); // 1 hour later
      const expiredCount = await waitlistService.expireOffers(futureNow);

      expect(expiredCount).toBe(1);

      const expiredEntry = await waitlistService.getPatientWaitlistEntryById(
        PATIENT_USER_1,
        entry.id,
      );
      expect(expiredEntry.status).toBe(WaitlistStatus.EXPIRED);
    });
  });

  describe('fulfillActiveWaitlistForPatientAndDoctor', () => {
    it('should fulfill active waitlist entry on direct booking', async () => {
      const entry = await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
      });

      const patientProfile = await careRelRepo.findPatientByUserId(PATIENT_USER_1);
      expect(patientProfile).toBeDefined();

      await waitlistService.fulfillActiveWaitlistForPatientAndDoctor(patientProfile!.id, doctorId);

      const updated = await waitlistService.getPatientWaitlistEntryById(PATIENT_USER_1, entry.id);
      expect(updated.status).toBe(WaitlistStatus.FULFILLED);
      expect(updated.fulfilledAt).toBeDefined();
    });

    it('should cancel reserved appointment when waitlist was in OFFERED status and directly booked', async () => {
      const entry = await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
      });

      const slotStart = new Date('2026-10-05T10:00:00.000Z');
      const slotEnd = new Date('2026-10-05T10:30:00.000Z');
      await waitlistService.matchAndOfferSlot(doctorId, slotStart, slotEnd, offerId);

      const patientProfile = await careRelRepo.findPatientByUserId(PATIENT_USER_1);
      const rawEntry = await waitlistRepo.findById(entry.id);
      expect(rawEntry?.status).toBe(WaitlistStatus.OFFERED);
      expect(rawEntry?.offeredAppointmentId).toBeDefined();

      await waitlistService.fulfillActiveWaitlistForPatientAndDoctor(patientProfile!.id, doctorId);

      const appt = await appointmentRepo.findAppointmentById(rawEntry!.offeredAppointmentId!);
      expect(appt?.status).toBe(AppointmentStatus.CANCELLED);
      expect(appt?.reservationState).toBe(SlotReservationState.AVAILABLE);

      const updated = await waitlistService.getPatientWaitlistEntryById(PATIENT_USER_1, entry.id);
      expect(updated.status).toBe(WaitlistStatus.FULFILLED);
    });

    it('should silently handle patient with no active waitlist for doctor', async () => {
      await expect(
        waitlistService.fulfillActiveWaitlistForPatientAndDoctor('non-existent-pat', doctorId),
      ).resolves.toBeUndefined();
    });
  });

  describe('getDoctorWaitlist', () => {
    it('should return paginated entries for authenticated doctor', async () => {
      await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
      });

      const res = await waitlistService.getDoctorWaitlist(DOCTOR_USER, {
        page: 1,
        limit: 10,
      });

      expect(res.data.length).toBe(1);
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(10);
      expect(res.data[0]?.publicDoctorId).toBe('DOC-WAIT-001');
    });

    it('should throw NotFoundError if doctor profile does not exist', async () => {
      await expect(
        waitlistService.getDoctorWaitlist('non-doctor-user', { page: 1, limit: 10 }),
      ).rejects.toThrow(/Doctor profile not found/);
    });

    it('should map offered appointment and preferred dates in doctor waitlist response', async () => {
      await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
        preferredStartDate: '2026-10-15T00:00:00Z',
        preferredEndDate: '2026-10-20T00:00:00Z',
      });

      const startAt = new Date('2026-10-16T10:00:00Z');
      const endAt = new Date('2026-10-16T11:00:00Z');
      await waitlistService.matchAndOfferSlot(doctorId, startAt, endAt, offerId);

      const res = await waitlistService.getDoctorWaitlist(DOCTOR_USER, {
        page: 1,
        limit: 10,
      });

      expect(res.data.length).toBe(1);
      expect(res.data[0]?.offeredAppointmentPublicId).toBeDefined();
      expect(res.data[0]?.preferredStartDate).toBe('2026-10-15T00:00:00.000Z');
      expect(res.data[0]?.preferredEndDate).toBe('2026-10-20T00:00:00.000Z');
    });
  });

  describe('matchAndOfferSlot advanced paths', () => {
    it('should skip a candidate who has an overlapping active appointment and offer to next eligible candidate', async () => {
      // Candidate 1 (higher priority)
      await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
        priority: 10,
      });
      // Candidate 2 (lower priority)
      await waitlistService.joinWaitlist(PATIENT_USER_2, {
        doctorId,
        consultationOfferId: offerId,
        priority: 5,
      });

      const startAt = new Date('2026-10-22T14:00:00Z');
      const endAt = new Date('2026-10-22T15:00:00Z');

      // Create an existing overlapping appointment for patient 1 with a different doctor
      const anotherDoctor = await doctorsRepo.createProfile({
        userId: 'another-doctor-user',
        publicDoctorId: 'DOC-ANOTHER-01',
        displayName: 'Dr. Another',
        medicalRegistrationNumber: 'MED-9999',
        licensingCouncil: 'Medical Board',
        yearsOfExperience: 10,
        defaultConsultationFee: 100,
        currency: 'USD',
      });

      const patient1 = await careRelRepo.findPatientByUserId(PATIENT_USER_1);
      await appointmentRepo.createAppointment({
        patientId: patient1!.id,
        doctorId: anotherDoctor.id,
        consultationOfferId: offerId,
        startAt: new Date('2026-10-22T14:15:00Z'),
        endAt: new Date('2026-10-22T14:45:00Z'),
        status: AppointmentStatus.CONFIRMED,
        reservationState: SlotReservationState.HELD_IN_RESERVATION,
      });

      const offered = await waitlistService.matchAndOfferSlot(doctorId, startAt, endAt, offerId);

      expect(offered).not.toBeNull();
      const patient2 = await careRelRepo.findPatientByUserId(PATIENT_USER_2);
      expect(offered!.patientId).toBe(patient2!.id);
    });

    it('should return null when doctor already has an active overlapping appointment', async () => {
      await waitlistService.joinWaitlist(PATIENT_USER_1, {
        doctorId,
        consultationOfferId: offerId,
      });

      const startAt = new Date('2026-10-25T14:00:00Z');
      const endAt = new Date('2026-10-25T15:00:00Z');

      const patient1 = await careRelRepo.findPatientByUserId(PATIENT_USER_1);
      await appointmentRepo.createAppointment({
        patientId: patient1!.id,
        doctorId,
        consultationOfferId: offerId,
        startAt,
        endAt,
        status: AppointmentStatus.CONFIRMED,
        reservationState: SlotReservationState.HELD_IN_RESERVATION,
      });

      const offered = await waitlistService.matchAndOfferSlot(doctorId, startAt, endAt, offerId);
      expect(offered).toBeNull();
    });
  });
});
