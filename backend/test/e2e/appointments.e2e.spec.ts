import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DOCTORS_REPOSITORY } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import type { IDoctorsRepository } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import { DOCTOR_AVAILABILITY_REPOSITORY } from '../../src/modules/doctor-availability/interfaces/availability-repository.interface.js';
import type { IDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/interfaces/availability-repository.interface.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConsultationType } from '../../src/modules/doctor-availability/enums/consultation-type.enum.js';
import { OfferStatus } from '../../src/modules/doctor-availability/enums/offer-status.enum.js';
import { DayOfWeek } from '../../src/modules/doctor-availability/enums/day-of-week.enum.js';
import { AppointmentStatus } from '../../src/modules/appointments/enums/appointment-status.enum.js';
import { PreConsultationStatus } from '../../src/modules/appointments/enums/pre-consultation-status.enum.js';
import {
  setupE2EApp,
  createE2EUser,
  cleanupE2EUsers,
  type E2EUser,
} from './helpers/auth.helper.js';

describe('Appointments & Pre-consultation HTTP API (E2E)', () => {
  let app: NestFastifyApplication;
  let doctorsRepo: IDoctorsRepository;
  let availabilityRepo: IDoctorAvailabilityRepository;

  let doctorUser: E2EUser;
  let patientAUser: E2EUser;
  let patientBUser: E2EUser;

  let doctorId: string;
  let offerId: string;

  beforeAll(async () => {
    app = await setupE2EApp();

    doctorUser = await createE2EUser(app, { role: 'DOCTOR' });
    patientAUser = await createE2EUser(app, { role: 'PATIENT' });
    patientBUser = await createE2EUser(app, { role: 'PATIENT' });

    doctorsRepo = app.get<IDoctorsRepository>(DOCTORS_REPOSITORY);
    availabilityRepo = app.get<IDoctorAvailabilityRepository>(DOCTOR_AVAILABILITY_REPOSITORY);

    // 1. Setup Doctor Profile & Verification
    const specialties = await doctorsRepo.findActiveSpecialties();
    const languages = await doctorsRepo.findAllLanguages();

    const doc = await doctorsRepo.createProfile({
      userId: doctorUser.id,
      publicDoctorId: 'DOC-55443322',
      displayName: 'Dr. Gregory House, MD',
      medicalRegistrationNumber: 'MED-E2E-APPT-01',
      licensingCouncil: 'Medical Board of Diagnostics',
      yearsOfExperience: 18,
      defaultConsultationFee: 150,
      currency: 'USD',
      specialties: [{ specialtyId: specialties[0]?.id ?? 'default-spec', isPrimary: true }],
      languages: [{ languageId: languages[0]?.id ?? 'default-lang' }],
    });
    await doctorsRepo.updateVerificationStatus(doc.id, VerificationStatus.VERIFIED);
    doctorId = doc.id;

    // 2. Setup Doctor Availability (Monday-Sunday 08:00 - 20:00 UTC)
    for (const day of Object.values(DayOfWeek)) {
      await availabilityRepo.createAvailability(doctorId, {
        timezone: 'UTC',
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '20:00',
      });
    }

    // 3. Setup Consultation Offer
    const offer = await availabilityRepo.createOffer(doctorId, {
      title: 'Initial Consultation',
      consultationType: ConsultationType.INITIAL,
      durationMinutes: 30,
      fee: 150,
      currency: 'USD',
      status: OfferStatus.ACTIVE,
    });
    offerId = offer.id;
  }, 60000);

  afterAll(async () => {
    if (app) {
      await cleanupE2EUsers(app, [doctorUser?.email, patientAUser?.email, patientBUser?.email]);
      await app.close();
    }
  });

  describe('Slot Reservation (POST /api/v1/appointments/reserve)', () => {
    it('holds an available slot for 15 minutes', async () => {
      const startAt = new Date('2026-12-01T10:00:00.000Z').toISOString();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments/reserve',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId,
          startAt,
          holdDurationMinutes: 15,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe(AppointmentStatus.RESERVED);
      expect(body.reservationState).toBe('HELD_IN_RESERVATION');
      expect(body.reservedUntil).not.toBeNull();
      expect(body.publicAppointmentId).toMatch(/^APT-[A-Z0-9]{8}$/);
    });
  });

  describe('Appointment Creation & Race Condition Prevention (POST /api/v1/appointments)', () => {
    const slotTime = new Date('2026-12-02T14:00:00.000Z').toISOString();
    let createdAppointmentId: string;

    it('creates a new consultation appointment in REQUESTED status', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId,
          startAt: slotTime,
          notes: 'Initial clinical evaluation',
          preConsultation: {
            reasonForVisit: 'Frequent headaches and low energy',
            symptoms: 'Mild light sensitivity',
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.status).toBe(AppointmentStatus.REQUESTED);
      expect(body.reservationState).toBe('BOOKED');
      expect(body.hasPreConsultation).toBe(true);
      createdAppointmentId = body.id;
      expect(createdAppointmentId).toBeDefined();
    });

    it('prevents double-booking: returns 409 Conflict when second patient requests same slot', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientBUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId,
          startAt: slotTime,
          notes: 'Patient B competing attempt',
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.message).toContain('already reserved or booked');
    });

    it('rejects booking unverified doctor', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientAUser.headers,
        payload: {
          doctorId: '00000000-0000-0000-0000-000000000000',
          consultationOfferId: offerId,
          startAt: new Date('2026-12-03T10:00:00.000Z').toISOString(),
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Pre-Consultation Clinical Intake Lifecycle', () => {
    let apptId: string;

    beforeAll(async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId,
          startAt: new Date('2026-12-05T09:00:00.000Z').toISOString(),
        },
      });
      expect(res.statusCode).toBe(201);
      apptId = JSON.parse(res.body).id;
    });

    it('saves draft intake data (POST /api/v1/appointments/:id/pre-consultation)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/appointments/${apptId}/pre-consultation`,
        headers: patientAUser.headers,
        payload: {
          reasonForVisit: 'Persistent knee inflammation',
          symptoms: 'Swelling and warmth over right knee',
          currentMedications: 'Naproxen 500mg',
          allergies: 'None known',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe(PreConsultationStatus.IN_PROGRESS);
      expect(body.reasonForVisit).toBe('Persistent knee inflammation');
      expect(body.submittedAt).toBeNull();
    });

    it('submits and locks pre-consultation intake (POST /api/v1/appointments/:id/pre-consultation/submit)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/appointments/${apptId}/pre-consultation/submit`,
        headers: patientAUser.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe(PreConsultationStatus.SUBMITTED);
      expect(body.submittedAt).not.toBeNull();
    });

    it('rejects changes to intake once submitted (Immutability)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/appointments/${apptId}/pre-consultation`,
        headers: patientAUser.headers,
        payload: {
          reasonForVisit: 'Attempting to change submitted medical answers',
        },
      });

      expect(res.statusCode).toBe(409);
    });

    it('allows assigned physician to view submitted intake (GET /api/v1/doctor/appointments/:id/pre-consultation)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/doctor/appointments/${apptId}/pre-consultation`,
        headers: doctorUser.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.reasonForVisit).toBe('Persistent knee inflammation');
      expect(body.status).toBe(PreConsultationStatus.SUBMITTED);
    });
  });

  describe('Doctor Lifecycle Actions & Confirmation Flow', () => {
    let apptId: string;

    beforeAll(async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId,
          startAt: new Date('2026-12-10T11:00:00.000Z').toISOString(),
        },
      });
      expect(res.statusCode).toBe(201);
      apptId = JSON.parse(res.body).id;
    });

    it('doctor confirms appointment (POST /api/v1/doctor/appointments/:id/accept)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/doctor/appointments/${apptId}/accept`,
        headers: doctorUser.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe(AppointmentStatus.CONFIRMED);
      expect(body.confirmedAt).not.toBeNull();
    });

    it('doctor starts appointment (POST /api/v1/doctor/appointments/:id/start)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/doctor/appointments/${apptId}/start`,
        headers: doctorUser.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe(AppointmentStatus.IN_PROGRESS);
      expect(body.startedAt).not.toBeNull();
    });

    it('doctor completes appointment (POST /api/v1/doctor/appointments/:id/complete)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/doctor/appointments/${apptId}/complete`,
        headers: doctorUser.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe(AppointmentStatus.COMPLETED);
      expect(body.completedAt).not.toBeNull();
    });
  });

  describe('Authorization & Security Controls', () => {
    it('returns 401 Unauthorized when credentials are missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/appointments',
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 Forbidden when patient tries to access doctor endpoints', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/doctor/appointments',
        headers: patientAUser.headers,
      });
      expect(res.statusCode).toBe(403);
    });

    it('SECURITY: Forged identity headers cannot grant patient access to doctor endpoints', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/doctor/appointments',
        headers: {
          ...patientAUser.headers,
          'x-user-id': doctorUser.id,
          'x-user-role': 'DOCTOR',
          'x-active-role': 'DOCTOR',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when Patient B attempts to cancel Patient A appointment', async () => {
      // Create appointment for Patient A
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId,
          startAt: new Date('2026-12-15T15:00:00.000Z').toISOString(),
        },
      });
      const apptId = JSON.parse(createRes.body).id;

      // Patient B tries to cancel it
      const cancelRes = await app.inject({
        method: 'POST',
        url: `/api/v1/appointments/${apptId}/cancel`,
        headers: patientBUser.headers,
        payload: {
          reason: 'Malicious cancellation attempt',
        },
      });

      expect(cancelRes.statusCode).toBe(404);
    });
  });
});
