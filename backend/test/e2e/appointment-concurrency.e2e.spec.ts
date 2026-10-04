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
import {
  setupE2EApp,
  createE2EUser,
  cleanupE2EUsers,
  type E2EUser,
} from './helpers/auth.helper.js';
import { AppointmentsService } from '../../src/modules/appointments/services/appointments.service.js';
import { PrismaService } from '../../src/database/prisma.service.js';

describe('Transactional Appointment Booking & Concurrency Protection (E2E)', () => {
  let app: NestFastifyApplication;
  let doctorsRepo: IDoctorsRepository;
  let availabilityRepo: IDoctorAvailabilityRepository;

  let doctorUser: E2EUser;
  let patientAUser: E2EUser;
  let patientBUser: E2EUser;

  let doctorId: string;
  let offerId30m: string;
  let offerId60m: string;

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
    const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();

    const doc = await doctorsRepo.createProfile({
      userId: doctorUser.id,
      publicDoctorId: `DOC-TX-${uniqueSuffix}`,
      displayName: 'Dr. Leonard McCoy, MD',
      medicalRegistrationNumber: `MED-E2E-TX-${uniqueSuffix}`,
      licensingCouncil: 'Starfleet Medical Command',
      yearsOfExperience: 25,
      defaultConsultationFee: 200,
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

    // 3. Setup Consultation Offers (30m and 60m)
    const offer30 = await availabilityRepo.createOffer(doctorId, {
      title: 'Standard Consultation (30m)',
      consultationType: ConsultationType.GENERAL,
      durationMinutes: 30,
      fee: 100,
      currency: 'USD',
      status: OfferStatus.ACTIVE,
    });
    offerId30m = offer30.id;

    const offer60 = await availabilityRepo.createOffer(doctorId, {
      title: 'Extended Consultation (60m)',
      consultationType: ConsultationType.SPECIALIST,
      durationMinutes: 60,
      fee: 200,
      currency: 'USD',
      status: OfferStatus.ACTIVE,
    });
    offerId60m = offer60.id;
  }, 60000);

  afterAll(async () => {
    if (app) {
      await cleanupE2EUsers(app, [doctorUser?.email, patientAUser?.email, patientBUser?.email]);
      await app.close();
    }
  });

  describe('Concurrent Booking Races (Section 17 Concurrency Guarantee)', () => {
    it('CONCURRENCY RACE: exactly one of two concurrent requests for the exact same slot succeeds', async () => {
      const slotTime = new Date('2026-12-20T10:00:00.000Z').toISOString();

      // Dispatch concurrent booking attempts from Patient A and Patient B simultaneously
      const [resA, resB] = await Promise.all([
        app.inject({
          method: 'POST',
          url: '/api/v1/appointments',
          headers: patientAUser.headers,
          payload: {
            doctorId,
            consultationOfferId: offerId30m,
            startAt: slotTime,
            notes: 'Patient A concurrent attempt',
          },
        }),
        app.inject({
          method: 'POST',
          url: '/api/v1/appointments',
          headers: patientBUser.headers,
          payload: {
            doctorId,
            consultationOfferId: offerId30m,
            startAt: slotTime,
            notes: 'Patient B concurrent attempt',
          },
        }),
      ]);

      const statusCodes = [resA.statusCode, resB.statusCode].sort();
      // Exactly one 201 Created and exactly one 409 Conflict
      expect(statusCodes).toEqual([201, 409]);

      const winner = resA.statusCode === 201 ? resA : resB;
      const loser = resA.statusCode === 409 ? resA : resB;

      const winnerBody = JSON.parse(winner.body);
      expect(winnerBody.status).toBe(AppointmentStatus.REQUESTED);
      expect(winnerBody.publicAppointmentId).toMatch(/^APT-[A-Z0-9]{8}$/);

      const loserBody = JSON.parse(loser.body);
      expect(loserBody.message).toContain('already reserved or booked');
    });

    it('CONCURRENCY RACE: exactly one of two concurrent slot reservations succeeds', async () => {
      const slotTime = new Date('2026-12-20T11:00:00.000Z').toISOString();

      const [resA, resB] = await Promise.all([
        app.inject({
          method: 'POST',
          url: '/api/v1/appointments/reserve',
          headers: patientAUser.headers,
          payload: {
            doctorId,
            consultationOfferId: offerId30m,
            startAt: slotTime,
            holdDurationMinutes: 15,
          },
        }),
        app.inject({
          method: 'POST',
          url: '/api/v1/appointments/reserve',
          headers: patientBUser.headers,
          payload: {
            doctorId,
            consultationOfferId: offerId30m,
            startAt: slotTime,
            holdDurationMinutes: 15,
          },
        }),
      ]);

      const statusCodes = [resA.statusCode, resB.statusCode].sort();
      // Exactly one 200 OK and exactly one 409 Conflict
      expect(statusCodes).toEqual([200, 409]);

      const winner = resA.statusCode === 200 ? resA : resB;
      const loser = resA.statusCode === 409 ? resA : resB;

      const winnerBody = JSON.parse(winner.body);
      expect(winnerBody.status).toBe(AppointmentStatus.RESERVED);
      expect(winnerBody.reservationState).toBe('HELD_IN_RESERVATION');

      const loserBody = JSON.parse(loser.body);
      expect(loserBody.message).toContain('already reserved or booked');
    });

    it('CONCURRENCY RACE: prevents booking overlapping time intervals concurrently', async () => {
      // Patient A books 12:00 - 12:30 (30m)
      // Patient B concurrently attempts 12:15 - 13:15 (60m) which overlaps
      const startA = new Date('2026-12-20T12:00:00.000Z').toISOString();
      const startB = new Date('2026-12-20T12:15:00.000Z').toISOString();

      const [resA, resB] = await Promise.all([
        app.inject({
          method: 'POST',
          url: '/api/v1/appointments',
          headers: patientAUser.headers,
          payload: {
            doctorId,
            consultationOfferId: offerId30m,
            startAt: startA,
            notes: 'Patient A: 12:00-12:30',
          },
        }),
        app.inject({
          method: 'POST',
          url: '/api/v1/appointments',
          headers: patientBUser.headers,
          payload: {
            doctorId,
            consultationOfferId: offerId60m,
            startAt: startB,
            notes: 'Patient B overlapping: 12:15-13:15',
          },
        }),
      ]);

      const statusCodes = [resA.statusCode, resB.statusCode].sort();
      expect(statusCodes).toEqual([201, 409]);
    });
  });

  describe('Slot Reservation Lifecycle & Conversion', () => {
    it('allows patient to convert their own active reservation to REQUESTED without conflict', async () => {
      const slotTime = new Date('2026-12-20T14:00:00.000Z').toISOString();

      // Step 1: Patient A reserves slot
      const reserveRes = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments/reserve',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId30m,
          startAt: slotTime,
          holdDurationMinutes: 15,
        },
      });
      expect(reserveRes.statusCode).toBe(200);
      const reserved = JSON.parse(reserveRes.body);
      expect(reserved.status).toBe(AppointmentStatus.RESERVED);

      // Step 2: Patient A confirms/requests the appointment for that exact slot
      const bookRes = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId30m,
          startAt: slotTime,
          notes: 'Converted from reservation',
        },
      });
      expect(bookRes.statusCode).toBe(201);
      const booked = JSON.parse(bookRes.body);
      expect(booked.status).toBe(AppointmentStatus.REQUESTED);
      expect(booked.id).toBe(reserved.id); // Reuses the reserved record
    });

    it('confirm-reservation endpoint explicitly converts RESERVED into REQUESTED', async () => {
      const slotTime = new Date('2026-12-20T15:00:00.000Z').toISOString();

      // Step 1: Reserve
      const reserveRes = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments/reserve',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId30m,
          startAt: slotTime,
          holdDurationMinutes: 15,
        },
      });
      expect(reserveRes.statusCode).toBe(200);
      const reservedApptId = JSON.parse(reserveRes.body).id;

      // Step 2: Confirm via dedicated endpoint
      const confirmRes = await app.inject({
        method: 'POST',
        url: `/api/v1/appointments/${reservedApptId}/confirm-reservation`,
        headers: patientAUser.headers,
        payload: { notes: 'Direct confirmation' },
      });
      expect(confirmRes.statusCode).toBe(200);
      const confirmed = JSON.parse(confirmRes.body);
      expect(confirmed.status).toBe(AppointmentStatus.REQUESTED);
      expect(confirmed.reservationState).toBe('BOOKED');
    });

    it('expired slot reservation is cleaned up and releases the slot for another patient', async () => {
      const slotTime = new Date('2026-12-20T16:00:00.000Z').toISOString();

      // Step 1: Patient A reserves slot
      const reserveRes = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments/reserve',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId30m,
          startAt: slotTime,
          holdDurationMinutes: 15,
        },
      });
      expect(reserveRes.statusCode).toBe(200);
      const reservedApptId = JSON.parse(reserveRes.body).id;

      // Step 2: Run expiration cleanup with a future cutoff (simulating passage of time)
      const futureCutoff = new Date(Date.now() + 30 * 60 * 1000);
      const apptService = app.get(AppointmentsService);
      const cleanupResult = await apptService.expireStaleReservations(futureCutoff);
      expect(cleanupResult.expiredCount).toBeGreaterThanOrEqual(1);

      // Step 3: Verify the appointment is now EXPIRED
      const checkRes = await app.inject({
        method: 'GET',
        url: `/api/v1/appointments/${reservedApptId}`,
        headers: patientAUser.headers,
      });
      expect(checkRes.statusCode).toBe(200);
      expect(JSON.parse(checkRes.body).status).toBe(AppointmentStatus.EXPIRED);

      // Step 4: Patient B can now freely book that same slot
      const bookRes = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientBUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId30m,
          startAt: slotTime,
          notes: 'Patient B books slot freed from expired reservation',
        },
      });
      expect(bookRes.statusCode).toBe(201);
      expect(JSON.parse(bookRes.body).status).toBe(AppointmentStatus.REQUESTED);
    });
  });

  describe('Doctor Lifecycle & Overlap Prevention', () => {
    it('prevents doctor from confirming an appointment if an overlapping confirmed appointment already exists', async () => {
      const slotTime = new Date('2026-12-20T17:00:00.000Z').toISOString();

      // Appointment 1
      const appt1Res = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId30m,
          startAt: slotTime,
        },
      });
      expect(appt1Res.statusCode).toBe(201);
      const appt1Id = JSON.parse(appt1Res.body).id;

      // Doctor confirms appointment 1
      const accept1Res = await app.inject({
        method: 'POST',
        url: `/api/v1/doctor/appointments/${appt1Id}/accept`,
        headers: doctorUser.headers,
      });
      expect(accept1Res.statusCode).toBe(200);
      expect(JSON.parse(accept1Res.body).status).toBe(AppointmentStatus.CONFIRMED);

      // Now create appointment 2 with overlapping time window: starts 15 mins into appointment 1
      const appt2Start = new Date(new Date(slotTime).getTime() + 15 * 60 * 1000);
      const appt2End = new Date(new Date(slotTime).getTime() + 45 * 60 * 1000);

      // Directly create appointment 2 via prisma to simulate a concurrent request that reached db
      const prisma = app.get(PrismaService);
      const appt2 = await prisma.appointment.create({
        data: {
          publicAppointmentId: `APT-OVR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          patientId: JSON.parse(appt1Res.body).patientId,
          doctorId,
          consultationOfferId: offerId30m,
          startAt: appt2Start,
          endAt: appt2End,
          status: AppointmentStatus.REQUESTED,
        },
      });

      // Doctor attempts to confirm appointment 2 while appt 1 is CONFIRMED -> 409 Conflict
      const accept2Res = await app.inject({
        method: 'POST',
        url: `/api/v1/doctor/appointments/${appt2.id}/accept`,
        headers: doctorUser.headers,
      });
      expect(accept2Res.statusCode).toBe(409);
      expect(JSON.parse(accept2Res.body).message).toContain('overlapping confirmed appointment');
    });

    it('doctor decline transitions status to DECLINED and releases the slot', async () => {
      const slotTime = new Date('2026-12-20T18:00:00.000Z').toISOString();

      const apptRes = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId30m,
          startAt: slotTime,
        },
      });
      expect(apptRes.statusCode).toBe(201);
      const apptId = JSON.parse(apptRes.body).id;

      // Doctor declines
      const declineRes = await app.inject({
        method: 'POST',
        url: `/api/v1/doctor/appointments/${apptId}/decline`,
        headers: doctorUser.headers,
        payload: { reason: 'Schedule conflict with surgery' },
      });
      expect(declineRes.statusCode).toBe(200);
      expect(JSON.parse(declineRes.body).status).toBe(AppointmentStatus.DECLINED);

      // Slot is now free for another patient
      const rebookRes = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientBUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId30m,
          startAt: slotTime,
        },
      });
      expect(rebookRes.statusCode).toBe(201);
    });

    it('doctor mark no-show transitions CONFIRMED appointment to NO_SHOW', async () => {
      const slotTime = new Date('2026-12-20T19:00:00.000Z').toISOString();

      const apptRes = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: patientAUser.headers,
        payload: {
          doctorId,
          consultationOfferId: offerId30m,
          startAt: slotTime,
        },
      });
      const apptId = JSON.parse(apptRes.body).id;

      // Confirm
      await app.inject({
        method: 'POST',
        url: `/api/v1/doctor/appointments/${apptId}/accept`,
        headers: doctorUser.headers,
      });

      // Mark No-Show
      const noShowRes = await app.inject({
        method: 'POST',
        url: `/api/v1/doctor/appointments/${apptId}/no-show`,
        headers: doctorUser.headers,
      });
      expect(noShowRes.statusCode).toBe(200);
      expect(JSON.parse(noShowRes.body).status).toBe(AppointmentStatus.NO_SHOW);
    });
  });

  afterAll(async () => {
    if (app) {
      await cleanupE2EUsers(app, [doctorUser?.email, patientAUser?.email, patientBUser?.email]);
      await app.close();
    }
  });
});
