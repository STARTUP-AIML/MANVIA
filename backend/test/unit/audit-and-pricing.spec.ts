import { describe, it, expect } from 'vitest';
import { PaymentAuditService } from '../../src/modules/payments/services/payment-audit.service.js';
import { RefundAuditService } from '../../src/modules/refunds/services/refund-audit.service.js';
import { WaitlistAuditService } from '../../src/modules/waitlist/services/waitlist-audit.service.js';
import { NotificationAuditService } from '../../src/modules/notifications/services/notification-audit.service.js';
import { PricingService } from '../../src/modules/payments/services/pricing.service.js';

describe('Audit Services & PricingService Unit Tests', () => {
  describe('PaymentAuditService', () => {
    it('should log, retrieve, and clear audit events', () => {
      const audit = new PaymentAuditService();
      audit.logEvent({
        event: 'TEST_EVENT',
        resource: 'Payment',
        action: 'TEST',
        status: 'SUCCESS',
        metadata: { info: 123 },
      });

      const logs = audit.getAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.event).toBe('TEST_EVENT');
      expect(logs[0]?.timestamp).toBeInstanceOf(Date);

      audit.clear();
      expect(audit.getAuditLogs().length).toBe(0);
    });
  });

  describe('RefundAuditService', () => {
    it('should log, retrieve, and clear refund audit events', () => {
      const audit = new RefundAuditService();
      audit.logEvent({
        event: 'REFUND_REQUESTED',
        actorId: 'user-1',
        role: 'PATIENT',
        resource: 'REFUND:1',
        action: 'TEST_ACTION',
        metadata: { amount: 10 },
      });

      const logs = audit.getAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.event).toBe('REFUND_REQUESTED');

      audit.clear();
      expect(audit.getAuditLogs().length).toBe(0);
    });
  });

  describe('WaitlistAuditService', () => {
    it('should log, retrieve, and clear waitlist audit events', () => {
      const audit = new WaitlistAuditService();
      audit.logEvent({
        event: 'WAITLIST_JOINED',
        actorId: 'user-2',
        role: 'PATIENT',
        resource: 'WAITLIST:2',
        action: 'JOIN',
      });

      const logs = audit.getAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.event).toBe('WAITLIST_JOINED');

      audit.clear();
      expect(audit.getAuditLogs().length).toBe(0);
    });
  });

  describe('NotificationAuditService', () => {
    it('should sanitize pushToken and password in metadata, retrieve, and clear', () => {
      const audit = new NotificationAuditService();
      audit.logEvent({
        event: 'NOTIF_DISPATCH',
        actorId: 'user-3',
        role: 'SYSTEM',
        resource: 'NOTIFICATION:1',
        action: 'SEND',
        metadata: {
          pushToken: 'sensitive-token-1234',
          password: 'super-secret-password',
          safeField: 'hello',
        },
      });

      const logs = audit.getAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.metadata?.pushToken).toBe('***REDACTED***');
      expect(logs[0]?.metadata?.password).toBeUndefined();
      expect(logs[0]?.metadata?.safeField).toBe('hello');

      audit.clear();
      expect(audit.getAuditLogs().length).toBe(0);
    });
  });

  describe('PricingService', () => {
    it('should get and set configuration and calculate breakdown with custom rates', async () => {
      const pricing = new PricingService();
      const initialConfig = pricing.getConfig();
      expect(initialConfig.defaultPlatformFeePercent).toBe(15);

      pricing.setConfig({
        defaultPlatformFeePercent: 20,
        defaultTaxPercent: 10,
        discountPercent: 10,
      });

      const updatedConfig = pricing.getConfig();
      expect(updatedConfig.defaultPlatformFeePercent).toBe(20);
      expect(updatedConfig.defaultTaxPercent).toBe(10);
      expect(updatedConfig.discountPercent).toBe(10);

      const breakdown = await pricing.calculateBreakdown({
        baseAmount: '100.00',
        currency: 'USD',
        doctorId: 'doc-1',
        patientId: 'pat-1',
      });

      expect(breakdown.baseAmount).toBe('100.00');
      expect(breakdown.discount).toBe('10.00');
      expect(breakdown.taxableAmount).toBe('90.00');
      expect(breakdown.tax).toBe('9.00');
      expect(breakdown.total).toBe('99.00');
      expect(breakdown.platformFee).toBe('20.00');
      expect(breakdown.providerFee).toBe('2.50');
      expect(breakdown.doctorShare).toBe('77.50');
    });

    it('should calculate breakdown with default configuration and fallback currency', async () => {
      const pricing = new PricingService();
      const breakdown = await pricing.calculateBreakdown({
        baseAmount: '50.00',
        currency: '',
        doctorId: 'doc-2',
        patientId: 'pat-2',
      });

      expect(breakdown.currency).toBe('USD');
      expect(breakdown.discount).toBe('0.00');
      expect(breakdown.baseAmount).toBe('50.00');
    });
  });
});
