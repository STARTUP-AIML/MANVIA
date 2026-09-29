import { describe, it, expect, beforeEach } from 'vitest';
import { WellnessService } from '../../src/modules/wellness/services/wellness.service.js';
import { InMemoryWellnessRepository } from '../../src/modules/wellness/repositories/in-memory-wellness.repository.js';
import { WellnessAuditService } from '../../src/modules/wellness/services/wellness-audit.service.js';
import { CareRelationshipsService } from '../../src/modules/care-relationships/services/care-relationships.service.js';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { ConsentAuditService } from '../../src/modules/care-relationships/services/consent-audit.service.js';
import { NotFoundError, ValidationError } from '../../src/common/errors/app-error.js';

describe('WellnessService (Unit Tests)', () => {
  let service: WellnessService;
  let wellnessRepo: InMemoryWellnessRepository;
  let wellnessAudit: WellnessAuditService;
  let careRelRepo: InMemoryCareRelationshipRepository;
  let careRelService: CareRelationshipsService;

  const PATIENT_A_USER = 'usr-pat-a';
  const PATIENT_B_USER = 'usr-pat-b';
  const DOCTOR_USER = 'usr-doc-01';

  let patientAInternalId: string;
  let patientBInternalId: string;

  beforeEach(async () => {
    wellnessRepo = new InMemoryWellnessRepository();
    wellnessAudit = new WellnessAuditService();
    careRelRepo = new InMemoryCareRelationshipRepository();
    const doctorsRepo = new InMemoryDoctorsRepository();
    const consentAudit = new ConsentAuditService();

    careRelService = new CareRelationshipsService(careRelRepo, doctorsRepo, consentAudit);

    service = new WellnessService(wellnessRepo, wellnessAudit, careRelService, careRelRepo);

    // Initialize Patient A and B
    const patA = await careRelService.getOrCreatePatientProfile(PATIENT_A_USER);
    patientAInternalId = patA.id;

    const patB = await careRelService.getOrCreatePatientProfile(PATIENT_B_USER);
    patientBInternalId = patB.id;
  });

  describe('Check-in Recording & Patient Ownership', () => {
    it('should successfully record a wellness check-in with non-clinical 1-5 metrics', async () => {
      const checkIn = await service.recordCheckIn(PATIENT_A_USER, {
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 5,
        sleepHours: 7.5,
        note: 'Feeling refreshed after morning run.',
      });

      expect(checkIn).toBeDefined();
      expect(checkIn.id).toBeDefined();
      expect(checkIn.patientId).toBe(patientAInternalId);
      expect(checkIn.mood).toBe(4);
      expect(checkIn.stress).toBe(2);
      expect(checkIn.energy).toBe(4);
      expect(checkIn.sleepQuality).toBe(5);
      expect(checkIn.sleepDurationMinutes).toBe(450); // 7.5h * 60 = 450
      expect(checkIn.note).toBe('Feeling refreshed after morning run.');
    });

    it('should retrieve only check-ins belonging to the authenticated patient', async () => {
      await service.recordCheckIn(PATIENT_A_USER, {
        mood: 5,
        stress: 1,
        energy: 5,
        sleepQuality: 4,
      });

      await service.recordCheckIn(PATIENT_B_USER, {
        mood: 2,
        stress: 4,
        energy: 2,
        sleepQuality: 2,
      });

      const listA = await service.getPatientCheckIns(PATIENT_A_USER, {});
      expect(listA.total).toBe(1);
      expect(listA.data[0]?.patientId).toBe(patientAInternalId);
      expect(listA.data[0]?.mood).toBe(5);

      const listB = await service.getPatientCheckIns(PATIENT_B_USER, {});
      expect(listB.total).toBe(1);
      expect(listB.data[0]?.patientId).toBe(patientBInternalId);
      expect(listB.data[0]?.mood).toBe(2);
    });

    it('should deny Patient B from retrieving Patient A check-in by ID (NotFoundError)', async () => {
      const checkInA = await service.recordCheckIn(PATIENT_A_USER, {
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 4,
      });

      await expect(service.getPatientCheckInById(PATIENT_B_USER, checkInA.id)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should deny Patient B from updating Patient A check-in', async () => {
      const checkInA = await service.recordCheckIn(PATIENT_A_USER, {
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 4,
      });

      await expect(
        service.updatePatientCheckIn(PATIENT_B_USER, checkInA.id, { mood: 1 }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should deny Patient B from deleting Patient A check-in', async () => {
      const checkInA = await service.recordCheckIn(PATIENT_A_USER, {
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 4,
      });

      await expect(service.deletePatientCheckIn(PATIENT_B_USER, checkInA.id)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should allow Patient A to update and delete their own check-in', async () => {
      const checkIn = await service.recordCheckIn(PATIENT_A_USER, {
        mood: 3,
        stress: 3,
        energy: 3,
        sleepQuality: 3,
      });

      const updated = await service.updatePatientCheckIn(PATIENT_A_USER, checkIn.id, {
        mood: 5,
        note: 'Feeling much better now.',
      });
      expect(updated.mood).toBe(5);
      expect(updated.note).toBe('Feeling much better now.');

      await service.deletePatientCheckIn(PATIENT_A_USER, checkIn.id);
      await expect(service.getPatientCheckInById(PATIENT_A_USER, checkIn.id)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('Date Range Filtering & Validation', () => {
    it('should reject invalid date range where startDate is after endDate', async () => {
      await expect(
        service.getPatientCheckIns(PATIENT_A_USER, {
          startDate: '2026-09-30T00:00:00Z',
          endDate: '2026-09-01T00:00:00Z',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should correctly filter check-ins within a custom date window', async () => {
      await service.recordCheckIn(PATIENT_A_USER, {
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 4,
        recordedAt: '2026-09-10T12:00:00Z',
      });
      await service.recordCheckIn(PATIENT_A_USER, {
        mood: 5,
        stress: 1,
        energy: 5,
        sleepQuality: 5,
        recordedAt: '2026-09-20T12:00:00Z',
      });

      const filtered = await service.getPatientCheckIns(PATIENT_A_USER, {
        startDate: '2026-09-15T00:00:00Z',
        endDate: '2026-09-25T23:59:59Z',
      });

      expect(filtered.total).toBe(1);
      expect(filtered.data[0]?.mood).toBe(5);
    });
  });

  describe('Longitudinal Trends & Non-Diagnostic Safety', () => {
    it('should return empty trend summary with no diagnostic claims when 0 check-ins exist', async () => {
      const trends = await service.getPatientTrends(PATIENT_A_USER, { period: '7d' });

      expect(trends.totalCheckIns).toBe(0);
      expect(trends.hasSufficientData).toBe(false);
      expect(trends.averageMood).toBeNull();
      expect(trends.descriptiveInsights).toContain(
        'No wellness check-ins recorded in the selected period.',
      );
    });

    it('INSUFFICIENT DATA SAFETY: should flag hasSufficientData: false when fewer than 3 check-ins exist', async () => {
      // Record only 2 check-ins
      await service.recordCheckIn(PATIENT_A_USER, {
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 4,
        recordedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      });
      await service.recordCheckIn(PATIENT_A_USER, {
        mood: 4,
        stress: 3,
        energy: 3,
        sleepQuality: 4,
        recordedAt: new Date().toISOString(),
      });

      const trends = await service.getPatientTrends(PATIENT_A_USER, { period: '7d' });

      expect(trends.totalCheckIns).toBe(2);
      expect(trends.hasSufficientData).toBe(false);
      expect(trends.previousPeriodComparison).toBeNull();
      expect(trends.descriptiveInsights[0]).toContain('At least 3 check-ins are recommended');
    });

    it('SUFFICIENT DATA & NON-DIAGNOSTIC INSIGHTS: should compute descriptive deltas when >= 3 check-ins exist', async () => {
      // Previous period entries (8 to 12 days ago)
      for (let i = 12; i >= 8; i--) {
        await service.recordCheckIn(PATIENT_A_USER, {
          mood: 3,
          stress: 4,
          energy: 2,
          sleepQuality: 3,
          recordedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Current period entries (1 to 5 days ago)
      for (let i = 5; i >= 1; i--) {
        await service.recordCheckIn(PATIENT_A_USER, {
          mood: 4,
          stress: 2,
          energy: 4,
          sleepQuality: 5,
          recordedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      const trends = await service.getPatientTrends(PATIENT_A_USER, { period: '7d' });

      expect(trends.totalCheckIns).toBe(5);
      expect(trends.hasSufficientData).toBe(true);
      expect(trends.averageMood).toBe(4.0);
      expect(trends.averageStress).toBe(2.0);
      expect(trends.averageEnergy).toBe(4.0);
      expect(trends.averageSleepQuality).toBe(5.0);

      expect(trends.previousPeriodComparison).toBeDefined();
      expect(trends.previousPeriodComparison?.moodDelta).toBe(1.0); // 4.0 - 3.0 = +1.0
      expect(trends.previousPeriodComparison?.stressDelta).toBe(-2.0); // 2.0 - 4.0 = -2.0

      // Strictly verify non-diagnostic language:
      const joinedInsights = trends.descriptiveInsights.join(' ');
      expect(joinedInsights).toContain('recorded mood average increased by 1.0');
      expect(joinedInsights).toContain('recorded stress level was lower on average');

      // Prohibited diagnostic terms must NEVER appear
      const prohibitedTerms = [
        'depress',
        'anxiety disorder',
        'insomnia',
        'clinical',
        'medication',
        'diagnos',
        'risk score',
        'prescription',
      ];
      for (const term of prohibitedTerms) {
        expect(joinedInsights.toLowerCase()).not.toContain(term);
      }
    });
  });

  describe('Summary & Streak Tracking', () => {
    it('should compute logging streak across consecutive calendar days', async () => {
      const today = new Date();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dayBefore = new Date(Date.now() - 48 * 60 * 60 * 1000);

      await service.recordCheckIn(PATIENT_A_USER, {
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 4,
        recordedAt: dayBefore.toISOString(),
      });
      await service.recordCheckIn(PATIENT_A_USER, {
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 4,
        recordedAt: yesterday.toISOString(),
      });
      await service.recordCheckIn(PATIENT_A_USER, {
        mood: 5,
        stress: 1,
        energy: 5,
        sleepQuality: 5,
        recordedAt: today.toISOString(),
      });

      const summary = await service.getPatientSummary(PATIENT_A_USER);

      expect(summary.totalCheckIns).toBe(3);
      expect(summary.streakDays).toBe(3);
      expect(summary.latestCheckIn?.mood).toBe(5);
      expect(summary.todayCheckIn?.mood).toBe(5);
    });
  });

  describe('Doctor Authorized Access', () => {
    it('should allow authorized doctor to query patient check-ins and trends', async () => {
      await service.recordCheckIn(PATIENT_A_USER, {
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 4,
      });

      const docCheckIns = await service.getPatientCheckInsForDoctor(
        DOCTOR_USER,
        patientAInternalId,
        {},
      );

      expect(docCheckIns.total).toBe(1);
      expect(docCheckIns.data[0]?.mood).toBe(4);

      const docTrends = await service.getPatientTrendsForDoctor(DOCTOR_USER, patientAInternalId, {
        period: '7d',
      });

      expect(docTrends.totalCheckIns).toBe(1);
      expect(docTrends.hasSufficientData).toBe(false);
    });
  });
});
