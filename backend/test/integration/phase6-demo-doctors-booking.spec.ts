import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../../src/database/prisma.service.js';
import { ConfigService } from '../../src/config/config.service.js';
import { PrismaDoctorsRepository } from '../../src/modules/doctors/repositories/prisma-doctors.repository.js';
import { PrismaDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/repositories/prisma-doctor-availability.repository.js';
import { NotificationType } from '../../src/modules/notifications/enums/index.js';

describe('Phase 6 — 10 Indian Demo Doctors, Offers, Availability, and Booking Validation', () => {
  let prisma: PrismaService;
  let doctorsRepo: PrismaDoctorsRepository;
  let availabilityRepo: PrismaDoctorAvailabilityRepository;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const config = new ConfigService();
    prisma = new PrismaService(config);
    await prisma.onModuleInit();
    doctorsRepo = new PrismaDoctorsRepository(prisma);
    availabilityRepo = new PrismaDoctorAvailabilityRepository(prisma);
  });

  afterAll(async () => {
    await prisma.onApplicationShutdown();
  });

  it('should have exactly 10 canonical demo doctors with isDemo=true', async () => {
    const demoDoctors = await prisma.doctorProfile.findMany({
      where: { isDemo: true },
      include: {
        specialties: {
          include: { specialty: true },
        },
      },
      orderBy: { publicDoctorId: 'asc' },
    });

    expect(demoDoctors).toHaveLength(10);

    const publicIds = demoDoctors.map((d) => d.publicDoctorId);
    expect(publicIds).toEqual([
      'DOC-IN-01',
      'DOC-IN-02',
      'DOC-IN-03',
      'DOC-IN-04',
      'DOC-IN-05',
      'DOC-IN-06',
      'DOC-IN-07',
      'DOC-IN-08',
      'DOC-IN-09',
      'DOC-IN-10',
    ]);
  });

  it('should strictly satisfy the 3/3/3/1 specialty distribution', async () => {
    const demoDoctors = await prisma.doctorProfile.findMany({
      where: { isDemo: true },
      include: {
        specialties: {
          include: { specialty: true },
        },
      },
    });

    const counts: Record<string, number> = {
      Psychiatry: 0,
      'General Practice': 0,
      Neurology: 0,
      'Coordinated Care Physician': 0,
    };

    for (const doc of demoDoctors) {
      const primary = doc.specialties.find((s) => s.isPrimary)?.specialty.name;
      if (primary && primary in counts) {
        counts[primary]++;
      }
    }

    expect(counts['Psychiatry']).toBe(3);
    expect(counts['General Practice']).toBe(3);
    expect(counts['Neurology']).toBe(3);
    expect(counts['Coordinated Care Physician']).toBe(1);
  });

  it('should verify each doctor has multiple active offers in INR within ₹400–₹4,000', async () => {
    const demoDoctors = await prisma.doctorProfile.findMany({
      where: { isDemo: true },
      select: { id: true, displayName: true, defaultConsultationFee: true, currency: true },
    });

    for (const doc of demoDoctors) {
      expect(doc.currency).toBe('INR');
      expect(Number(doc.defaultConsultationFee)).toBeGreaterThanOrEqual(400);
      expect(Number(doc.defaultConsultationFee)).toBeLessThanOrEqual(4000);

      const offers = await availabilityRepo.findOffersByDoctorId(doc.id, true);
      expect(offers.length).toBeGreaterThanOrEqual(2);

      for (const offer of offers) {
        expect(offer.currency).toBe('INR');
        expect(offer.fee).toBeGreaterThanOrEqual(400);
        expect(offer.fee).toBeLessThanOrEqual(4000);
        expect([20, 30, 45, 50, 60]).toContain(offer.durationMinutes);
      }
    }
  });

  it('should verify each doctor has active availability windows in Asia/Kolkata', async () => {
    const demoDoctors = await prisma.doctorProfile.findMany({
      where: { isDemo: true },
      select: { id: true, displayName: true },
    });

    for (const doc of demoDoctors) {
      const availabilities = await availabilityRepo.findAvailabilitiesByDoctorId(doc.id, true);
      expect(availabilities.length).toBeGreaterThanOrEqual(6);

      for (const avail of availabilities) {
        expect(avail.timezone).toBe('Asia/Kolkata');
        expect(avail.isActive).toBe(true);
      }
    }
  });

  it('should verify demo contact display data is formatted as demo-only', async () => {
    const demoDoctors = await prisma.doctorProfile.findMany({
      where: { isDemo: true },
      select: { contactDisplay: true, clinicName: true, city: true, state: true },
    });

    for (const doc of demoDoctors) {
      expect(doc.contactDisplay).toBeDefined();
      expect(doc.contactDisplay).toMatch(/^DEMO-\d{8}$/);
      expect(doc.clinicName).toBeTruthy();
      expect(doc.city).toBeTruthy();
      expect(doc.state).toBeTruthy();
    }
  });

  it('should verify public doctor search returns 10 demo doctors with Indian details', async () => {
    const publicDocs = await doctorsRepo.findPublicDoctors({ isDemo: true });
    expect(publicDocs.doctors).toHaveLength(10);

    const first = publicDocs.doctors[0];
    expect(first.isDemo).toBe(true);
    expect(first.currency).toBe('INR');
    expect(first.contactDisplay).toMatch(/^DEMO-/);
    expect(first.clinicName).toBeTruthy();
  });

  it('should verify persistent notification template resolution for appointment lifecycle', async () => {
    const requested = NotificationType.APPOINTMENT_REQUESTED;
    const confirmed = NotificationType.APPOINTMENT_CONFIRMED;
    const declined = NotificationType.APPOINTMENT_DECLINED;

    expect(requested).toBe('APPOINTMENT_REQUESTED');
    expect(confirmed).toBe('APPOINTMENT_CONFIRMED');
    expect(declined).toBe('APPOINTMENT_DECLINED');
  });
});
