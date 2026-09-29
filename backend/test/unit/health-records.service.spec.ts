import { describe, it, expect, beforeEach } from 'vitest';
import { HealthRecordsService } from '../../src/modules/health-records/services/health-records.service.js';
import { HealthTimelineService } from '../../src/modules/health-records/services/health-timeline.service.js';
import { InMemoryHealthRecordRepository } from '../../src/modules/health-records/repositories/in-memory-health-record.repository.js';
import { InMemoryHealthTimelineRepository } from '../../src/modules/health-records/repositories/in-memory-health-timeline.repository.js';
import { HealthRecordsStorageService } from '../../src/modules/health-records/services/health-records-storage.service.js';
import { HealthRecordsAuditService } from '../../src/modules/health-records/services/health-records-audit.service.js';
import { CareRelationshipsService } from '../../src/modules/care-relationships/services/care-relationships.service.js';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { ConsentAuditService } from '../../src/modules/care-relationships/services/consent-audit.service.js';
import { HealthRecordCategory } from '../../src/modules/health-records/enums/health-record-category.enum.js';
import { HealthRecordStatus } from '../../src/modules/health-records/enums/health-record-status.enum.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConsentScope } from '../../src/modules/care-relationships/enums/consent-scope.enum.js';
import { ConsentStatus } from '../../src/modules/care-relationships/enums/consent-status.enum.js';
import { CareRelationshipStatus } from '../../src/modules/care-relationships/enums/care-relationship-status.enum.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../src/common/errors/app-error.js';
import type { HealthRecordResponseDto } from '../../src/modules/health-records/dto/health-record-response.dto.js';

describe('HealthRecordsService (Unit Tests)', () => {
  let service: HealthRecordsService;
  let timelineService: HealthTimelineService;
  let healthRecordRepo: InMemoryHealthRecordRepository;
  let timelineRepo: InMemoryHealthTimelineRepository;
  let storageService: HealthRecordsStorageService;
  let auditService: HealthRecordsAuditService;
  let careRelRepo: InMemoryCareRelationshipRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let careRelService: CareRelationshipsService;

  const PATIENT_USER = 'usr-pat-01';
  const OTHER_PATIENT_USER = 'usr-pat-02';
  const DOCTOR_USER = 'usr-doc-01';

  let patientId: string;
  let doctorInternalId: string;

  beforeEach(async () => {
    healthRecordRepo = new InMemoryHealthRecordRepository();
    timelineRepo = new InMemoryHealthTimelineRepository();
    storageService = new HealthRecordsStorageService();
    auditService = new HealthRecordsAuditService();
    careRelRepo = new InMemoryCareRelationshipRepository();
    doctorsRepo = new InMemoryDoctorsRepository();
    const consentAudit = new ConsentAuditService();

    careRelService = new CareRelationshipsService(careRelRepo, doctorsRepo, consentAudit);

    timelineService = new HealthTimelineService(
      timelineRepo,
      auditService,
      careRelService,
      careRelRepo,
      doctorsRepo,
    );

    service = new HealthRecordsService(
      healthRecordRepo,
      storageService,
      auditService,
      timelineService,
      careRelService,
      careRelRepo,
      doctorsRepo,
    );

    const pat = await careRelService.getOrCreatePatientProfile(PATIENT_USER);
    patientId = pat.id;

    await careRelService.getOrCreatePatientProfile(OTHER_PATIENT_USER);

    const doc = await doctorsRepo.createProfile({
      userId: DOCTOR_USER,
      publicDoctorId: 'DOC-HEALTH01',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-HEALTH01',
      licensingCouncil: 'NJ Medical Board',
      yearsOfExperience: 20,
    });
    await doctorsRepo.updateVerificationStatus(doc.id, VerificationStatus.VERIFIED, new Date());
    doctorInternalId = doc.id;
  });

  describe('Upload Intent & Document Ingestion', () => {
    it('should generate an upload intent and register a PENDING health record', async () => {
      const intent = await service.createUploadIntent(PATIENT_USER, {
        fileName: 'lipid_panel.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1048576,
        category: HealthRecordCategory.LAB_REPORT,
        title: 'Lipid Panel 2026',
        description: 'Annual fasting cholesterol test',
        recordedDate: '2026-09-20',
      });

      expect(intent).toBeDefined();
      expect(intent.recordId).toBeDefined();
      expect(intent.publicRecordId).toMatch(/^REC-[A-Z0-9]{8}$/);
      expect(intent.uploadUrl).toContain('vault.manvia.internal');
      expect(intent.storageKey).toContain(intent.publicRecordId);
      expect(intent.expiresInSeconds).toBe(300);

      // Verify stored record is PENDING
      const record = await healthRecordRepo.findById(intent.recordId);
      expect(record).not.toBeNull();
      expect(record!.status).toBe(HealthRecordStatus.PENDING);
    });

    it('should reject invalid MIME types', async () => {
      await expect(
        service.createUploadIntent(PATIENT_USER, {
          fileName: 'malicious.exe',
          mimeType: 'application/x-msdownload',
          fileSizeBytes: 1024,
          category: HealthRecordCategory.OTHER,
          title: 'Suspicious File',
          recordedDate: '2026-09-20',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject files exceeding 25MB boundary', async () => {
      await expect(
        service.createUploadIntent(PATIENT_USER, {
          fileName: 'huge_scan.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 26 * 1024 * 1024,
          category: HealthRecordCategory.IMAGING,
          title: 'Oversized MRI Scan',
          recordedDate: '2026-09-20',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should finalize an upload, mark record AVAILABLE, and emit a timeline event', async () => {
      const intent = await service.createUploadIntent(PATIENT_USER, {
        fileName: 'cbc_report.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 50000,
        category: HealthRecordCategory.LAB_REPORT,
        title: 'Complete Blood Count',
        recordedDate: '2026-09-25',
      });

      const finalized = await service.finalizeUpload(PATIENT_USER, intent.publicRecordId);

      expect(finalized.status).toBe(HealthRecordStatus.AVAILABLE);
      expect(finalized.publicRecordId).toBe(intent.publicRecordId);

      // Timeline event verification
      const timeline = await timelineRepo.findMany({ patientId });
      expect(timeline.total).toBe(1);
      expect(timeline.data[0]!.title).toBe('Complete Blood Count');
      expect(timeline.data[0]!.sourceId).toBe(intent.publicRecordId);
    });

    it('should directly create a record with base64 content and emit a timeline event', async () => {
      const record = await service.createRecord(PATIENT_USER, {
        category: HealthRecordCategory.PRESCRIPTION,
        title: 'Amoxicillin Rx',
        fileName: 'prescription.pdf',
        fileMimeType: 'application/pdf',
        fileContentBase64: Buffer.from('dummy-pdf-content').toString('base64'),
        recordedDate: '2026-09-26',
      });

      expect(record.status).toBe(HealthRecordStatus.AVAILABLE);
      expect(record.publicRecordId).toMatch(/^REC-[A-Z0-9]{8}$/);

      const timeline = await timelineRepo.findMany({ patientId });
      expect(timeline.total).toBe(1);
      expect(timeline.data[0]!.title).toBe('Amoxicillin Rx');
    });
  });

  describe('Record Retrieval & Download URLs', () => {
    it('should list paginated records belonging to the patient', async () => {
      await service.createRecord(PATIENT_USER, {
        category: HealthRecordCategory.LAB_REPORT,
        title: 'Report 1',
        fileName: 'r1.pdf',
        fileMimeType: 'application/pdf',
        recordedDate: '2026-09-20',
      });

      await service.createRecord(PATIENT_USER, {
        category: HealthRecordCategory.IMAGING,
        title: 'Report 2',
        fileName: 'r2.pdf',
        fileMimeType: 'application/pdf',
        recordedDate: '2026-09-22',
      });

      const res = await service.getPatientRecords(PATIENT_USER, { page: 1, limit: 10 });
      expect(res.total).toBe(2);
      expect(res.data).toHaveLength(2);
      expect(res.data[0]!.title).toBe('Report 2'); // latest recordedDate first
    });

    it('should filter records by category', async () => {
      await service.createRecord(PATIENT_USER, {
        category: HealthRecordCategory.LAB_REPORT,
        title: 'Report 1',
        fileName: 'r1.pdf',
        fileMimeType: 'application/pdf',
        recordedDate: '2026-09-20',
      });

      await service.createRecord(PATIENT_USER, {
        category: HealthRecordCategory.PRESCRIPTION,
        title: 'Rx 1',
        fileName: 'rx.pdf',
        fileMimeType: 'application/pdf',
        recordedDate: '2026-09-21',
      });

      const res = await service.getPatientRecords(PATIENT_USER, {
        category: HealthRecordCategory.LAB_REPORT,
      });
      expect(res.total).toBe(1);
      expect(res.data[0]!.category).toBe(HealthRecordCategory.LAB_REPORT);
    });

    it('should generate a short-lived download URL', async () => {
      const record = await service.createRecord(PATIENT_USER, {
        category: HealthRecordCategory.CLINICAL_SUMMARY,
        title: 'Discharge Summary',
        fileName: 'summary.pdf',
        fileMimeType: 'application/pdf',
        recordedDate: '2026-09-21',
      });

      const download = await service.getRecordDownloadUrl(PATIENT_USER, record.publicRecordId);
      expect(download.downloadUrl).toContain('vault.manvia.internal');
      expect(download.expiresInSeconds).toBe(300);
      expect(download.publicRecordId).toBe(record.publicRecordId);
    });

    it('should update record metadata', async () => {
      const record = await service.createRecord(PATIENT_USER, {
        category: HealthRecordCategory.OTHER,
        title: 'Draft Title',
        fileName: 'doc.pdf',
        fileMimeType: 'application/pdf',
        recordedDate: '2026-09-21',
      });

      const updated = await service.updateRecord(PATIENT_USER, record.publicRecordId, {
        title: 'Updated Final Title',
        category: HealthRecordCategory.LAB_REPORT,
      });

      expect(updated.title).toBe('Updated Final Title');
      expect(updated.category).toBe(HealthRecordCategory.LAB_REPORT);
    });

    it('should soft-delete record and exclude it from active listing', async () => {
      const record = await service.createRecord(PATIENT_USER, {
        category: HealthRecordCategory.OTHER,
        title: 'To Be Deleted',
        fileName: 'doc.pdf',
        fileMimeType: 'application/pdf',
        recordedDate: '2026-09-21',
      });

      const deleted = await service.deleteRecord(PATIENT_USER, record.publicRecordId);
      expect(deleted.status).toBe(HealthRecordStatus.DELETED);

      const listing = await service.getPatientRecords(PATIENT_USER, {});
      expect(listing.total).toBe(0);

      // Getting deleted record directly throws NotFound
      await expect(
        service.getPatientRecordById(PATIENT_USER, record.publicRecordId),
      ).rejects.toThrow(NotFoundError);
    });

    it('should enforce patient isolation (patient B cannot access patient A records)', async () => {
      const recordA = await service.createRecord(PATIENT_USER, {
        category: HealthRecordCategory.LAB_REPORT,
        title: 'Patient A Secret Lab',
        fileName: 'secret.pdf',
        fileMimeType: 'application/pdf',
        recordedDate: '2026-09-21',
      });

      await expect(
        service.getPatientRecordById(OTHER_PATIENT_USER, recordA.publicRecordId),
      ).rejects.toThrow(NotFoundError);

      await expect(
        service.getRecordDownloadUrl(OTHER_PATIENT_USER, recordA.publicRecordId),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Doctor Access Boundaries & Consent Enforcement', () => {
    let recordA: HealthRecordResponseDto;

    beforeEach(async () => {
      recordA = await service.createRecord(PATIENT_USER, {
        category: HealthRecordCategory.LAB_REPORT,
        title: 'Cardio Lipid Panel',
        fileName: 'lipid.pdf',
        fileMimeType: 'application/pdf',
        recordedDate: '2026-09-20',
      });
    });

    it('should reject doctor access if no care relationship exists', async () => {
      await expect(service.getDoctorPatientRecords(DOCTOR_USER, patientId, {})).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('should reject doctor access if care relationship exists but no HEALTH_RECORDS consent', async () => {
      await careRelRepo.createCareRelationship({
        patientId,
        doctorId: doctorInternalId,
        status: CareRelationshipStatus.ACTIVE,
      });

      // Grant consent for CONSULTATION_INFO, not HEALTH_RECORDS
      await careRelRepo.createConsent({
        patientId,
        doctorId: doctorInternalId,
        scope: ConsentScope.CONSULTATION_INFO,
        status: ConsentStatus.ACTIVE,
      });

      await expect(service.getDoctorPatientRecords(DOCTOR_USER, patientId, {})).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('should allow doctor access when active care relationship and HEALTH_RECORDS consent exist', async () => {
      await careRelRepo.createCareRelationship({
        patientId,
        doctorId: doctorInternalId,
        status: CareRelationshipStatus.ACTIVE,
      });

      await careRelRepo.createConsent({
        patientId,
        doctorId: doctorInternalId,
        scope: ConsentScope.HEALTH_RECORDS,
        status: ConsentStatus.ACTIVE,
      });

      const records = await service.getDoctorPatientRecords(DOCTOR_USER, patientId, {});
      expect(records.total).toBe(1);
      expect(records.data[0]!.title).toBe('Cardio Lipid Panel');

      const record = await service.getDoctorPatientRecordById(
        DOCTOR_USER,
        patientId,
        recordA.publicRecordId,
      );
      expect(record.title).toBe('Cardio Lipid Panel');

      const download = await service.getDoctorPatientRecordDownloadUrl(
        DOCTOR_USER,
        patientId,
        recordA.publicRecordId,
      );
      expect(download.downloadUrl).toContain('vault.manvia.internal');
    });

    it('should reject doctor access if consent was revoked', async () => {
      await careRelRepo.createCareRelationship({
        patientId,
        doctorId: doctorInternalId,
        status: CareRelationshipStatus.ACTIVE,
      });

      const consent = await careRelRepo.createConsent({
        patientId,
        doctorId: doctorInternalId,
        scope: ConsentScope.HEALTH_RECORDS,
        status: ConsentStatus.ACTIVE,
      });

      // Revoke consent
      await careRelRepo.updateConsent(consent.id, {
        status: ConsentStatus.REVOKED,
      });

      await expect(service.getDoctorPatientRecords(DOCTOR_USER, patientId, {})).rejects.toThrow(
        ForbiddenError,
      );
    });
  });
});
