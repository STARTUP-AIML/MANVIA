import { describe, it, expect, beforeEach } from 'vitest';
import { HealthTimelineService } from '../../src/modules/health-records/services/health-timeline.service.js';
import { InMemoryHealthTimelineRepository } from '../../src/modules/health-records/repositories/in-memory-health-timeline.repository.js';
import { HealthRecordsAuditService } from '../../src/modules/health-records/services/health-records-audit.service.js';
import { CareRelationshipsService } from '../../src/modules/care-relationships/services/care-relationships.service.js';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { ConsentAuditService } from '../../src/modules/care-relationships/services/consent-audit.service.js';
import { TimelineEventType } from '../../src/modules/health-records/enums/timeline-event-type.enum.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConsentScope } from '../../src/modules/care-relationships/enums/consent-scope.enum.js';
import { ConsentStatus } from '../../src/modules/care-relationships/enums/consent-status.enum.js';
import { CareRelationshipStatus } from '../../src/modules/care-relationships/enums/care-relationship-status.enum.js';
import { ForbiddenError } from '../../src/common/errors/app-error.js';

describe('HealthTimelineService (Unit Tests)', () => {
  let service: HealthTimelineService;
  let timelineRepo: InMemoryHealthTimelineRepository;
  let auditService: HealthRecordsAuditService;
  let careRelRepo: InMemoryCareRelationshipRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let careRelService: CareRelationshipsService;

  const PATIENT_USER = 'usr-pat-01';
  const DOCTOR_USER = 'usr-doc-01';

  let patientId: string;
  let doctorInternalId: string;

  beforeEach(async () => {
    timelineRepo = new InMemoryHealthTimelineRepository();
    auditService = new HealthRecordsAuditService();
    careRelRepo = new InMemoryCareRelationshipRepository();
    doctorsRepo = new InMemoryDoctorsRepository();
    const consentAudit = new ConsentAuditService();

    careRelService = new CareRelationshipsService(careRelRepo, doctorsRepo, consentAudit);

    service = new HealthTimelineService(
      timelineRepo,
      auditService,
      careRelService,
      careRelRepo,
      doctorsRepo,
    );

    const pat = await careRelService.getOrCreatePatientProfile(PATIENT_USER);
    patientId = pat.id;

    const doc = await doctorsRepo.createProfile({
      userId: DOCTOR_USER,
      publicDoctorId: 'DOC-TIME01',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-TIME01',
      licensingCouncil: 'NJ Medical Board',
      yearsOfExperience: 20,
    });
    await doctorsRepo.updateVerificationStatus(doc.id, VerificationStatus.VERIFIED, new Date());
    doctorInternalId = doc.id;
  });

  describe('Timeline Event Recording & Ordering', () => {
    it('should record multiple heterogeneous care events and sort deterministically', async () => {
      // 1. Record event on Sept 10
      await service.recordEvent({
        patientId,
        eventType: TimelineEventType.WELLNESS_CHECK_IN,
        title: 'Daily Wellness Check-in',
        summary: 'Mood: 4/5, Sleep: 7.5 hrs',
        sourceType: 'WELLNESS_CHECK_IN',
        sourceId: 'chk-01',
        eventTimestamp: new Date('2026-09-10T08:00:00Z'),
      });

      // 2. Record event on Sept 20
      await service.recordEvent({
        patientId,
        eventType: TimelineEventType.HEALTH_RECORD_ADDED,
        title: 'Lipid Panel Report',
        summary: 'Blood work test results',
        sourceType: 'HEALTH_RECORD',
        sourceId: 'rec-01',
        eventTimestamp: new Date('2026-09-20T10:00:00Z'),
      });

      // 3. Record event on Sept 15
      await service.recordEvent({
        patientId,
        eventType: TimelineEventType.CONSULTATION,
        title: 'General Wellness Consultation',
        summary: 'Clinical consultation with Dr. House',
        sourceType: 'CONSULTATION',
        sourceId: 'con-01',
        eventTimestamp: new Date('2026-09-15T14:00:00Z'),
      });

      const timeline = await service.getPatientTimeline(PATIENT_USER, {});
      expect(timeline.total).toBe(3);
      expect(timeline.data).toHaveLength(3);

      // Verify deterministic descending chronological ordering: Sept 20, Sept 15, Sept 10
      expect(timeline.data[0]!.title).toBe('Lipid Panel Report');
      expect(timeline.data[1]!.title).toBe('General Wellness Consultation');
      expect(timeline.data[2]!.title).toBe('Daily Wellness Check-in');
    });

    it('should filter events by eventType', async () => {
      await service.recordEvent({
        patientId,
        eventType: TimelineEventType.WELLNESS_CHECK_IN,
        title: 'Wellness Log',
        summary: 'Check in log',
        sourceType: 'WELLNESS',
      });

      await service.recordEvent({
        patientId,
        eventType: TimelineEventType.HEALTH_RECORD_ADDED,
        title: 'Report Log',
        summary: 'Lab report log',
        sourceType: 'HEALTH_RECORD',
      });

      const res = await service.getPatientTimeline(PATIENT_USER, {
        eventType: TimelineEventType.HEALTH_RECORD_ADDED,
      });

      expect(res.total).toBe(1);
      expect(res.data[0]!.eventType).toBe(TimelineEventType.HEALTH_RECORD_ADDED);
    });
  });

  describe('Doctor Access & Consent Verification', () => {
    beforeEach(async () => {
      await service.recordEvent({
        patientId,
        eventType: TimelineEventType.HEALTH_RECORD_ADDED,
        title: 'Lab Report',
        summary: 'Blood test',
        sourceType: 'HEALTH_RECORD',
      });
    });

    it('should reject doctor timeline access if no care relationship exists', async () => {
      await expect(service.getDoctorPatientTimeline(DOCTOR_USER, patientId, {})).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('should reject doctor timeline access if active care relationship exists but no HEALTH_TIMELINE consent', async () => {
      await careRelRepo.createCareRelationship({
        patientId,
        doctorId: doctorInternalId,
        status: CareRelationshipStatus.ACTIVE,
      });

      // Only grant HEALTH_RECORDS, not HEALTH_TIMELINE
      await careRelRepo.createConsent({
        patientId,
        doctorId: doctorInternalId,
        scope: ConsentScope.HEALTH_RECORDS,
        status: ConsentStatus.ACTIVE,
      });

      await expect(service.getDoctorPatientTimeline(DOCTOR_USER, patientId, {})).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('should grant doctor timeline access when active relationship and HEALTH_TIMELINE consent are present', async () => {
      await careRelRepo.createCareRelationship({
        patientId,
        doctorId: doctorInternalId,
        status: CareRelationshipStatus.ACTIVE,
      });

      await careRelRepo.createConsent({
        patientId,
        doctorId: doctorInternalId,
        scope: ConsentScope.HEALTH_TIMELINE,
        status: ConsentStatus.ACTIVE,
      });

      const timeline = await service.getDoctorPatientTimeline(DOCTOR_USER, patientId, {});
      expect(timeline.total).toBe(1);
      expect(timeline.data[0]!.title).toBe('Lab Report');
    });

    it('should reject doctor timeline access if consent has expired', async () => {
      await careRelRepo.createCareRelationship({
        patientId,
        doctorId: doctorInternalId,
        status: CareRelationshipStatus.ACTIVE,
      });

      await careRelRepo.createConsent({
        patientId,
        doctorId: doctorInternalId,
        scope: ConsentScope.HEALTH_TIMELINE,
        status: ConsentStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
      });

      await expect(service.getDoctorPatientTimeline(DOCTOR_USER, patientId, {})).rejects.toThrow(
        ForbiddenError,
      );
    });
  });
});
