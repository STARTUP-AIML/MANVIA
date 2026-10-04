import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { PrismaDoctorsRepository } from '../../src/modules/doctors/repositories/prisma-doctors.repository.js';
import { PrismaDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/repositories/prisma-doctor-availability.repository.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { ConfigService } from '../../src/config/config.service.js';
import { seedTaxonomies } from '../../src/database/seeds/taxonomy.seed.js';
import { DayOfWeek } from '../../src/modules/doctor-availability/enums/day-of-week.enum.js';
import { ConsultationType } from '../../src/modules/doctor-availability/enums/consultation-type.enum.js';
import { OfferStatus } from '../../src/modules/doctor-availability/enums/offer-status.enum.js';
import { ConflictError } from '../../src/common/errors/app-error.js';

describe('Doctor Availability & Consultation Offers Integration Tests with PostgreSQL', () => {
  let prismaService: PrismaService;
  let doctorsRepo: PrismaDoctorsRepository;
  let availabilityRepo: PrismaDoctorAvailabilityRepository;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const configService = new ConfigService();
    prismaService = new PrismaService(configService);
    await prismaService.onModuleInit();

    await seedTaxonomies(prismaService);

    doctorsRepo = new PrismaDoctorsRepository(prismaService);
    availabilityRepo = new PrismaDoctorAvailabilityRepository(prismaService);
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      try {
        await prismaService.refund.deleteMany({});
        await prismaService.doctorPayout.deleteMany({});
        await prismaService.invoice.deleteMany({});
        await prismaService.paymentAttempt.deleteMany({});
        await prismaService.payment.deleteMany({});
        await prismaService.appointmentCancellation.deleteMany({});
        await prismaService.preConsultation.deleteMany({});
        await prismaService.appointment.deleteMany({});
        await prismaService.consultationOffer.deleteMany({});
        await prismaService.doctorAvailability.deleteMany({});
        await prismaService.doctorProfile.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prismaService.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      } catch {
        // Safe teardown
      }
    }
    await prismaService.onApplicationShutdown();
  });

  async function createTestDoctor(): Promise<{ userId: string; doctorId: string }> {
    const user = await prismaService.user.create({
      data: {
        email: `doc-avail-${crypto.randomUUID()}@example.com`,
        roles: ['DOCTOR'],
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(user.id);

    const doctor = await doctorsRepo.createProfile({
      userId: user.id,
      publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      displayName: 'Dr. Beverly Crusher',
      medicalRegistrationNumber: `MED-STAR-${crypto.randomUUID().substring(0, 8)}`,
      licensingCouncil: 'Starfleet Medical Council',
      yearsOfExperience: 18,
    });

    return { userId: user.id, doctorId: doctor.id };
  }

  describe('Doctor Availability Persistence & Filtering in PostgreSQL', () => {
    it('should persist availability rules and support querying by active state', async () => {
      const { doctorId } = await createTestDoctor();

      // Create active Monday window
      const monRule = await availabilityRepo.createAvailability(doctorId, {
        timezone: 'America/New_York',
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        endTime: '12:00',
        isActive: true,
      });
      expect(monRule.id).toBeDefined();

      // Create inactive Friday window
      const friRule = await availabilityRepo.createAvailability(doctorId, {
        timezone: 'America/New_York',
        dayOfWeek: DayOfWeek.FRIDAY,
        startTime: '14:00',
        endTime: '18:00',
        isActive: false,
      });
      expect(friRule.id).toBeDefined();

      // Query all rules
      const allRules = await availabilityRepo.findAvailabilitiesByDoctorId(doctorId, false);
      expect(allRules).toHaveLength(2);

      // Query active-only rules
      const activeRules = await availabilityRepo.findAvailabilitiesByDoctorId(doctorId, true);
      expect(activeRules).toHaveLength(1);
      expect(activeRules[0]?.dayOfWeek).toBe(DayOfWeek.MONDAY);

      // Update rule to deactivate
      const updated = await availabilityRepo.updateAvailability(monRule.id, { isActive: false });
      expect(updated.isActive).toBe(false);

      const activeAfterDeactivation = await availabilityRepo.findAvailabilitiesByDoctorId(
        doctorId,
        true,
      );
      expect(activeAfterDeactivation).toHaveLength(0);

      // Delete rule
      await availabilityRepo.deleteAvailability(monRule.id);
      const remaining = await availabilityRepo.findAvailabilitiesByDoctorId(doctorId, false);
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe(friRule.id);
    });

    it('should prevent overlapping active availability windows for the same day', async () => {
      const { doctorId } = await createTestDoctor();

      await availabilityRepo.createAvailability(doctorId, {
        timezone: 'America/New_York',
        dayOfWeek: DayOfWeek.TUESDAY,
        startTime: '09:00',
        endTime: '12:00',
        isActive: true,
      });

      // Attempting to create an overlapping active window on Tuesday should fail with ConflictError
      await expect(
        availabilityRepo.createAvailability(doctorId, {
          timezone: 'America/New_York',
          dayOfWeek: DayOfWeek.TUESDAY,
          startTime: '11:00',
          endTime: '14:00',
          isActive: true,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should properly support effective date ranges', async () => {
      const { doctorId } = await createTestDoctor();
      const effectiveFrom = new Date('2026-10-01T00:00:00Z');
      const effectiveUntil = new Date('2026-12-31T00:00:00Z');

      const rule = await availabilityRepo.createAvailability(doctorId, {
        timezone: 'Europe/London',
        dayOfWeek: DayOfWeek.WEDNESDAY,
        startTime: '10:00',
        endTime: '14:00',
        effectiveFrom,
        effectiveUntil,
        isActive: true,
      });

      expect(rule.effectiveFrom).toEqual(effectiveFrom);
      expect(rule.effectiveUntil).toEqual(effectiveUntil);
    });
  });

  describe('Consultation Offers Persistence & Lifecycle in PostgreSQL', () => {
    it('should persist consultation offers, support state transitions, and query by status', async () => {
      const { doctorId } = await createTestDoctor();

      // Create Active offer
      const offer1 = await availabilityRepo.createOffer(doctorId, {
        title: 'Primary Consultation',
        description: '30 minute intake evaluation',
        consultationType: ConsultationType.INITIAL,
        durationMinutes: 30,
        fee: 120.0,
        currency: 'USD',
        status: OfferStatus.ACTIVE,
      });
      expect(offer1.id).toBeDefined();

      // Create Draft offer
      const offer2 = await availabilityRepo.createOffer(doctorId, {
        title: 'Specialized Second Opinion',
        consultationType: ConsultationType.SPECIALIST,
        durationMinutes: 60,
        fee: 300.0,
        currency: 'USD',
        status: OfferStatus.DRAFT,
      });
      expect(offer2.id).toBeDefined();

      // Query all offers
      const allOffers = await availabilityRepo.findOffersByDoctorId(doctorId, false);
      expect(allOffers).toHaveLength(2);

      // Query active-only offers
      const activeOffers = await availabilityRepo.findOffersByDoctorId(doctorId, true);
      expect(activeOffers).toHaveLength(1);
      expect(activeOffers[0]?.id).toBe(offer1.id);

      // Transition draft offer to active
      const activated = await availabilityRepo.updateOffer(offer2.id, {
        status: OfferStatus.ACTIVE,
      });
      expect(activated.status).toBe(OfferStatus.ACTIVE);

      const activeAfterTransition = await availabilityRepo.findOffersByDoctorId(doctorId, true);
      expect(activeAfterTransition).toHaveLength(2);

      // Delete offer
      await availabilityRepo.deleteOffer(offer1.id);
      const remainingOffers = await availabilityRepo.findOffersByDoctorId(doctorId, false);
      expect(remainingOffers).toHaveLength(1);
      expect(remainingOffers[0]?.id).toBe(offer2.id);
    });
  });

  describe('PrismaDoctorAvailabilityRepository contract verification', () => {
    it('should throw Error when PrismaClient is not initialized', async () => {
      const repo = new PrismaDoctorAvailabilityRepository();
      await expect(repo.findAvailabilityById('some-id')).rejects.toThrow(
        'PrismaClient is not initialized',
      );
    });
  });
});
