import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { InMemoryDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/repositories/in-memory-doctor-availability.repository.js';
import { PrismaDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/repositories/prisma-doctor-availability.repository.js';
import { DayOfWeek } from '../../src/modules/doctor-availability/enums/day-of-week.enum.js';
import { ConsultationType } from '../../src/modules/doctor-availability/enums/consultation-type.enum.js';
import { OfferStatus } from '../../src/modules/doctor-availability/enums/offer-status.enum.js';

describe('Doctor Availability & Consultation Offers Integration Tests', () => {
  let doctorsRepo: InMemoryDoctorsRepository;
  let availabilityRepo: InMemoryDoctorAvailabilityRepository;

  const DOCTOR_ID = 'doc-integ-phase9';
  const USER_ID = 'usr-integ-phase9';

  beforeEach(async () => {
    doctorsRepo = new InMemoryDoctorsRepository();
    availabilityRepo = new InMemoryDoctorAvailabilityRepository();

    await doctorsRepo.createProfile({
      userId: USER_ID,
      publicDoctorId: 'DOC-P9-INT01',
      displayName: 'Dr. Beverly Crusher',
      medicalRegistrationNumber: 'MED-STAR-702',
      licensingCouncil: 'Starfleet Medical Council',
      yearsOfExperience: 18,
    });
  });

  describe('Doctor Availability Persistence & Filtering', () => {
    it('should persist availability rules and support querying by active state', async () => {
      const doctor = await doctorsRepo.findByUserId(USER_ID);
      expect(doctor).toBeDefined();

      // Create active Monday window
      const monRule = await availabilityRepo.createAvailability(doctor!.id, {
        timezone: 'America/New_York',
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        endTime: '12:00',
        isActive: true,
      });
      expect(monRule.id).toBeDefined();

      // Create inactive Friday window
      const friRule = await availabilityRepo.createAvailability(doctor!.id, {
        timezone: 'America/New_York',
        dayOfWeek: DayOfWeek.FRIDAY,
        startTime: '14:00',
        endTime: '18:00',
        isActive: false,
      });
      expect(friRule.id).toBeDefined();

      // Query all rules
      const allRules = await availabilityRepo.findAvailabilitiesByDoctorId(doctor!.id, false);
      expect(allRules).toHaveLength(2);

      // Query active-only rules
      const activeRules = await availabilityRepo.findAvailabilitiesByDoctorId(doctor!.id, true);
      expect(activeRules).toHaveLength(1);
      expect(activeRules[0]?.dayOfWeek).toBe(DayOfWeek.MONDAY);

      // Update rule to deactivate
      const updated = await availabilityRepo.updateAvailability(monRule.id, { isActive: false });
      expect(updated.isActive).toBe(false);

      const activeAfterDeactivation = await availabilityRepo.findAvailabilitiesByDoctorId(
        doctor!.id,
        true,
      );
      expect(activeAfterDeactivation).toHaveLength(0);

      // Delete rule
      await availabilityRepo.deleteAvailability(monRule.id);
      const remaining = await availabilityRepo.findAvailabilitiesByDoctorId(doctor!.id, false);
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe(friRule.id);
    });

    it('should properly support effective date ranges', async () => {
      const doctor = await doctorsRepo.findByUserId(USER_ID);
      const effectiveFrom = new Date('2026-10-01T00:00:00Z');
      const effectiveUntil = new Date('2026-12-31T23:59:59Z');

      const rule = await availabilityRepo.createAvailability(doctor!.id, {
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

  describe('Consultation Offers Persistence & Lifecycle', () => {
    it('should persist consultation offers, support state transitions, and query by status', async () => {
      const doctor = await doctorsRepo.findByUserId(USER_ID);
      expect(doctor).toBeDefined();

      // Create Active offer
      const offer1 = await availabilityRepo.createOffer(doctor!.id, {
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
      const offer2 = await availabilityRepo.createOffer(doctor!.id, {
        title: 'Specialized Second Opinion',
        consultationType: ConsultationType.SPECIALIST,
        durationMinutes: 60,
        fee: 300.0,
        currency: 'USD',
        status: OfferStatus.DRAFT,
      });
      expect(offer2.id).toBeDefined();

      // Query all offers
      const allOffers = await availabilityRepo.findOffersByDoctorId(doctor!.id, false);
      expect(allOffers).toHaveLength(2);

      // Query active-only offers
      const activeOffers = await availabilityRepo.findOffersByDoctorId(doctor!.id, true);
      expect(activeOffers).toHaveLength(1);
      expect(activeOffers[0]?.id).toBe(offer1.id);

      // Transition draft offer to active
      const activated = await availabilityRepo.updateOffer(offer2.id, {
        status: OfferStatus.ACTIVE,
      });
      expect(activated.status).toBe(OfferStatus.ACTIVE);

      const activeAfterTransition = await availabilityRepo.findOffersByDoctorId(doctor!.id, true);
      expect(activeAfterTransition).toHaveLength(2);

      // Soft/hard delete offer
      await availabilityRepo.deleteOffer(offer1.id);
      const remainingOffers = await availabilityRepo.findOffersByDoctorId(doctor!.id, false);
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

    it('should execute properly when mock Prisma client delegate is supplied', async () => {
      const mockPrisma = {
        doctorAvailability: {
          findUnique: async () => ({
            id: 'avail-mock-1',
            doctorId: DOCTOR_ID,
            timezone: 'Asia/Kolkata',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '13:00',
            effectiveFrom: null,
            effectiveUntil: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        consultationOffer: {
          findUnique: async () => ({
            id: 'offer-mock-1',
            doctorId: DOCTOR_ID,
            title: 'Mock Consult',
            description: null,
            consultationType: 'INITIAL',
            durationMinutes: 30,
            fee: 100,
            currency: 'USD',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
      };

      const repo = new PrismaDoctorAvailabilityRepository(mockPrisma as never);
      const avail = await repo.findAvailabilityById('avail-mock-1');
      expect(avail).toBeDefined();
      expect(avail?.timezone).toBe('Asia/Kolkata');

      const offer = await repo.findOfferById('offer-mock-1');
      expect(offer).toBeDefined();
      expect(offer?.title).toBe('Mock Consult');
    });
  });
});
