import { describe, it, expect, vi, afterEach } from 'vitest';
import { ResendEmailProvider } from '../../src/modules/notifications/providers/resend-email.provider.js';
import { TwilioSmsProvider } from '../../src/modules/notifications/providers/twilio-sms.provider.js';
import { FcmPushProvider } from '../../src/modules/notifications/providers/fcm-push.provider.js';
import type { ConfigService } from '../../src/config/config.service.js';

describe('Production Notification Providers (M8)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('ResendEmailProvider', () => {
    it('returns failure when RESEND_API_KEY is missing', async () => {
      const mockConfig = {
        raw: { EMAIL_PROVIDER: 'resend' },
      } as unknown as ConfigService;

      const provider = new ResendEmailProvider(mockConfig);
      const res = await provider.send({
        recipientEmail: 'patient@example.com',
        subject: 'Appointment Confirmed',
        bodyText: 'Your appointment is confirmed.',
      });

      expect(res.success).toBe(false);
      expect(res.failureCode).toBe('MISSING_API_KEY');
      expect(res.isRetryable).toBe(false);
    });

    it('successfully delivers email via Resend API', async () => {
      const mockConfig = {
        raw: {
          EMAIL_PROVIDER: 'resend',
          RESEND_API_KEY: 're_1234567890',
          EMAIL_FROM: 'MANVIA Health <alerts@manvia.health>',
        },
      } as unknown as ConfigService;

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'resend_msg_abc123' }),
      } as unknown as Response);

      const provider = new ResendEmailProvider(mockConfig);
      const res = await provider.send({
        recipientEmail: 'patient@example.com',
        subject: 'Appointment Confirmed',
        bodyText: 'Your appointment is confirmed.',
      });

      expect(res.success).toBe(true);
      expect(res.provider).toBe('resend');
      expect(res.providerMessageId).toBe('resend_msg_abc123');
    });

    it('marks HTTP 500 error as retryable', async () => {
      const mockConfig = {
        raw: {
          EMAIL_PROVIDER: 'resend',
          RESEND_API_KEY: 're_1234567890',
        },
      } as unknown as ConfigService;

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as unknown as Response);

      const provider = new ResendEmailProvider(mockConfig);
      const res = await provider.send({
        recipientEmail: 'patient@example.com',
        subject: 'Appointment Confirmed',
        bodyText: 'Your appointment is confirmed.',
      });

      expect(res.success).toBe(false);
      expect(res.isRetryable).toBe(true);
      expect(res.failureCode).toBe('HTTP_503');
    });
  });

  describe('TwilioSmsProvider', () => {
    it('returns failure when Twilio credentials are missing', async () => {
      const mockConfig = {
        raw: { SMS_PROVIDER: 'twilio' },
      } as unknown as ConfigService;

      const provider = new TwilioSmsProvider(mockConfig);
      const res = await provider.send({
        phoneNumber: '+919876543210',
        bodyText: 'Your verification OTP is 123456',
      });

      expect(res.success).toBe(false);
      expect(res.failureCode).toBe('MISSING_CREDENTIALS');
    });

    it('successfully delivers SMS via Twilio Messages API', async () => {
      const mockConfig = {
        raw: {
          SMS_PROVIDER: 'twilio',
          TWILIO_ACCOUNT_SID: 'AC1234567890abcdef',
          TWILIO_AUTH_TOKEN: 'token12345',
          TWILIO_PHONE_NUMBER: '+15551234567',
        },
      } as unknown as ConfigService;

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sid: 'SM1234567890abcdef' }),
      } as unknown as Response);

      const provider = new TwilioSmsProvider(mockConfig);
      const res = await provider.send({
        phoneNumber: '+919876543210',
        bodyText: 'Your verification OTP is 123456',
      });

      expect(res.success).toBe(true);
      expect(res.provider).toBe('twilio');
      expect(res.providerMessageId).toBe('SM1234567890abcdef');
    });
  });

  describe('FcmPushProvider', () => {
    it('returns failure when FIREBASE_PROJECT_ID is missing', async () => {
      const mockConfig = {
        raw: { PUSH_PROVIDER: 'fcm' },
      } as unknown as ConfigService;

      const provider = new FcmPushProvider(mockConfig);
      const res = await provider.send({
        pushToken: 'sample_token_123',
        title: 'New Message',
        body: 'You have a new update.',
      });

      expect(res.success).toBe(false);
      expect(res.failureCode).toBe('MISSING_PROJECT_ID');
    });

    it('successfully constructs push dispatch with configured project', async () => {
      const mockConfig = {
        raw: {
          PUSH_PROVIDER: 'fcm',
          FIREBASE_PROJECT_ID: 'manvia-health-prod',
        },
      } as unknown as ConfigService;

      const provider = new FcmPushProvider(mockConfig);
      const res = await provider.send({
        pushToken: 'sample_token_123',
        title: 'New Message',
        body: 'You have a new update.',
      });

      expect(res.success).toBe(true);
      expect(res.provider).toBe('fcm');
      expect(res.providerMessageId).toBeDefined();
    });
  });
});
