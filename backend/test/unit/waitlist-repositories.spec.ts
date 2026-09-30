import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryWaitlistRepository } from '../../src/modules/waitlist/repositories/in-memory-waitlist.repository.js';
import { PrismaWaitlistRepository } from '../../src/modules/waitlist/repositories/prisma-waitlist.repository.js';
import { WaitlistStatus } from '../../src/modules/waitlist/enums/waitlist-status.enum.js';

describe('Waitlist Repositories (Unit Tests)', () => {
  describe('InMemoryWaitlistRepository', () => {
    let repo: InMemoryWaitlistRepository;

    beforeEach(() => {
      repo = new InMemoryWaitlistRepository();
    });

    it('should create and retrieve entry by ID and public ID', async () => {
      const entry = await repo.createEntry({
        publicWaitlistId: 'WL-123456',
        patientId: 'pat-1',
        doctorId: 'doc-1',
        consultationOfferId: 'offer-1',
        priority: 10,
        status: WaitlistStatus.ACTIVE,
        notes: 'Urgent checkup',
      });

      expect(entry.id).toBeDefined();
      expect(entry.publicWaitlistId).toBe('WL-123456');

      const byId = await repo.findById(entry.id);
      expect(byId?.publicWaitlistId).toBe('WL-123456');

      const byPublicId = await repo.findByPublicId('WL-123456');
      expect(byPublicId?.id).toBe(entry.id);

      const notFoundId = await repo.findById('missing');
      expect(notFoundId).toBeNull();

      const notFoundPublic = await repo.findByPublicId('missing');
      expect(notFoundPublic).toBeNull();
    });

    it('should find active entry by patient and doctor', async () => {
      await repo.createEntry({
        publicWaitlistId: 'WL-A',
        patientId: 'pat-1',
        doctorId: 'doc-1',
        consultationOfferId: 'off-1',
        status: WaitlistStatus.ACTIVE,
      });

      const found = await repo.findActiveByPatientAndDoctor('pat-1', 'doc-1', 'off-1');
      expect(found).not.toBeNull();
      expect(found?.publicWaitlistId).toBe('WL-A');

      const foundWithoutOffer = await repo.findActiveByPatientAndDoctor('pat-1', 'doc-1');
      expect(foundWithoutOffer).not.toBeNull();

      const notFoundWrongOffer = await repo.findActiveByPatientAndDoctor(
        'pat-1',
        'doc-1',
        'off-wrong',
      );
      expect(notFoundWrongOffer).toBeNull();
    });

    it('should filter eligible entries for doctor respecting preferences and order by priority and time', async () => {
      const startAt = new Date('2026-10-01T10:00:00Z');
      const endAt = new Date('2026-10-01T10:30:00Z');

      await repo.createEntry({
        publicWaitlistId: 'WL-LOW',
        patientId: 'pat-low',
        doctorId: 'doc-1',
        priority: 1,
        status: WaitlistStatus.ACTIVE,
      });

      await repo.createEntry({
        publicWaitlistId: 'WL-HIGH',
        patientId: 'pat-high',
        doctorId: 'doc-1',
        priority: 10,
        status: WaitlistStatus.ACTIVE,
      });

      // Entry with conflicting preferred date
      await repo.createEntry({
        publicWaitlistId: 'WL-OUT-OF-RANGE',
        patientId: 'pat-out',
        doctorId: 'doc-1',
        priority: 20,
        status: WaitlistStatus.ACTIVE,
        preferredStartDate: new Date('2026-10-05T00:00:00Z'),
      });

      const eligible = await repo.findEligibleEntriesForDoctor('doc-1', startAt, endAt);
      expect(eligible).toHaveLength(2);
      expect(eligible[0]?.publicWaitlistId).toBe('WL-HIGH');
      expect(eligible[1]?.publicWaitlistId).toBe('WL-LOW');
    });

    it('should update entry and throw if not found', async () => {
      const created = await repo.createEntry({
        publicWaitlistId: 'WL-UPD',
        patientId: 'pat-u',
        doctorId: 'doc-u',
      });

      const updated = await repo.updateEntry(created.id, {
        status: WaitlistStatus.OFFERED,
        offeredAt: new Date(),
        offerExpiresAt: new Date(Date.now() + 10000),
        offeredAppointmentId: 'appt-offered',
      });

      expect(updated.status).toBe(WaitlistStatus.OFFERED);
      expect(updated.offeredAppointmentId).toBe('appt-offered');

      await expect(
        repo.updateEntry('missing-id', { status: WaitlistStatus.CANCELLED }),
      ).rejects.toThrow('Waitlist entry with id missing-id not found');
    });

    it('should compute queue position and find expired offers', async () => {
      await repo.createEntry({
        publicWaitlistId: 'WL-Q1',
        patientId: 'pat-first',
        doctorId: 'doc-q',
        priority: 10,
        status: WaitlistStatus.ACTIVE,
      });

      await repo.createEntry({
        publicWaitlistId: 'WL-Q2',
        patientId: 'pat-second',
        doctorId: 'doc-q',
        priority: 5,
        status: WaitlistStatus.ACTIVE,
      });

      const pos1 = await repo.getQueuePosition('pat-first', 'doc-q');
      expect(pos1).toBe(1);

      const pos2 = await repo.getQueuePosition('pat-second', 'doc-q');
      expect(pos2).toBe(2);

      const posUnknown = await repo.getQueuePosition('pat-unknown', 'doc-q');
      expect(posUnknown).toBe(0);

      // Expired offers
      const offered = await repo.createEntry({
        publicWaitlistId: 'WL-EXP',
        patientId: 'pat-exp',
        doctorId: 'doc-q',
        status: WaitlistStatus.OFFERED,
      });
      await repo.updateEntry(offered.id, {
        offerExpiresAt: new Date(Date.now() - 5000),
      });

      const expiredList = await repo.findExpiredOffers(new Date());
      expect(expiredList.some((e) => e.id === offered.id)).toBe(true);
    });

    it('should paginate entries and clear store', async () => {
      await repo.createEntry({
        publicWaitlistId: 'WL-PAGE-1',
        patientId: 'p-1',
        doctorId: 'd-1',
        status: WaitlistStatus.ACTIVE,
      });

      const res = await repo.findEntries({ patientId: 'p-1', page: 1, limit: 5 });
      expect(res.total).toBe(1);
      expect(res.data).toHaveLength(1);

      repo.clear();
      const afterClear = await repo.findEntries({});
      expect(afterClear.total).toBe(0);
    });
  });

  describe('PrismaWaitlistRepository', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockPrisma: any;
    let repo: PrismaWaitlistRepository;

    const mockRawEntry = {
      id: 'wl-uuid-1',
      publicWaitlistId: 'WL-PRISMA',
      patientId: 'pat-uuid-1',
      doctorId: 'doc-uuid-1',
      consultationOfferId: 'off-uuid-1',
      priority: 5,
      status: WaitlistStatus.ACTIVE,
      preferredStartDate: null,
      preferredEndDate: null,
      notes: null,
      joinedAt: new Date('2026-09-30'),
      offeredAt: null,
      offerExpiresAt: null,
      acceptedAt: null,
      declinedAt: null,
      fulfilledAt: null,
      cancelledAt: null,
      offeredAppointmentId: null,
      metadata: null,
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
    };

    beforeEach(() => {
      mockPrisma = {
        waitlistEntry: {
          create: vi.fn().mockResolvedValue(mockRawEntry),
          findUnique: vi.fn().mockResolvedValue(mockRawEntry),
          findFirst: vi.fn().mockResolvedValue(mockRawEntry),
          findMany: vi.fn().mockResolvedValue([mockRawEntry]),
          update: vi.fn().mockResolvedValue({
            ...mockRawEntry,
            status: WaitlistStatus.FULFILLED,
          }),
          count: vi.fn().mockResolvedValue(1),
        },
      };
      repo = new PrismaWaitlistRepository(mockPrisma);
    });

    it('should throw when PrismaClient is not initialized', async () => {
      const uninit = new PrismaWaitlistRepository();
      await expect(
        uninit.createEntry({
          publicWaitlistId: 'WL-X',
          patientId: 'p',
          doctorId: 'd',
        }),
      ).rejects.toThrow('PrismaClient is not initialized in PrismaWaitlistRepository');
    });

    it('should create and find entries using Prisma', async () => {
      const created = await repo.createEntry({
        publicWaitlistId: 'WL-PRISMA',
        patientId: 'pat-uuid-1',
        doctorId: 'doc-uuid-1',
        consultationOfferId: 'off-uuid-1',
      });

      expect(created.publicWaitlistId).toBe('WL-PRISMA');

      const byId = await repo.findById('wl-uuid-1');
      expect(byId?.id).toBe('wl-uuid-1');

      const byPublicId = await repo.findByPublicId('WL-PRISMA');
      expect(byPublicId?.publicWaitlistId).toBe('WL-PRISMA');

      const active = await repo.findActiveByPatientAndDoctor(
        'pat-uuid-1',
        'doc-uuid-1',
        'off-uuid-1',
      );
      expect(active?.id).toBe('wl-uuid-1');
    });

    it('should query eligible entries, expired offers, and queue position', async () => {
      const eligible = await repo.findEligibleEntriesForDoctor(
        'doc-uuid-1',
        new Date('2026-10-01'),
        new Date('2026-10-02'),
      );
      expect(eligible).toHaveLength(1);

      const expired = await repo.findExpiredOffers(new Date());
      expect(expired).toHaveLength(1);

      const queuePos = await repo.getQueuePosition('pat-uuid-1', 'doc-uuid-1');
      expect(queuePos).toBe(1);

      const notFoundQueue = await repo.getQueuePosition('unknown-patient', 'doc-uuid-1');
      expect(notFoundQueue).toBe(0);
    });

    it('should update entry and query entries with pagination', async () => {
      const updated = await repo.updateEntry('wl-uuid-1', {
        status: WaitlistStatus.FULFILLED,
        fulfilledAt: new Date(),
      });
      expect(updated.status).toBe(WaitlistStatus.FULFILLED);

      const paginated = await repo.findEntries({
        patientId: 'pat-uuid-1',
        doctorId: 'doc-uuid-1',
        status: WaitlistStatus.ACTIVE,
        page: 1,
        limit: 10,
      });
      expect(paginated.total).toBe(1);
      expect(paginated.data).toHaveLength(1);
    });
  });
});
