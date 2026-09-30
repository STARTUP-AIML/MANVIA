import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryRefundRepository } from '../../src/modules/refunds/repositories/in-memory-refund.repository.js';
import { PrismaRefundRepository } from '../../src/modules/refunds/repositories/prisma-refund.repository.js';
import { RefundStatus } from '../../src/modules/refunds/enums/refund-status.enum.js';

describe('Refund Repositories (Unit Tests)', () => {
  describe('InMemoryRefundRepository', () => {
    let repo: InMemoryRefundRepository;

    beforeEach(() => {
      repo = new InMemoryRefundRepository();
    });

    it('should create and retrieve refund by ID, public ID, and idempotency key', async () => {
      const created = await repo.createRefund({
        publicRefundId: 'REF-123456',
        appointmentId: 'appt-1',
        paymentId: 'pay-1',
        amount: 100,
        currency: 'USD',
        reason: 'Patient cancellation',
        idempotencyKey: 'idem-key-1',
      });

      expect(created.id).toBeDefined();
      expect(created.status).toBe(RefundStatus.REQUESTED);

      const byId = await repo.findById(created.id);
      expect(byId?.publicRefundId).toBe('REF-123456');

      const byPublicId = await repo.findByPublicId('REF-123456');
      expect(byPublicId?.id).toBe(created.id);

      const byIdem = await repo.findByIdempotencyKey('idem-key-1');
      expect(byIdem?.id).toBe(created.id);

      const notFoundId = await repo.findById('non-existent');
      expect(notFoundId).toBeNull();

      const notFoundPublic = await repo.findByPublicId('REF-UNKNOWN');
      expect(notFoundPublic).toBeNull();

      const notFoundIdem = await repo.findByIdempotencyKey('unknown-key');
      expect(notFoundIdem).toBeNull();
    });

    it('should find refunds by appointmentId and update fields', async () => {
      const ref1 = await repo.createRefund({
        publicRefundId: 'REF-1',
        appointmentId: 'appt-shared',
        amount: 50,
        currency: 'USD',
        reason: 'Test 1',
      });

      await repo.createRefund({
        publicRefundId: 'REF-2',
        appointmentId: 'appt-shared',
        amount: 50,
        currency: 'USD',
        reason: 'Test 2',
      });

      const forAppt = await repo.findByAppointmentId('appt-shared');
      expect(forAppt).toHaveLength(2);

      const updated = await repo.updateRefund(ref1.id, {
        status: RefundStatus.SUCCEEDED,
        providerReference: 'prov-ref-1',
        failureReason: null,
        metadata: '{"custom":"meta"}',
      });

      expect(updated.status).toBe(RefundStatus.SUCCEEDED);
      expect(updated.providerReference).toBe('prov-ref-1');
      expect(updated.metadata).toBe('{"custom":"meta"}');
    });

    it('should throw error when updating non-existent refund', async () => {
      await expect(
        repo.updateRefund('missing-id', { status: RefundStatus.FAILED }),
      ).rejects.toThrow('Refund with id missing-id not found');
    });

    it('should filter, sort, and paginate refunds', async () => {
      await repo.createRefund({
        publicRefundId: 'REF-P1',
        appointmentId: 'appt-a',
        amount: 10,
        currency: 'USD',
        reason: 'A',
        status: RefundStatus.REQUESTED,
      });

      await repo.createRefund({
        publicRefundId: 'REF-P2',
        appointmentId: 'appt-b',
        amount: 20,
        currency: 'USD',
        reason: 'B',
        status: RefundStatus.SUCCEEDED,
      });

      const filteredByAppt = await repo.findRefunds({ appointmentId: 'appt-a' });
      expect(filteredByAppt.total).toBe(1);
      expect(filteredByAppt.data[0]?.appointmentId).toBe('appt-a');

      const filteredByList = await repo.findRefunds({
        appointmentIds: ['appt-a', 'appt-b'],
        page: 1,
        limit: 10,
      });
      expect(filteredByList.total).toBe(2);

      const filteredByStatus = await repo.findRefunds({ status: RefundStatus.SUCCEEDED });
      expect(filteredByStatus.total).toBe(1);
      expect(filteredByStatus.data[0]?.status).toBe(RefundStatus.SUCCEEDED);
    });

    it('should clear all entries', async () => {
      await repo.createRefund({
        publicRefundId: 'REF-CLEAR',
        appointmentId: 'appt-c',
        amount: 30,
        currency: 'USD',
        reason: 'Clear test',
      });

      repo.clear();
      const all = await repo.findRefunds({});
      expect(all.total).toBe(0);
    });
  });

  describe('PrismaRefundRepository', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockPrisma: any;
    let repo: PrismaRefundRepository;

    const mockRawRefund = {
      id: 'uuid-ref-1',
      publicRefundId: 'REF-123',
      appointmentId: 'appt-uuid-1',
      paymentId: 'pay-uuid-1',
      amount: '100.00',
      currency: 'USD',
      reason: 'Doctor unavailable',
      status: RefundStatus.REQUESTED,
      idempotencyKey: 'idem-1',
      requestedAt: new Date('2026-09-30'),
      processedAt: null,
      failureReason: null,
      providerReference: null,
      metadata: null,
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
    };

    beforeEach(() => {
      mockPrisma = {
        refund: {
          create: vi.fn().mockResolvedValue(mockRawRefund),
          findUnique: vi.fn().mockResolvedValue(mockRawRefund),
          findMany: vi.fn().mockResolvedValue([mockRawRefund]),
          update: vi.fn().mockResolvedValue({
            ...mockRawRefund,
            status: RefundStatus.SUCCEEDED,
            providerReference: 'ref-prov',
          }),
          count: vi.fn().mockResolvedValue(1),
        },
      };
      repo = new PrismaRefundRepository(mockPrisma);
    });

    it('should throw when PrismaClient is not initialized', async () => {
      const uninitializedRepo = new PrismaRefundRepository();
      await expect(
        uninitializedRepo.createRefund({
          publicRefundId: 'REF-X',
          appointmentId: 'a',
          amount: 10,
          currency: 'USD',
          reason: 'r',
        }),
      ).rejects.toThrow('PrismaClient is not initialized in PrismaRefundRepository');
    });

    it('should create refund using Prisma', async () => {
      const result = await repo.createRefund({
        publicRefundId: 'REF-123',
        appointmentId: 'appt-uuid-1',
        paymentId: 'pay-uuid-1',
        amount: 100,
        currency: 'USD',
        reason: 'Doctor unavailable',
        idempotencyKey: 'idem-1',
      });

      expect(mockPrisma.refund.create).toHaveBeenCalled();
      expect(result.publicRefundId).toBe('REF-123');
      expect(result.amount).toBe(100);
    });

    it('should find by id, publicId, appointmentId, and idempotencyKey', async () => {
      const byId = await repo.findById('uuid-ref-1');
      expect(byId?.id).toBe('uuid-ref-1');

      const byPublicId = await repo.findByPublicId('REF-123');
      expect(byPublicId?.publicRefundId).toBe('REF-123');

      const byAppt = await repo.findByAppointmentId('appt-uuid-1');
      expect(byAppt).toHaveLength(1);

      const byIdem = await repo.findByIdempotencyKey('idem-1');
      expect(byIdem?.idempotencyKey).toBe('idem-1');

      mockPrisma.refund.findUnique.mockResolvedValueOnce(null);
      const notFound = await repo.findById('non-existent');
      expect(notFound).toBeNull();
    });

    it('should update refund using Prisma', async () => {
      const updated = await repo.updateRefund('uuid-ref-1', {
        status: RefundStatus.SUCCEEDED,
        providerReference: 'ref-prov',
        processedAt: new Date(),
        failureReason: null,
      });

      expect(mockPrisma.refund.update).toHaveBeenCalledWith({
        where: { id: 'uuid-ref-1' },
        data: expect.objectContaining({
          status: RefundStatus.SUCCEEDED,
          providerReference: 'ref-prov',
        }),
      });
      expect(updated.status).toBe(RefundStatus.SUCCEEDED);
    });

    it('should query refunds with filters and pagination', async () => {
      const result = await repo.findRefunds({
        appointmentIds: ['appt-uuid-1', 'appt-uuid-2'],
        status: RefundStatus.REQUESTED,
        page: 2,
        limit: 10,
      });

      expect(mockPrisma.refund.findMany).toHaveBeenCalledWith({
        where: {
          appointmentId: { in: ['appt-uuid-1', 'appt-uuid-2'] },
          status: RefundStatus.REQUESTED,
        },
        orderBy: { requestedAt: 'desc' },
        skip: 10,
        take: 10,
      });
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });
});
