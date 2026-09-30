import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentsController } from '../../src/modules/payments/controllers/payments.controller.js';
import type { PaymentsService } from '../../src/modules/payments/services/payments.service.js';
import type { CurrentUserContext } from '../../src/modules/doctors/interfaces/auth-context.interface.js';

describe('PaymentsController (Unit Tests)', () => {
  let controller: PaymentsController;
  let service: Partial<PaymentsService>;

  const mockActor: CurrentUserContext = {
    userId: 'pat-1',
    activeRole: 'PATIENT',
  };

  beforeEach(() => {
    service = {
      createPayment: vi.fn().mockResolvedValue({
        id: 'pay-1',
        publicPaymentId: 'PAY-1',
        amount: '100.00',
        currency: 'USD',
        status: 'PENDING',
      }),
      getPayments: vi.fn().mockResolvedValue({
        items: [{ id: 'pay-1', publicPaymentId: 'PAY-1' }],
        total: 1,
      }),
      getPaymentById: vi.fn().mockResolvedValue({
        id: 'pay-1',
        publicPaymentId: 'PAY-1',
      }),
      getPaymentAttempts: vi
        .fn()
        .mockResolvedValue([{ id: 'att-1', attemptNumber: 1, status: 'INITIATED' }]),
      verifyPayment: vi.fn().mockResolvedValue({
        id: 'pay-1',
        status: 'SUCCEEDED',
      }),
    };

    controller = new PaymentsController(service as PaymentsService);
  });

  it('should call createPayment with header idempotency key fallback', async () => {
    const dto = { appointmentId: 'appt-1' };
    const result = await controller.createPayment(mockActor, dto, 'idem-header-1');

    expect(service.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 'appt-1',
        idempotencyKey: 'idem-header-1',
      }),
      mockActor,
    );
    expect(result.id).toBe('pay-1');
  });

  it('should delegate getPayments to service', async () => {
    const result = await controller.getPayments(mockActor, { limit: 10 });
    expect(service.getPayments).toHaveBeenCalledWith({ limit: 10 }, mockActor);
    expect(result.total).toBe(1);
  });

  it('should delegate getPaymentById to service', async () => {
    const result = await controller.getPaymentById(mockActor, 'PAY-1');
    expect(service.getPaymentById).toHaveBeenCalledWith('PAY-1', mockActor);
    expect(result.publicPaymentId).toBe('PAY-1');
  });

  it('should delegate getPaymentAttempts to service', async () => {
    const result = await controller.getPaymentAttempts(mockActor, 'pay-1');
    expect(service.getPaymentAttempts).toHaveBeenCalledWith('pay-1', mockActor);
    expect(result).toHaveLength(1);
  });

  it('should delegate verifyPayment to service', async () => {
    const result = await controller.verifyPayment(mockActor, 'pay-1', {
      providerPaymentId: 'prov_123',
    });
    expect(service.verifyPayment).toHaveBeenCalledWith(
      'pay-1',
      { providerPaymentId: 'prov_123' },
      mockActor,
    );
    expect(result.status).toBe('SUCCEEDED');
  });
});
