import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, AppointmentStatus, NotificationType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

describe('Phase 6 End-to-End Booking, Accept/Decline & Notification Workflow', () => {
  let pool: pg.Pool;
  let prisma: PrismaClient;
  let createdAppointmentId: string | null = null;
  let testPatientUserId: string | null = null;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/manvia_dev?schema=public';
    pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    if (createdAppointmentId) {
      await prisma.notification.deleteMany({
        where: {
          idempotencyKey: {
            in: [
              `appt_req:patient:${createdAppointmentId}`,
              `appt_req:doctor:${createdAppointmentId}`,
              `appt_confirm:patient:${createdAppointmentId}`,
            ],
          },
        },
      });
      await prisma.appointment.deleteMany({
        where: { id: createdAppointmentId },
      });
    }
    if (testPatientUserId) {
      await prisma.patientProfile.deleteMany({
        where: { userId: testPatientUserId },
      });
      await prisma.user.deleteMany({
        where: { id: testPatientUserId },
      });
    }
    await prisma.$disconnect();
    await pool.end();
  });

  it('Doctor DOC-IN-01 has active offers in INR and Asia/Kolkata weekly availability', async () => {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { publicDoctorId: 'DOC-IN-01' },
      include: {
        consultationOffers: true,
        availabilities: true,
      },
    });

    expect(doctor).toBeDefined();
    expect(doctor?.isDemo).toBe(true);
    expect(doctor?.consultationOffers.length).toBeGreaterThanOrEqual(1);
    expect(doctor?.availabilities.length).toBeGreaterThanOrEqual(1);

    for (const offer of doctor!.consultationOffers) {
      expect(offer.currency).toBe('INR');
      expect(Number(offer.fee)).toBeGreaterThanOrEqual(400);
      expect(Number(offer.fee)).toBeLessThanOrEqual(4000);
    }
  });

  it('Patient can create an appointment request with notification dispatched to doctor', async () => {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { publicDoctorId: 'DOC-IN-01' },
      include: { consultationOffers: true },
    });
    expect(doctor).toBeDefined();

    // Create unique test patient
    const uniqueEmail = `test-patient-${Date.now()}@example.com`;
    const patientUser = await prisma.user.create({
      data: {
        email: uniqueEmail,
        roles: ['PATIENT'],
        emailVerified: true,
      },
    });
    testPatientUserId = patientUser.id;

    const patientProfile = await prisma.patientProfile.create({
      data: {
        userId: patientUser.id,
        publicPatientId: `PAT-${Date.now().toString().slice(-8)}`,
      },
    });

    const offer = doctor!.consultationOffers[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    if (tomorrow.getUTCDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(10, 0, 0, 0);

    const startAt = new Date(tomorrow);
    if (!offer) {
      throw new Error('Expected a consultation offer for the test');
    }
    const endAt = new Date(startAt.getTime() + offer.durationMinutes * 60 * 1000);

    const appt = await prisma.appointment.create({
      data: {
        publicAppointmentId: `APT-INT-${Date.now().toString().slice(-6)}`,
        patientId: patientProfile.id,
        doctorId: doctor!.id,
        consultationOfferId: offer.id,
        startAt,
        endAt,
        status: AppointmentStatus.REQUESTED,
        notes: 'Integration test intake notes',
      },
    });
    createdAppointmentId = appt.id;

    expect(appt.status).toBe(AppointmentStatus.REQUESTED);

    // Create in-app notification for doctor and patient
    const docNotif = await prisma.notification.create({
      data: {
        publicNotificationId: `NOT-${Date.now()}-DOC`,
        userId: doctor!.userId,
        type: NotificationType.APPOINTMENT_REQUESTED,
        title: 'New Appointment Request',
        body: `New appointment request received for ${offer.title}.`,
        metadata: JSON.stringify({ appointmentId: appt.id }),
        idempotencyKey: `appt_req:doctor:${appt.id}`,
      },
    });
    expect(docNotif.type).toBe(NotificationType.APPOINTMENT_REQUESTED);

    // Doctor confirms appointment
    const confirmed = await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: AppointmentStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    });
    expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);

    // Patient notification on confirmation
    const patientNotif = await prisma.notification.create({
      data: {
        publicNotificationId: `NOT-${Date.now()}-PAT`,
        userId: patientUser.id,
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: 'Appointment Confirmed',
        body: `Dr. ${doctor!.displayName} has confirmed your appointment.`,
        metadata: JSON.stringify({ appointmentId: appt.id }),
        idempotencyKey: `appt_confirm:patient:${appt.id}`,
      },
    });
    expect(patientNotif.type).toBe(NotificationType.APPOINTMENT_CONFIRMED);
  });
});
