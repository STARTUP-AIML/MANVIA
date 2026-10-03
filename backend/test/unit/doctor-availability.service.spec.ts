import { describe, it, expect, beforeEach } from 'vitest';
import { DoctorAvailabilityService } from '../../src/modules/doctor-availability/services/doctor-availability.service.js';
import { AvailabilityValidationService } from '../../src/modules/doctor-availability/services/availability-validation.service.js';
import { InMemoryDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/repositories/in-memory-doctor-availability.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { DayOfWeek } from '../../src/modules/doctor-availability/enums/day-of-week.enum.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ForbiddenError, NotFoundError } from '../../src/common/errors/app-error.js';

describe('DoctorAvailabilityService (Unit Tests)', () => {
  let service: DoctorAvailabilityService;
  let availabilityRepo: InMemoryDoctorAvailabilityRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let validationService: AvailabilityValidationService;

  const DOCTOR_A_USER = 'usr-doc-a';
  const DOCTOR_B_USER = 'usr-doc-b';

  beforeEach(async () => {
    doctorsRepo = new InMemoryDoctorsRepository();
    availabilityRepo = new InMemoryDoctorAvailabilityRepository();
    validationService = new AvailabilityValidationService();

    service = new DoctorAvailabilityService(availabilityRepo, doctorsRepo, validationService);

    // Create Verified Doctor A
    await doctorsRepo.createProfile({
      userId: DOCTOR_A_USER,
      publicDoctorId: 'DOC-AVAIL-A',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-AVAIL-1',
      licensingCouncil: 'NJ Board',
      yearsOfExperience: 20,
    });
    const docA = await doctorsRepo.findByUserId(DOCTOR_A_USER);
    await doctorsRepo.updateVerificationStatus(docA!.id, VerificationStatus.VERIFIED, new Date());

    // Create Unverified Doctor B
    await doctorsRepo.createProfile({
      userId: DOCTOR_B_USER,
      publicDoctorId: 'DOC-AVAIL-B',
      displayName: 'Dr. John Watson',
      medicalRegistrationNumber: 'MED-AVAIL-2',
      licensingCouncil: 'UK GMC',
      yearsOfExperience: 10,
    });
  });

  it('should create an availability rule with explicit timezone and time range', async () => {
    const created = await service.createAvailability(DOCTOR_A_USER, {
      timezone: 'America/New_York',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '13:00',
    });

    expect(created.id).toBeDefined();
    expect(created.timezone).toBe('America/New_York');
    expect(created.dayOfWeek).toBe(DayOfWeek.MONDAY);
    expect(created.startTime).toBe('09:00');
    expect(created.endTime).toBe('13:00');
    expect(created.isActive).toBe(true);
  });

  it('should list all availability rules for authenticated physician', async () => {
    await service.createAvailability(DOCTOR_A_USER, {
      timezone: 'America/New_York',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '12:00',
    });
    await service.createAvailability(DOCTOR_A_USER, {
      timezone: 'America/New_York',
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: '14:00',
      endTime: '18:00',
    });

    const list = await service.getSelfAvailabilities(DOCTOR_A_USER);
    expect(list).toHaveLength(2);
  });

  it('should update an availability rule when requested by owner physician', async () => {
    const rule = await service.createAvailability(DOCTOR_A_USER, {
      timezone: 'America/New_York',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '12:00',
    });

    const updated = await service.updateAvailability(DOCTOR_A_USER, rule.id, {
      startTime: '08:30',
      endTime: '11:30',
    });

    expect(updated.startTime).toBe('08:30');
    expect(updated.endTime).toBe('11:30');
  });

  it('SECURITY: should prevent Doctor B from modifying Doctor A availability rule', async () => {
    const ruleA = await service.createAvailability(DOCTOR_A_USER, {
      timezone: 'America/New_York',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '12:00',
    });

    await expect(
      service.updateAvailability(DOCTOR_B_USER, ruleA.id, { startTime: '10:00' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('SECURITY: should prevent Doctor B from deleting Doctor A availability rule', async () => {
    const ruleA = await service.createAvailability(DOCTOR_A_USER, {
      timezone: 'America/New_York',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '12:00',
    });

    await expect(service.deleteAvailability(DOCTOR_B_USER, ruleA.id)).rejects.toThrow(
      ForbiddenError,
    );
  });

  describe('Patient Discovery — Verified Doctor Rule', () => {
    it('should return active availability for a verified doctor', async () => {
      await service.createAvailability(DOCTOR_A_USER, {
        timezone: 'America/New_York',
        dayOfWeek: DayOfWeek.FRIDAY,
        startTime: '10:00',
        endTime: '16:00',
      });

      const publicSchedule = await service.getDoctorPublicAvailabilities('DOC-AVAIL-A');
      expect(publicSchedule).toHaveLength(1);
      expect(publicSchedule[0]?.dayOfWeek).toBe(DayOfWeek.FRIDAY);
      expect(publicSchedule[0]?.startTime).toBe('10:00');
    });

    it('VERIFIED DOCTOR RULE: should reject patient discovery for unverified doctor with 404', async () => {
      await service.createAvailability(DOCTOR_B_USER, {
        timezone: 'Europe/London',
        dayOfWeek: DayOfWeek.TUESDAY,
        startTime: '09:00',
        endTime: '12:00',
      });

      await expect(service.getDoctorPublicAvailabilities('DOC-AVAIL-B')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
