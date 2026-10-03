import { describe, it, expect, beforeEach } from 'vitest';
import {
  SimulatedEmailProvider,
  SimulatedPushProvider,
  SimulatedSmsProvider,
} from '../../src/modules/notifications/providers/simulated-providers.js';

describe('Simulated Notification Providers (Unit Tests)', () => {
  describe('SimulatedEmailProvider', () => {
    let provider: SimulatedEmailProvider;

    beforeEach(() => {
      provider = new SimulatedEmailProvider();
    });

    it('should successfully send an email message and record it', async () => {
      const result = await provider.send({
        recipientEmail: 'patient@example.com',
        subject: 'Appointment Confirmed',
        bodyText: 'Your appointment is confirmed for tomorrow.',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('simulated-email');
      expect(result.providerMessageId).toBeDefined();
      expect(provider.sentEmails).toHaveLength(1);
      expect(provider.sentEmails[0]?.recipientEmail).toBe('patient@example.com');
    });

    it('should handle permanent failure when failNextWithPermanent is true', async () => {
      provider.failNextWithPermanent = true;
      const result = await provider.send({
        recipientEmail: 'invalid@example.com',
        subject: 'Test',
        bodyText: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.failureCode).toBe('INVALID_RECIPIENT');
      expect(result.isRetryable).toBe(false);
      expect(provider.failNextWithPermanent).toBe(false);
    });

    it('should handle transient failure when failNextWithTransient is true', async () => {
      provider.failNextWithTransient = true;
      const result = await provider.send({
        recipientEmail: 'patient@example.com',
        subject: 'Test',
        bodyText: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.failureCode).toBe('TIMEOUT_ERROR');
      expect(result.isRetryable).toBe(true);
      expect(provider.failNextWithTransient).toBe(false);
    });

    it('should clear recorded messages and failure flags', () => {
      provider.failNextWithPermanent = true;
      provider.failNextWithTransient = true;
      provider.sentEmails = [{ recipientEmail: 'a@b.com', subject: 's', bodyText: 'b' }];

      provider.clear();
      expect(provider.sentEmails).toHaveLength(0);
      expect(provider.failNextWithPermanent).toBe(false);
      expect(provider.failNextWithTransient).toBe(false);
    });
  });

  describe('SimulatedPushProvider', () => {
    let provider: SimulatedPushProvider;

    beforeEach(() => {
      provider = new SimulatedPushProvider();
    });

    it('should successfully send a push notification and record it', async () => {
      const result = await provider.send({
        pushToken: 'push-token-1234567890',
        title: 'New Update',
        body: 'You have a new message.',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('simulated-push');
      expect(result.providerMessageId).toBeDefined();
      expect(provider.sentPushes).toHaveLength(1);
    });

    it('should handle permanent failure when token is invalid', async () => {
      provider.failNextWithPermanent = true;
      const result = await provider.send({
        pushToken: 'bad-token',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.failureCode).toBe('INVALID_DEVICE_TOKEN');
      expect(result.isRetryable).toBe(false);
    });

    it('should handle transient rate-limit failure', async () => {
      provider.failNextWithTransient = true;
      const result = await provider.send({
        pushToken: 'token-123',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.failureCode).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.isRetryable).toBe(true);
    });

    it('should clear push history and flags', () => {
      provider.sentPushes.push({ pushToken: 'tok', title: 't', body: 'b' });
      provider.clear();
      expect(provider.sentPushes).toHaveLength(0);
    });
  });

  describe('SimulatedSmsProvider', () => {
    let provider: SimulatedSmsProvider;

    beforeEach(() => {
      provider = new SimulatedSmsProvider();
    });

    it('should successfully send an SMS message and mask phone in logging', async () => {
      const result = await provider.send({
        phoneNumber: '+15551234567',
        bodyText: 'Your verification code is 123456',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('simulated-sms');
      expect(result.providerMessageId).toBeDefined();
      expect(provider.sentSms).toHaveLength(1);
    });

    it('should handle invalid phone number as permanent failure', async () => {
      provider.failNextWithPermanent = true;
      const result = await provider.send({
        phoneNumber: 'invalid-phone',
        bodyText: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.failureCode).toBe('INVALID_PHONE_NUMBER');
      expect(result.isRetryable).toBe(false);
    });

    it('should handle gateway timeout as transient failure', async () => {
      provider.failNextWithTransient = true;
      const result = await provider.send({
        phoneNumber: '+15551234567',
        bodyText: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.failureCode).toBe('GATEWAY_TIMEOUT');
      expect(result.isRetryable).toBe(true);
    });

    it('should clear SMS history and flags', () => {
      provider.sentSms.push({ phoneNumber: '+123', bodyText: 'msg' });
      provider.clear();
      expect(provider.sentSms).toHaveLength(0);
    });
  });
});
