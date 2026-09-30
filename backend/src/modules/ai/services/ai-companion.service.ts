import { Inject, Injectable } from '@nestjs/common';
import type { IAIRepository } from '../interfaces/ai-repository.interface.js';
import type { IAIAuditService } from '../interfaces/ai-audit-service.interface.js';
import { AIOrchestratorService } from './ai-orchestrator.service.js';
import { AI_AUDIT_SERVICE, AI_REPOSITORY } from '../providers/provider.tokens.js';
import {
  AIConversationDetailResponseDto,
  AIConversationQueryDto,
  AIConversationResponseDto,
  AIFeedbackResponseDto,
  AIMessageResponseDto,
  CreateAIConversationDto,
  PaginatedAIConversationsResponseDto,
  SendAIMessageDto,
  SendAIMessageResponseDto,
  SubmitAIFeedbackDto,
} from '../dto/index.js';
import type { AIConversationEntity } from '../entities/ai-conversation.entity.js';
import type { AIMessageEntity } from '../entities/ai-message.entity.js';
import type { AIMessageFeedbackEntity } from '../entities/ai-feedback.entity.js';
import { AIConversationStatus } from '../enums/ai-conversation-status.enum.js';
import { AIMessageRole } from '../enums/ai-message-role.enum.js';
import { AIMessageStatus } from '../enums/ai-message-status.enum.js';
import {
  generatePublicConversationId,
  generatePublicMessageId,
} from '../utils/public-ai-id.util.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import { AI_DISCLOSURE_NOTICE } from '../constants/ai.constants.js';

@Injectable()
export class AICompanionService {
  constructor(
    @Inject(AI_REPOSITORY)
    private readonly aiRepo: IAIRepository,
    @Inject(AIOrchestratorService)
    private readonly orchestrator: AIOrchestratorService,
    @Inject(AI_AUDIT_SERVICE)
    private readonly auditService: IAIAuditService,
  ) {}

  public async createConversation(
    userId: string,
    dto: CreateAIConversationDto,
  ): Promise<AIConversationResponseDto> {
    const publicConversationId = generatePublicConversationId();
    const title = dto.title?.trim() || 'Wellness Conversation';

    const entity = await this.aiRepo.createConversation({
      userId,
      publicConversationId,
      title,
    });

    this.auditService.logEvent({
      event: 'AI_CONVERSATION_CREATED',
      actorId: userId,
      role: 'USER',
      resource: `AI_CONVERSATION:${entity.id}`,
      action: 'CREATE_CONVERSATION',
      metadata: {
        publicConversationId: entity.publicConversationId,
        title: entity.title,
      },
    });

    return this.mapConversation(entity);
  }

  public async listConversations(
    userId: string,
    query?: AIConversationQueryDto,
  ): Promise<PaginatedAIConversationsResponseDto> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;

    const { items, total } = await this.aiRepo.findConversationsByUserId(userId, {
      page,
      limit,
      status: query?.status,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: items.map((c) => this.mapConversation(c)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async getConversation(
    conversationIdentifier: string,
    userId: string,
  ): Promise<AIConversationDetailResponseDto> {
    const conversation = await this.resolveConversation(conversationIdentifier);

    if (conversation.userId !== userId) {
      this.auditService.logEvent({
        event: 'AI_ACCESS_DENIED',
        actorId: userId,
        role: 'USER',
        resource: `AI_CONVERSATION:${conversation.id}`,
        action: 'GET_CONVERSATION',
        metadata: {
          reason: 'Access denied: You do not own this conversation',
        },
      });
      throw new ForbiddenError('Access denied: You do not own this conversation');
    }

    const messages = await this.aiRepo.findMessagesByConversationId(conversation.id);

    this.auditService.logEvent({
      event: 'AI_CONVERSATION_ACCESSED',
      actorId: userId,
      role: 'USER',
      resource: `AI_CONVERSATION:${conversation.id}`,
      action: 'VIEW_CONVERSATION',
      metadata: {
        totalMessages: messages.length,
      },
    });

    return {
      conversation: this.mapConversation(conversation),
      messages: messages.map((m) => this.mapMessage(m)),
    };
  }

  public async deleteConversation(
    conversationIdentifier: string,
    userId: string,
  ): Promise<{ success: boolean; id: string }> {
    const conversation = await this.resolveConversation(conversationIdentifier);

    if (conversation.userId !== userId) {
      this.auditService.logEvent({
        event: 'AI_ACCESS_DENIED',
        actorId: userId,
        role: 'USER',
        resource: `AI_CONVERSATION:${conversation.id}`,
        action: 'DELETE_CONVERSATION',
        metadata: {
          reason: 'Access denied: You do not own this conversation',
        },
      });
      throw new ForbiddenError('Access denied: You do not own this conversation');
    }

    await this.aiRepo.updateConversation(conversation.id, {
      status: AIConversationStatus.DELETED,
      archivedAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'AI_CONVERSATION_DELETED',
      actorId: userId,
      role: 'USER',
      resource: `AI_CONVERSATION:${conversation.id}`,
      action: 'DELETE_CONVERSATION',
    });

    return { success: true, id: conversation.id };
  }

  public async sendMessage(
    conversationIdentifier: string,
    userId: string,
    dto: SendAIMessageDto,
    correlationId?: string,
  ): Promise<SendAIMessageResponseDto> {
    const conversation = await this.resolveConversation(conversationIdentifier);

    if (conversation.userId !== userId) {
      this.auditService.logEvent({
        event: 'AI_ACCESS_DENIED',
        actorId: userId,
        role: 'USER',
        resource: `AI_CONVERSATION:${conversation.id}`,
        action: 'SEND_MESSAGE',
        metadata: {
          reason: 'Access denied: You do not own this conversation',
        },
      });
      throw new ForbiddenError('Access denied: You do not own this conversation');
    }

    if (
      conversation.status === AIConversationStatus.DELETED ||
      conversation.status === AIConversationStatus.ARCHIVED
    ) {
      throw new ValidationError('Cannot send messages to an archived or deleted conversation');
    }

    // 1. Persist user message
    const publicUserMessageId = generatePublicMessageId();
    const userMessage = await this.aiRepo.createMessage({
      publicMessageId: publicUserMessageId,
      conversationId: conversation.id,
      role: AIMessageRole.USER,
      content: dto.content,
      status: AIMessageStatus.SENT,
    });

    this.auditService.logEvent({
      event: 'AI_MESSAGE_SENT',
      actorId: userId,
      role: 'USER',
      resource: `AI_MESSAGE:${userMessage.id}`,
      action: 'SEND_USER_MESSAGE',
      metadata: {
        conversationId: conversation.id,
        publicMessageId: publicUserMessageId,
        correlationId,
      },
    });

    // 2. Invoke AI Orchestrator to generate response
    const orchestrationResult = await this.orchestrator.processMessage({
      conversationId: conversation.id,
      userMessageId: userMessage.id,
      userId,
      content: dto.content,
      correlationId,
      options: {
        locale: dto.locale,
      },
    });

    const mappedAssistant = this.mapMessage(orchestrationResult.assistantMessage);
    if (orchestrationResult.citations && orchestrationResult.citations.length > 0) {
      mappedAssistant.citations = orchestrationResult.citations;
    }

    return {
      userMessage: this.mapMessage(userMessage),
      assistantMessage: mappedAssistant,
      medicalContextUsed: orchestrationResult.medicalContextUsed,
      citations: orchestrationResult.citations,
      safetyClassification: orchestrationResult.safetyClassification,
      safetyAction: orchestrationResult.safetyAction,
    };
  }

  public async submitFeedback(
    messageIdentifier: string,
    userId: string,
    dto: SubmitAIFeedbackDto,
  ): Promise<AIFeedbackResponseDto> {
    const message = await this.resolveMessage(messageIdentifier);

    if (message.role !== AIMessageRole.ASSISTANT) {
      throw new ValidationError('Feedback can only be submitted on AI assistant responses');
    }

    // Verify conversation ownership
    const conversation = await this.aiRepo.findConversationById(message.conversationId);
    if (!conversation || conversation.userId !== userId) {
      this.auditService.logEvent({
        event: 'AI_ACCESS_DENIED',
        actorId: userId,
        role: 'USER',
        resource: `AI_MESSAGE:${message.id}`,
        action: 'SUBMIT_FEEDBACK',
        metadata: {
          reason: 'Access denied: You do not own the conversation containing this message',
        },
      });
      throw new ForbiddenError(
        'Access denied: You do not own the conversation containing this message',
      );
    }

    const feedback = await this.aiRepo.createOrUpdateFeedback({
      messageId: message.id,
      userId,
      rating: dto.rating,
      comment: dto.comment,
    });

    this.auditService.logEvent({
      event: 'AI_FEEDBACK_SUBMITTED',
      actorId: userId,
      role: 'USER',
      resource: `AI_MESSAGE_FEEDBACK:${feedback.id}`,
      action: 'SUBMIT_FEEDBACK',
      metadata: {
        messageId: message.id,
        rating: dto.rating,
      },
    });

    return this.mapFeedback(feedback);
  }

  // --- Helpers ---

  private async resolveConversation(identifier: string): Promise<AIConversationEntity> {
    let found = await this.aiRepo.findConversationByPublicId(identifier);
    if (!found) {
      found = await this.aiRepo.findConversationById(identifier);
    }
    if (!found) {
      throw new NotFoundError('Conversation not found');
    }
    return found;
  }

  private async resolveMessage(identifier: string): Promise<AIMessageEntity> {
    let found = await this.aiRepo.findMessageByPublicId(identifier);
    if (!found) {
      found = await this.aiRepo.findMessageById(identifier);
    }
    if (!found) {
      throw new NotFoundError('Message not found');
    }
    return found;
  }

  private mapConversation(entity: AIConversationEntity): AIConversationResponseDto {
    return {
      id: entity.id,
      publicConversationId: entity.publicConversationId,
      userId: entity.userId,
      title: entity.title,
      status: entity.status,
      lastMessageAt: entity.lastMessageAt.toISOString(),
      archivedAt: entity.archivedAt ? entity.archivedAt.toISOString() : null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private mapMessage(entity: AIMessageEntity): AIMessageResponseDto {
    const isAi = entity.role === AIMessageRole.ASSISTANT;
    return {
      id: entity.id,
      publicMessageId: entity.publicMessageId,
      conversationId: entity.conversationId,
      role: entity.role,
      content: entity.content,
      status: entity.status,
      isAiGenerated: isAi,
      generation: entity.generation
        ? {
            provider: entity.generation.provider,
            model: entity.generation.model,
            latencyMs: entity.generation.latencyMs,
            promptTokens: entity.generation.promptTokens,
            completionTokens: entity.generation.completionTokens,
            totalTokens: entity.generation.totalTokens,
            finishReason: entity.generation.finishReason,
            correlationId: entity.generation.correlationId,
            isAiGenerated: entity.generation.isAiGenerated,
            disclosureNotice: entity.generation.disclosureNotice,
          }
        : isAi
          ? {
              provider: 'AI_COMPANION',
              model: 'companion-core',
              latencyMs: 0,
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              finishReason: 'stop',
              correlationId: null,
              isAiGenerated: true,
              disclosureNotice: AI_DISCLOSURE_NOTICE,
            }
          : null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private mapFeedback(entity: AIMessageFeedbackEntity): AIFeedbackResponseDto {
    return {
      id: entity.id,
      messageId: entity.messageId,
      userId: entity.userId,
      rating: entity.rating,
      comment: entity.comment,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
