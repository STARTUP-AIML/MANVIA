import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { IAIProvider } from '../interfaces/ai-provider.interface.js';
import type { IAIRepository } from '../interfaces/ai-repository.interface.js';
import type { IAIAuditService } from '../interfaces/ai-audit-service.interface.js';
import type { BuildContextOptions } from '../interfaces/ai-context.interface.js';
import type { AIMessageEntity } from '../entities/ai-message.entity.js';
import type { AIMessageGenerationEntity } from '../entities/ai-generation.entity.js';
import { AIContextService } from './ai-context.service.js';
import { AI_AUDIT_SERVICE, AI_PROVIDER, AI_REPOSITORY } from '../providers/provider.tokens.js';
import { AIMessageRole } from '../enums/ai-message-role.enum.js';
import { AIMessageStatus } from '../enums/ai-message-status.enum.js';
import { generatePublicMessageId } from '../utils/public-ai-id.util.js';
import { InternalServerError } from '../../../common/errors/app-error.js';
import { AISafetyService } from '../safety/ai-safety.service.js';
import { MedicalRAGService } from '../rag/medical-rag.service.js';
import { AIMemoryService } from '../memory/ai-memory.service.js';
import { type CitationItem } from '../rag/citation.service.js';
import { NON_CLINICAL_DISCLOSURE_NOTICE } from '../constants/ai.constants.js';

export interface ProcessMessageParams {
  conversationId: string;
  userMessageId: string;
  userId: string;
  content: string;
  correlationId?: string | null | undefined;
  options?: BuildContextOptions | undefined;
}

export interface OrchestrationResult {
  assistantMessage: AIMessageEntity;
  generation: AIMessageGenerationEntity;
  citations?: CitationItem[] | undefined;
  medicalContextUsed?: boolean | undefined;
  safetyClassification?: string | undefined;
  safetyAction?: string | undefined;
}

@Injectable()
export class AIOrchestratorService {
  private readonly logger = new Logger(AIOrchestratorService.name);

  constructor(
    @Inject(AI_PROVIDER)
    private readonly aiProvider: IAIProvider,
    @Inject(AI_REPOSITORY)
    private readonly aiRepo: IAIRepository,
    @Inject(AIContextService)
    private readonly contextService: AIContextService,
    @Inject(AI_AUDIT_SERVICE)
    private readonly auditService: IAIAuditService,
    @Optional()
    private readonly safetyService?: AISafetyService,
    @Optional()
    private readonly ragService?: MedicalRAGService,
    @Optional()
    private readonly memoryService?: AIMemoryService,
  ) {}

  public async processMessage(params: ProcessMessageParams): Promise<OrchestrationResult> {
    const { conversationId, userMessageId, userId, content, correlationId, options } = params;

    // 1. Safety Pre-check
    let safetyResult;
    if (this.safetyService) {
      safetyResult = await this.safetyService.evaluatePreCheck({
        userId,
        conversationId,
        text: content,
        locale: options?.locale,
      });

      // If crisis, acute emergency, or refusal (unsupported prescription/diagnosis), respond with immediate safety guidance
      if (safetyResult.escalationRequired || safetyResult.action === 'REFUSAL') {
        const publicAssistantMessageId = generatePublicMessageId();
        const advisoryText =
          safetyResult.advisoryMessage ??
          'MANVIA AI Companion is an educational assistant and cannot handle emergencies or clinical diagnoses.';

        const assistantMessage = await this.aiRepo.createMessage({
          publicMessageId: publicAssistantMessageId,
          conversationId,
          role: AIMessageRole.ASSISTANT,
          content: advisoryText,
          status: AIMessageStatus.DELIVERED,
        });

        const generation = await this.aiRepo.createGeneration({
          messageId: assistantMessage.id,
          provider: 'SAFETY_INTERVENTION',
          model: 'safety-rule-engine',
          latencyMs: 5,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          finishReason: 'safety_escalation',
          correlationId: correlationId ?? null,
          isAiGenerated: true,
          disclosureNotice: NON_CLINICAL_DISCLOSURE_NOTICE,
        });

        await this.aiRepo.updateConversation(conversationId, {
          lastMessageAt: new Date(),
        });

        return {
          assistantMessage: {
            ...assistantMessage,
            generation,
          },
          generation,
          medicalContextUsed: false,
          citations: [],
          safetyClassification: safetyResult.classification,
          safetyAction: safetyResult.action,
        };
      }
    }

    // 2. Memory Context Assembly
    let additionalInstructions = options?.additionalInstructions ?? '';
    if (this.memoryService) {
      const memoryContext = await this.memoryService.getActiveMemoriesContext(userId);
      if (memoryContext) {
        additionalInstructions = additionalInstructions
          ? `${additionalInstructions}\n${memoryContext}`
          : memoryContext;
      }
    }

    // 3. Medical RAG Retrieval (when appropriate)
    let ragResult;
    if (this.ragService) {
      ragResult = await this.ragService.retrieveEvidence(content);
      if (ragResult.medicalContextUsed && ragResult.evidenceContext) {
        additionalInstructions = additionalInstructions
          ? `${additionalInstructions}\n${ragResult.evidenceContext}`
          : ragResult.evidenceContext;
      }
    }

    // 4. Build bounded, isolated context
    const context = await this.contextService.buildContext(conversationId, userId, content, {
      ...options,
      additionalInstructions: additionalInstructions || undefined,
    });

    // 5. Call AI Provider abstraction
    let providerResponse;
    try {
      providerResponse = await this.aiProvider.generateResponse({
        systemInstruction: context.systemInstruction,
        messages: context.messages,
        userContext: context.userContext,
        correlationId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown provider error';
      this.logger.error(
        `[AI Orchestrator] Provider execution failed for conversation=${conversationId}, user=${userId}: ${errorMessage}`,
      );

      this.auditService.logEvent({
        event: 'AI_RESPONSE_FAILED',
        actorId: userId,
        role: 'USER',
        resource: `AI_CONVERSATION:${conversationId}`,
        action: 'GENERATE_AI_RESPONSE',
        metadata: {
          conversationId,
          userMessageId,
          correlationId,
          error: 'Provider call failed',
        },
      });

      throw new InternalServerError(
        'AI service is temporarily unavailable. Please try again shortly.',
      );
    }

    // 6. Safety Post-check
    if (this.safetyService) {
      await this.safetyService.evaluatePostCheck({
        userId,
        conversationId,
        assistantText: providerResponse.content,
        locale: options?.locale,
      });
    }

    // 7. Persist assistant message
    const publicAssistantMessageId = generatePublicMessageId();
    const assistantMessage = await this.aiRepo.createMessage({
      publicMessageId: publicAssistantMessageId,
      conversationId,
      role: AIMessageRole.ASSISTANT,
      content: providerResponse.content,
      status: AIMessageStatus.DELIVERED,
    });

    // 8. Persist generation metadata
    const generation = await this.aiRepo.createGeneration({
      messageId: assistantMessage.id,
      provider: providerResponse.provider,
      model: providerResponse.model,
      latencyMs: providerResponse.latencyMs,
      promptTokens: providerResponse.usage.promptTokens,
      completionTokens: providerResponse.usage.completionTokens,
      totalTokens: providerResponse.usage.totalTokens,
      finishReason: providerResponse.finishReason,
      correlationId: correlationId ?? null,
      isAiGenerated: providerResponse.isAiGenerated,
      disclosureNotice: providerResponse.disclosureNotice,
    });

    // 9. Update conversation timestamp
    await this.aiRepo.updateConversation(conversationId, {
      lastMessageAt: new Date(),
    });

    // 10. Audit event
    this.auditService.logEvent({
      event: 'AI_RESPONSE_GENERATED',
      actorId: userId,
      role: 'USER',
      resource: `AI_MESSAGE:${assistantMessage.id}`,
      action: 'GENERATE_AI_RESPONSE',
      metadata: {
        conversationId,
        publicMessageId: publicAssistantMessageId,
        provider: providerResponse.provider,
        model: providerResponse.model,
        latencyMs: providerResponse.latencyMs,
        totalTokens: providerResponse.usage.totalTokens,
        correlationId,
        medicalContextUsed: ragResult?.medicalContextUsed ?? false,
      },
    });

    return {
      assistantMessage: {
        ...assistantMessage,
        generation,
      },
      generation,
      citations: ragResult?.citations ?? [],
      medicalContextUsed: ragResult?.medicalContextUsed ?? false,
      safetyClassification: safetyResult?.classification,
      safetyAction: safetyResult?.action,
    };
  }
}
