import { describe, it, expect, beforeEach } from 'vitest';
import { SimulatedPaymentProvider } from '../../src/modules/payments/providers/simulated-payment.provider.js';
import { SimulatedPayoutProvider } from '../../src/modules/payments/providers/simulated-payout.provider.js';

describe('Payment & Payout Providers (Unit Tests)', () => {
  describe('SimulatedPaymentProvider', () => {
    let provider: SimulatedPaymentProvider;

    beforeEach(() => {
      provider = new SimulatedPaymentProvider();
    });

    it('should create payment session with client secret and checkout URL', async () => {
      const session = await provider.createPaymentSession({
        paymentId: 'pay-123',
        amount: '100.00',
        currency: 'USD',
        patientId: 'pat-123',
        appointmentId: 'appt-123',
      });

      expect(session.providerPaymentId).toMatch(/^sim_pay_/);
      expect(session.checkoutUrl).toContain(session.providerPaymentId);
      expect(session.clientSecret).toMatch(/^sim_sec_/);
      expect(session.status).toBe('PENDING');
      expect(session.rawResponse).toBeDefined();
    });

    it('should verify payment when session exists', async () => {
      const session = await provider.createPaymentSession({
        paymentId: 'pay-123',
        amount: '150.00',
        currency: 'USD',
        patientId: 'pat-123',
        appointmentId: 'appt-123',
      });

      const verification = await provider.verifyPayment({
        paymentId: 'pay-123',
        providerPaymentId: session.providerPaymentId,
      });

      expect(verification.verified).toBe(true);
      expect(verification.status).toBe('SUCCEEDED');
      expect(verification.amount).toBe('150.00');
    });

    it('should reject payment verification if signature starts with invalid_', async () => {
      const result = await provider.verifyPayment({
        paymentId: 'pay-123',
        providerPaymentId: 'sim_pay_test123',
        signature: 'invalid_sig_here',
      });

      expect(result.verified).toBe(false);
      expect(result.failureReason).toContain('cryptographic');
    });

    it('should allow dynamic verification for unknown session if sim_pay_ prefix is present', async () => {
      const result = await provider.verifyPayment({
        paymentId: 'pay-123',
        providerPaymentId: 'sim_pay_dynamic_test',
      });

      expect(result.verified).toBe(true);
      expect(result.status).toBe('SUCCEEDED');
    });

    it('should fail verification for unknown non-simulated session', async () => {
      const result = await provider.verifyPayment({
        paymentId: 'pay-123',
        providerPaymentId: 'unknown_provider_id',
      });

      expect(result.verified).toBe(false);
      expect(result.failureReason).toContain('Payment session not found');
    });

    it('should fetch payment details if session exists', async () => {
      const session = await provider.createPaymentSession({
        paymentId: 'pay-fetch',
        amount: '75.00',
        currency: 'USD',
        patientId: 'pat-fetch',
        appointmentId: 'appt-fetch',
      });

      const fetched = await provider.fetchPayment(session.providerPaymentId);
      expect(fetched.verified).toBe(true);
      expect(fetched.amount).toBe('75.00');

      const notFound = await provider.fetchPayment('non-existent-id');
      expect(notFound.verified).toBe(false);
      expect(notFound.failureReason).toContain('Payment not found');
    });

    it('should issue refund for payment', async () => {
      const refund = await provider.refundPayment({
        paymentId: 'pay-123',
        refundId: 'ref-123',
        providerPaymentId: 'sim_pay_123',
        amount: '50.00',
        currency: 'USD',
        reason: 'Patient requested refund',
      });

      expect(refund.providerRefundId).toMatch(/^sim_ref_/);
      expect(refund.status).toBe('SUCCEEDED');
    });

    it('should verify webhooks with HMAC signature and payload generator', async () => {
      const eventData = {
        id: 'evt_12345',
        type: 'payment.succeeded',
        paymentId: 'pay-uuid-1',
        amount: '100.00',
        currency: 'USD',
      };

      const { payload, signature } = provider.generateSignedWebhookPayload(eventData);

      const result = await provider.verifyWebhook({ 'x-manvia-signature': signature }, payload);

      expect(result.valid).toBe(true);
      expect(result.providerEventId).toBe('evt_12345');
      expect(result.eventType).toBe('payment.succeeded');
      expect(result.amount).toBe('100.00');
    });

    it('should accept test_signature_valid header value', async () => {
      const payload = JSON.stringify({ id: 'evt_test', type: 'payment.succeeded' });
      const result = await provider.verifyWebhook(
        { 'x-provider-signature': 'test_signature_valid' },
        payload,
      );

      expect(result.valid).toBe(true);
      expect(result.providerEventId).toBe('evt_test');
    });

    it('should reject webhook with missing signature', async () => {
      const result = await provider.verifyWebhook({}, '{}');
      expect(result.valid).toBe(false);
      expect(result.failureReason).toContain('Missing webhook signature');
    });

    it('should reject webhook with mismatched signature', async () => {
      const result = await provider.verifyWebhook({ 'x-manvia-signature': 'bad-signature' }, '{}');
      expect(result.valid).toBe(false);
      expect(result.failureReason).toContain('Signature mismatch');
    });

    it('should reject malformed JSON in webhook payload even with test signature', async () => {
      const result = await provider.verifyWebhook(
        { 'x-manvia-signature': 'test_signature_valid' },
        '{malformed_json',
      );
      expect(result.valid).toBe(false);
      expect(result.failureReason).toContain('Malformed JSON');
    });
  });

  describe('SimulatedPayoutProvider', () => {
    let provider: SimulatedPayoutProvider;

    beforeEach(() => {
      provider = new SimulatedPayoutProvider();
    });

    it('should create payout and retrieve it by providerPayoutId', async () => {
      const created = await provider.createPayout({
        payoutId: 'po-123',
        appointmentId: 'appt-123',
        doctorId: 'doc-payout-1',
        amount: '250.00',
        currency: 'USD',
      });

      expect(created.providerPayoutId).toMatch(/^sim_po_/);
      expect(created.status).toBe('PAID');

      const fetched = await provider.fetchPayout(created.providerPayoutId);
      expect(fetched.status).toBe('PAID');
      expect(fetched.providerPayoutId).toBe(created.providerPayoutId);
    });

    it('should return FAILED status when fetching unknown payout', async () => {
      const result = await provider.fetchPayout('non-existent-payout-id');
      expect(result.status).toBe('FAILED');
      expect(result.failureReason).toContain('Payout not found');
    });
  });
});
