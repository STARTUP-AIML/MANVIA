import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { SAFETY_CLASSIFIER } from '../providers/provider.tokens.js';
import {
  type SafetyClassifier,
  type SafetyClassificationResult,
} from './safety-classifier.interface.js';
import { AIAuditService } from '../services/ai-audit.service.js';
import { generatePublicSafetyEventId } from '../utils/public-ai-id.util.js';

@Injectable()
export class AISafetyService {
  constructor(
    @Inject(SAFETY_CLASSIFIER)
    private readonly classifier: SafetyClassifier,
    private readonly prisma: PrismaService,
    private readonly auditService: AIAuditService,
  ) {}

  public async evaluatePreCheck(params: {
    userId: string;
    conversationId?: string | undefined;
    text: string;
    locale?: string | undefined;
  }): Promise<SafetyClassificationResult> {
    const locale = params.locale ?? 'en-US';
    const result = await this.classifier.classify(params.text, locale);

    // If classified as emergency, crisis, refusal or medical, persist the safety event
    if (result.classification !== 'SAFE') {
      const publicEventId = generatePublicSafetyEventId();
      const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        params.userId,
      );
      if (isUserUuid) {
        let validConvId: string | null = null;
        if (params.conversationId) {
          const isConvUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            params.conversationId,
          );
          try {
            if (isConvUuid) {
              const conv = await this.prisma.aIConversation.findUnique({
                where: { id: params.conversationId },
              });
              if (conv) validConvId = conv.id;
            } else {
              const conv = await this.prisma.aIConversation.findUnique({
                where: { publicConversationId: params.conversationId },
              });
              if (conv) validConvId = conv.id;
            }
          } catch {
            validConvId = null;
          }
        }

        try {
          await this.prisma.aISafetyEvent.create({
            data: {
              publicEventId,
              userId: params.userId,
              conversationId: validConvId,
              classification: result.classification,
              actionTaken: result.action,
              confidenceScore: result.confidence,
              matchedRules: result.matchedRules,
              locale: result.locale,
              metadata: {
                escalationRequired: result.escalationRequired,
              },
            },
          });
        } catch {
          // Telemetry event logging failure should not disrupt response flow
        }
      }

      this.auditService.logEvent({
        event: 'SAFETY_PRE_CHECK_TRIGGERED',
        actorId: params.userId,
        role: 'USER',
        resource: `AI_SAFETY_EVENT:${publicEventId}`,
        action: 'SAFETY_PRE_CHECK_TRIGGERED',
        metadata: {
          classification: result.classification,
          action: result.action,
          escalationRequired: result.escalationRequired,
          locale: result.locale,
        },
      });
    }

    return result;
  }

  public async evaluatePostCheck(params: {
    userId: string;
    conversationId?: string | undefined;
    assistantText: string;
    locale?: string | undefined;
  }): Promise<SafetyClassificationResult> {
    const locale = params.locale ?? 'en-US';
    const result = await this.classifier.classify(params.assistantText, locale);
    return result;
  }
}
