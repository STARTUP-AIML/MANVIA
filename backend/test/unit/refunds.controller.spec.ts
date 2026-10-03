import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RefundsController } from '../../src/modules/refunds/controllers/refunds.controller.js';
import type { RefundsService } from '../../src/modules/refunds/services/refunds.service.js';
import { RefundStatus } from '../../src/modules/refunds/enums/refund-status.enum.js';
import type { CurrentUserContext } from '../../src/modules/doctors/interfaces/auth-context.interface.js';

describe('RefundsController (Unit Tests)', () => {
  let controller: RefundsController;
  let service: RefundsService;

  const mockUser: CurrentUserContext = {
    userId: 'patient-user-1',
    activeRole: 'PATIENT',
    email: 'patient@example.com',
  };

  const mockRefund = {
    id: 'ref-uuid-1',
    publicRefundId: 'REF-ABC12345',
    appointmentId: 'appt-uuid-1',
    paymentId: null,
    amount: 100,
    currency: 'USD',
    reason: 'Advance cancellation',
    status: RefundStatus.SUCCEEDED,
    requestedAt: '2026-10-01T10:00:00.000Z',
    processedAt: '2026-10-01T10:00:05.000Z',
    failureReason: null,
    providerReference: 'sim_ref_123',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:05.000Z',
  };

  beforeEach(() => {
    service = {
      getPatientRefunds: vi.fn().mockResolvedValue({
        data: [mockRefund],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
      getRefundById: vi.fn().mockResolvedValue(mockRefund),
    } as unknown as RefundsService;

    controller = new RefundsController(service);
  });

  it('should list refunds for patient', async () => {
    const res = await controller.getRefunds(mockUser, { page: 1, limit: 20 });
    expect(res.data.length).toBe(1);
    expect(res.data[0]!.publicRefundId).toBe('REF-ABC12345');
    expect(service.getPatientRefunds).toHaveBeenCalledWith(mockUser.userId, { page: 1, limit: 20 });
  });

  it('should get refund by id', async () => {
    const res = await controller.getRefundById(mockUser, 'ref-uuid-1');
    expect(res.publicRefundId).toBe('REF-ABC12345');
    expect(service.getRefundById).toHaveBeenCalledWith(mockUser, 'ref-uuid-1');
  });
});
