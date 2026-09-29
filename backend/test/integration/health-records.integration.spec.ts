import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryHealthRecordRepository } from '../../src/modules/health-records/repositories/in-memory-health-record.repository.js';
import { InMemoryHealthTimelineRepository } from '../../src/modules/health-records/repositories/in-memory-health-timeline.repository.js';
import { PrismaHealthRecordRepository } from '../../src/modules/health-records/repositories/prisma-health-record.repository.js';
import { PrismaHealthTimelineRepository } from '../../src/modules/health-records/repositories/prisma-health-timeline.repository.js';
import { HealthRecordsStorageService } from '../../src/modules/health-records/services/health-records-storage.service.js';
import { HealthRecordCategory } from '../../src/modules/health-records/enums/health-record-category.enum.js';
import { HealthRecordStatus } from '../../src/modules/health-records/enums/health-record-status.enum.js';
import { TimelineEventType } from '../../src/modules/health-records/enums/timeline-event-type.enum.js';

describe('Health Records & Timeline Integration Tests', () => {
  const PATIENT_ID = 'pat-uuid-integ-1';
  const OTHER_PATIENT_ID = 'pat-uuid-integ-2';
  const USER_ID = 'usr-pat-uuid-1';

  describe('InMemoryHealthRecordRepository Contract', () => {
    let repo: InMemoryHealthRecordRepository;

    beforeEach(() => {
      repo = new InMemoryHealthRecordRepository();
    });

    it('should create and retrieve records preserving integrity and public ID', async () => {
      const created = await repo.create({
        patientId: PATIENT_ID,
        uploadedByUserId: USER_ID,
        category: HealthRecordCategory.LAB_REPORT,
        title: 'Lipid Panel Report',
        description: 'Cholesterol blood work',
        storageKey: 'patients/p1/rec1.pdf',
        originalFileName: 'lipid.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
        recordedDate: new Date('2026-09-20'),
      });

      expect(created.id).toBeDefined();
      expect(created.publicRecordId).toMatch(/^REC-[A-Z0-9]{8}$/);
      expect(created.status).toBe(HealthRecordStatus.AVAILABLE);

      const byId = await repo.findById(created.id);
      expect(byId).toEqual(created);

      const byPub = await repo.findByPublicId(created.publicRecordId);
      expect(byPub).toEqual(created);

      const patientRecord = await repo.findPatientRecord(PATIENT_ID, created.publicRecordId);
      expect(patientRecord).toEqual(created);

      const wrongPatientRecord = await repo.findPatientRecord(
        OTHER_PATIENT_ID,
        created.publicRecordId,
      );
      expect(wrongPatientRecord).toBeNull();
    });

    it('should query records with category filter, date boundaries, and sorting', async () => {
      for (let i = 1; i <= 5; i++) {
        await repo.create({
          patientId: PATIENT_ID,
          uploadedByUserId: USER_ID,
          category: i % 2 === 0 ? HealthRecordCategory.IMAGING : HealthRecordCategory.LAB_REPORT,
          title: `Report ${i}`,
          storageKey: `k${i}`,
          originalFileName: `file${i}.pdf`,
          mimeType: 'application/pdf',
          fileSizeBytes: 1000 * i,
          recordedDate: new Date(`2026-09-0${i}`),
        });
      }

      const labs = await repo.findMany({
        patientId: PATIENT_ID,
        category: HealthRecordCategory.LAB_REPORT,
      });
      expect(labs.total).toBe(3);

      const page1 = await repo.findMany({
        patientId: PATIENT_ID,
        page: 1,
        limit: 2,
      });
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(5);
      // Newest date first: 2026-09-05
      expect(page1.data[0]!.title).toBe('Report 5');
    });

    it('should soft-delete records and exclude them from normal queries', async () => {
      const created = await repo.create({
        patientId: PATIENT_ID,
        uploadedByUserId: USER_ID,
        category: HealthRecordCategory.OTHER,
        title: 'Draft',
        storageKey: 'key-draft',
        originalFileName: 'draft.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 100,
        recordedDate: new Date(),
      });

      const deleted = await repo.softDelete(created.id);
      expect(deleted.status).toBe(HealthRecordStatus.DELETED);

      const query = await repo.findMany({ patientId: PATIENT_ID });
      expect(query.total).toBe(0);

      const count = await repo.countByPatient(PATIENT_ID);
      expect(count).toBe(0);
    });
  });

  describe('InMemoryHealthTimelineRepository Contract', () => {
    let timelineRepo: InMemoryHealthTimelineRepository;

    beforeEach(() => {
      timelineRepo = new InMemoryHealthTimelineRepository();
    });

    it('should create and retrieve timeline events with deterministic ordering', async () => {
      await timelineRepo.create({
        patientId: PATIENT_ID,
        eventType: TimelineEventType.WELLNESS_CHECK_IN,
        title: 'Check-in Day 1',
        summary: 'Mood 4/5',
        sourceType: 'WELLNESS',
        eventTimestamp: new Date('2026-09-10T10:00:00Z'),
      });

      await timelineRepo.create({
        patientId: PATIENT_ID,
        eventType: TimelineEventType.HEALTH_RECORD_ADDED,
        title: 'Blood Report',
        summary: 'Blood test added',
        sourceType: 'HEALTH_RECORD',
        eventTimestamp: new Date('2026-09-12T10:00:00Z'),
      });

      const events = await timelineRepo.findMany({ patientId: PATIENT_ID });
      expect(events.total).toBe(2);
      expect(events.data[0]!.title).toBe('Blood Report'); // Sept 12 before Sept 10
      expect(events.data[1]!.title).toBe('Check-in Day 1');
    });
  });

  describe('HealthRecordsStorageService Contract', () => {
    let storage: HealthRecordsStorageService;

    beforeEach(() => {
      storage = new HealthRecordsStorageService();
    });

    it('should upload, check existence, download, and delete files', async () => {
      const key = 'test/path/report.pdf';
      const buffer = Buffer.from('PDF_SAMPLE_DATA');

      const uploadResult = await storage.upload({
        key,
        buffer,
        mimeType: 'application/pdf',
      });
      expect(uploadResult.key).toBe(key);
      expect(uploadResult.sizeBytes).toBe(buffer.length);

      const exists = await storage.exists(key);
      expect(exists).toBe(true);

      const downloaded = await storage.download(key);
      expect(downloaded.toString()).toBe('PDF_SAMPLE_DATA');

      const signedUrl = await storage.getSignedUrl(key, 300);
      expect(signedUrl).toContain('vault.manvia.internal');

      const uploadUrl = await storage.getUploadUrl(key, 300);
      expect(uploadUrl).toContain('vault.manvia.internal');

      const deleted = await storage.delete(key);
      expect(deleted).toBe(true);

      const existsAfter = await storage.exists(key);
      expect(existsAfter).toBe(false);
    });
  });

  describe('Prisma Repository Mocked Delegates', () => {
    it('PrismaHealthRecordRepository should map records correctly', async () => {
      const mockDelegate = {
        create: async (args: { data: Record<string, unknown> }) => ({
          id: 'prisma-rec-1',
          publicRecordId: 'REC-PRISMA01',
          patientId: PATIENT_ID,
          uploadedByUserId: USER_ID,
          category: args.data['category'] as HealthRecordCategory,
          title: args.data['title'] as string,
          description: (args.data['description'] as string | null) ?? null,
          storageKey: args.data['storageKey'] as string,
          originalFileName: args.data['originalFileName'] as string,
          mimeType: args.data['mimeType'] as string,
          fileSizeBytes: args.data['fileSizeBytes'] as number,
          sha256Hash: null,
          status: HealthRecordStatus.AVAILABLE,
          recordedDate: args.data['recordedDate'] as Date,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findUnique: async () => null,
        findFirst: async () => null,
        findMany: async () => [],
        update: async () => ({
          id: 'prisma-rec-1',
          publicRecordId: 'REC-PRISMA01',
          patientId: PATIENT_ID,
          uploadedByUserId: USER_ID,
          category: HealthRecordCategory.LAB_REPORT,
          title: 'Updated Title',
          description: null,
          storageKey: 'k',
          originalFileName: 'f.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 100,
          sha256Hash: null,
          status: HealthRecordStatus.AVAILABLE,
          recordedDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        count: async () => 1,
      };

      const prismaRepo = new PrismaHealthRecordRepository({ healthRecord: mockDelegate });
      const record = await prismaRepo.create({
        patientId: PATIENT_ID,
        uploadedByUserId: USER_ID,
        category: HealthRecordCategory.LAB_REPORT,
        title: 'Prisma Record',
        storageKey: 'k',
        originalFileName: 'f.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 100,
        recordedDate: new Date(),
      });

      expect(record.id).toBe('prisma-rec-1');
      expect(record.publicRecordId).toBe('REC-PRISMA01');
    });

    it('PrismaHealthTimelineRepository should map events correctly', async () => {
      const mockDelegate = {
        create: async (args: { data: Record<string, unknown> }) => ({
          id: 'prisma-evt-1',
          publicEventId: 'EVT-PRISMA01',
          patientId: PATIENT_ID,
          eventType: args.data['eventType'] as TimelineEventType,
          title: args.data['title'] as string,
          summary: args.data['summary'] as string,
          sourceType: args.data['sourceType'] as string,
          sourceId: (args.data['sourceId'] as string | null) ?? null,
          eventTimestamp: args.data['eventTimestamp'] as Date,
          metadata: JSON.stringify({ note: 'ok' }),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findUnique: async () => null,
        findFirst: async () => null,
        findMany: async () => [],
        count: async () => 1,
      };

      const prismaRepo = new PrismaHealthTimelineRepository({ timelineEvent: mockDelegate });
      const event = await prismaRepo.create({
        patientId: PATIENT_ID,
        eventType: TimelineEventType.HEALTH_RECORD_ADDED,
        title: 'Prisma Event',
        summary: 'Summary',
        sourceType: 'RECORD',
        eventTimestamp: new Date(),
      });

      expect(event.id).toBe('prisma-evt-1');
      expect(event.metadata).toEqual({ note: 'ok' });
    });
  });
});
