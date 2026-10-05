import { describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { RazorpayPaymentProvider } from '../../src/modules/payments/providers/razorpay-payment.provider.js';
import type { ConfigService } from '../../src/config/config.service.js';

describe('RazorpayPaymentProvider (M8 Production Gateway)', () => {
  let provider: RazorpayPaymentProvider;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      razorpayKeyId: 'rzp_test_1234567890',
      razorpayKeySecret: 'test_secret_key_1234567890',
      razorpayWebhookSecret: 'webhook_secret_key_1234567890',
    };
    provider = new RazorpayPaymentProvider(mockConfigService as ConfigService);
  });

  describe('Webhook Verification', () => {
    it('should successfully verify valid HMAC-SHA256 webhook signature and parse event', async () => {
      const payloadObj = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_987654321',
              amount: 15000,
              currency: 'INR',
              status: 'captured',
              notes: {
                paymentId: 'pay-uuid-1',
              },
            },
          },
        },
      };
      const rawPayload = JSON.stringify(payloadObj);
      const signature = createHmac('sha256', mockConfigService.razorpayWebhookSecret!)
        .update(rawPayload)
        .digest('hex');

      const result = await provider.verifyWebhook(
        { 'x-razorpay-signature': signature },
        rawPayload,
      );

      expect(result.valid).toBe(true);
      expect(result.eventType).toBe('payment.captured');
      expect(result.status).toBe('SUCCEEDED');
      expect(result.providerPaymentId).toBe('pay_987654321');
      expect(result.paymentId).toBe('pay-uuid-1');
      expect(result.amount).toBe('150.00');
      expect(result.currency).toBe('INR');
    });

    it('should reject webhook with invalid signature', async () => {
      const rawPayload = JSON.stringify({ event: 'payment.captured' });
      const result = await provider.verifyWebhook(
        { 'x-razorpay-signature': 'invalid_signature_hex_value_that_does_not_match' },
        rawPayload,
      );

      expect(result.valid).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.failureReason).toContain('mismatch');
    });

    it('should reject webhook when signature header is missing', async () => {
      const rawPayload = JSON.stringify({ event: 'payment.captured' });
      const result = await provider.verifyWebhook({}, rawPayload);

      expect(result.valid).toBe(false);
      expect(result.status).toBe('FAILED');
    });

    it('should reject webhook with malformed JSON body', async () => {
      const malformedPayload = 'not valid json {{{';
      const signature = createHmac('sha256', mockConfigService.razorpayWebhookSecret!)
        .update(malformedPayload)
        .digest('hex');

      const result = await provider.verifyWebhook(
        { 'x-razorpay-signature': signature },
        malformedPayload,
      );

      expect(result.valid).toBe(false);
      expect(result.failureReason).toContain('Malformed');
    });
  });

  describe('Payment Verification', () => {
    it('should reject payment verification if cryptographic signature is invalid', async () => {
      const result = await provider.verifyPayment({
        paymentId: 'pay-uuid-1',
        providerPaymentId: 'order_123',
        signature: 'invalid_sig',
        rawPayload: {
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_123',
        },
      });

      expect(result.verified).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.failureReason).toBe('Cryptographic signature mismatch');
    });
  });

  describe('Order Creation & Unconfigured Guard', () => {
    it('should fail fast if Razorpay credentials are missing in configuration', async () => {
      const unconfiguredProvider = new RazorpayPaymentProvider({
        razorpayKeyId: '',
        razorpayKeySecret: '',
        razorpayWebhookSecret: '',
      } as ConfigService);

      await expect(
        unconfiguredProvider.createPaymentSession({
          paymentId: 'pay-1',
          amount: '100.00',
          currency: 'INR',
          appointmentId: 'appt-1',
          patientId: 'pat-1',
        }),
      ).rejects.toThrow('Razorpay payment gateway not configured');
    });
  });
});
