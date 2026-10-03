import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentWebhooksController } from '../../src/modules/payments/controllers/payment-webhooks.controller.js';
import type { PaymentWebhookService } from '../../src/modules/payments/services/payment-webhook.service.js';

describe('PaymentWebhooksController (Unit Tests)', () => {
  let controller: PaymentWebhooksController;
  let service: Partial<PaymentWebhookService>;

  beforeEach(() => {
    service = {
      handleWebhook: vi.fn().mockResolvedValue({
        processed: true,
        duplicate: false,
        eventId: 'evt_1',
        eventType: 'payment.succeeded',
      }),
    };

    controller = new PaymentWebhooksController(service as PaymentWebhookService);
  });

  it('should accept webhook and return 200 format', async () => {
    const headers = { 'x-manvia-signature': 'sig_123' };
    const body = { id: 'evt_1', type: 'payment.succeeded' };

    const result = await controller.handleWebhook('simulated', headers, body);

    expect(service.handleWebhook).toHaveBeenCalledWith('simulated', headers, JSON.stringify(body));
    expect(result.received).toBe(true);
    expect(result.processed).toBe(true);
    expect(result.duplicate).toBe(false);
  });
});
