import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AISafetyService } from '../../src/modules/ai/safety/ai-safety.service.js';
import { MockSafetyClassifier } from '../../src/modules/ai/safety/mock-safety.classifier.js';
import {
  AISafetyClassification,
  AISafetyAction,
} from '../../src/modules/ai/safety/safety.enums.js';
import {
  getEmergencyRouting,
  EMERGENCY_ROUTING_TABLE,
  DEFAULT_EMERGENCY_ROUTING,
} from '../../src/modules/ai/safety/safety-policy.js';

import type { PrismaService } from '../../src/database/prisma.service.js';
import type { AIAuditService } from '../../src/modules/ai/services/ai-audit.service.js';

interface MockPrismaSafety {
  aISafetyEvent: {
    create: ReturnType<typeof vi.fn>;
  };
}

describe('AISafetyService & Policy (Unit)', () => {
  let safetyService: AISafetyService;
  let mockClassifier: MockSafetyClassifier;
  let mockPrisma: MockPrismaSafety;
  let mockAudit: { logEvent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockClassifier = new MockSafetyClassifier();
    mockPrisma = {
      aISafetyEvent: {
        create: vi.fn().mockResolvedValue({
          id: 'sev-uuid-1',
          publicEventId: 'SEV-TEST1',
        }),
      },
    };
    mockAudit = {
      logEvent: vi.fn(),
    };

    safetyService = new AISafetyService(
      mockClassifier,
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AIAuditService,
    );
  });

  describe('Safety Classification Categories', () => {
    it('should classify normal lifestyle queries as SAFE', async () => {
      const result = await safetyService.evaluatePreCheck({
        userId: 'usr-123',
        text: 'What are some tips to drink more water?',
      });
      expect(result.classification).toBe(AISafetyClassification.SAFE);
      expect(result.action).toBe(AISafetyAction.ALLOWED);
      expect(result.escalationRequired).toBe(false);
    });

    it('should classify medical queries as MEDICAL_INFORMATION with disclosure attached', async () => {
      const result = await safetyService.evaluatePreCheck({
        userId: 'usr-123',
        text: 'What are common hypertension symptoms?',
      });
      expect(result.classification).toBe(AISafetyClassification.MEDICAL_INFORMATION);
      expect(result.action).toBe(AISafetyAction.DISCLOSURE_ATTACHED);
      expect(result.escalationRequired).toBe(false);
    });

    it('should classify acute emergency queries as EMERGENCY and require escalation', async () => {
      const result = await safetyService.evaluatePreCheck({
        userId: 'usr-123',
        text: 'I am having sudden crushing chest pain and cant breathe',
      });
      expect(result.classification).toBe(AISafetyClassification.EMERGENCY);
      expect(result.action).toBe(AISafetyAction.EMERGENCY_ESCALATION);
      expect(result.escalationRequired).toBe(true);
      expect(result.advisoryMessage).toContain('emergency');
    });

    it('should classify self-harm and suicide thoughts as SELF_HARM_OR_SUICIDE and require crisis referral', async () => {
      const result = await safetyService.evaluatePreCheck({
        userId: 'usr-123',
        text: 'I feel hopeless and want to end my life',
      });
      expect(result.classification).toBe(AISafetyClassification.SELF_HARM_OR_SUICIDE);
      expect(result.action).toBe(AISafetyAction.CRISIS_REFERRAL);
      expect(result.escalationRequired).toBe(true);
      expect(result.advisoryMessage).toContain('Crisis assistance');
    });

    it('should classify prescription / diagnosis requests as UNSUPPORTED_CLINICAL_REQUEST', async () => {
      const result = await safetyService.evaluatePreCheck({
        userId: 'usr-123',
        text: 'Can you diagnose me and prescribe antibiotics for my ear?',
      });
      expect(result.classification).toBe(AISafetyClassification.UNSUPPORTED_CLINICAL_REQUEST);
      expect(result.action).toBe(AISafetyAction.REFUSAL);
      expect(result.escalationRequired).toBe(false);
      expect(result.advisoryMessage).toContain('not a licensed medical professional');
    });
  });

  describe('Emergency Routing Policy by Locale', () => {
    it('should provide US routing (911 & 988) by default', () => {
      const routing = getEmergencyRouting('en-US');
      expect(routing.emergencyNumber).toBe('911');
      expect(routing.crisisLineNumber).toBe('988');
    });

    it('should provide UK routing (999 & 111) for en-GB', () => {
      const routing = getEmergencyRouting('en-GB');
      expect(routing.emergencyNumber).toBe('999');
      expect(routing.crisisLineNumber).toBe('111');
    });

    it('should provide India routing (112 & 9152987821) for en-IN', () => {
      const routing = getEmergencyRouting('en-IN');
      expect(routing.emergencyNumber).toBe('112');
      expect(routing.crisisLineNumber).toBe('9152987821');
    });

    it('should fallback cleanly to default for unknown locales', () => {
      const routing = getEmergencyRouting('fr-ZZ');
      expect(routing.emergencyNumber).toBe(DEFAULT_EMERGENCY_ROUTING.emergencyNumber);
      expect(routing.emergencyNotice).toContain('not an emergency response service');
    });

    it('should contain all major locales in EMERGENCY_ROUTING_TABLE', () => {
      expect(EMERGENCY_ROUTING_TABLE['en-US']).toBeDefined();
      expect(EMERGENCY_ROUTING_TABLE['en-GB']).toBeDefined();
      expect(EMERGENCY_ROUTING_TABLE['en-CA']).toBeDefined();
      expect(EMERGENCY_ROUTING_TABLE['en-AU']).toBeDefined();
      expect(EMERGENCY_ROUTING_TABLE['en-IN']).toBeDefined();
    });
  });

  describe('Post-Check Safety Evaluation', () => {
    it('should flag generated responses that inappropriately attempt diagnosis', async () => {
      const evaluation = await safetyService.evaluatePostCheck({
        userId: 'usr-123',
        assistantText: 'I diagnose me with acute appendicitis',
      });
      expect(evaluation.classification).toBe(AISafetyClassification.UNSUPPORTED_CLINICAL_REQUEST);
      expect(evaluation.action).toBe(AISafetyAction.REFUSAL);
    });

    it('should approve safe wellness guidance in generated responses', async () => {
      const evaluation = await safetyService.evaluatePostCheck({
        userId: 'usr-123',
        assistantText:
          'Drinking plenty of water and walking 30 minutes daily supports cardiovascular health.',
      });
      expect(evaluation.classification).toBe(AISafetyClassification.SAFE);
      expect(evaluation.action).toBe(AISafetyAction.ALLOWED);
    });
  });

  describe('Audit and Persistence', () => {
    it('should persist safety event when valid UUID is provided for user', async () => {
      const validUuid = 'a0000000-0000-0000-0000-000000000001';
      await safetyService.evaluatePreCheck({
        userId: validUuid,
        conversationId: 'c0000000-0000-0000-0000-000000000001',
        text: 'I want to end my life',
      });

      expect(mockPrisma.aISafetyEvent.create).toHaveBeenCalled();
      expect(mockAudit.logEvent).toHaveBeenCalled();
    });

    it('should omit raw sensitive text in audit logs', async () => {
      await safetyService.evaluatePreCheck({
        userId: 'a0000000-0000-0000-0000-000000000001',
        text: 'I am having sudden chest pain',
      });
      expect(mockAudit.logEvent).toHaveBeenCalled();
      const firstCall = mockAudit.logEvent.mock.calls[0];
      expect(firstCall).toBeDefined();
      const auditCall = firstCall?.[0];
      expect(auditCall).toBeDefined();
      expect(auditCall?.metadata.contentSnippet).toBeUndefined();
      expect(auditCall?.metadata.classification).toBe(AISafetyClassification.EMERGENCY);
    });
  });
});
