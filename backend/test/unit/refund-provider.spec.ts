import { describe, it, expect, beforeEach } from 'vitest';
import { SimulatedRefundProvider } from '../../src/modules/refunds/providers/simulated-refund.provider.js';
import { RefundStatus } from '../../src/modules/refunds/enums/refund-status.enum.js';

describe('SimulatedRefundProvider (Unit Tests)', () => {
  let provider: SimulatedRefundProvider;

  beforeEach(() => {
    provider = new SimulatedRefundProvider();
  });

  it('should successfully execute simulated refund and return reference', async () => {
    const result = await provider.executeRefund({
      refundId: 'ref-1',
      publicRefundId: 'REF-123456',
      appointmentId: 'appt-1',
      amount: 100,
      currency: 'USD',
      reason: 'Patient cancellation',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe(RefundStatus.SUCCEEDED);
    expect(result.providerReference).toMatch(/^sim_ref_/);
    expect(result.processedAt).toBeInstanceOf(Date);
  });

  it('should handle simulated failure when reason includes fail-simulation', async () => {
    const result = await provider.executeRefund({
      refundId: 'ref-fail',
      publicRefundId: 'REF-FAIL01',
      appointmentId: 'appt-fail',
      amount: 50,
      currency: 'USD',
      reason: 'Testing fail-simulation path',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(RefundStatus.FAILED);
    expect(result.failureReason).toContain('gateway unavailable');
  });
});
