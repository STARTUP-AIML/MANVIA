import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IAIRepository } from '../interfaces/ai-repository.interface.js';
import type { IAIAuditService } from '../interfaces/ai-audit-service.interface.js';
import { AIOrchestratorService } from './ai-orchestrator.service.js';
import { AI_AUDIT_SERVICE, AI_REPOSITORY } from '../providers/provider.tokens.js';
import { ConfigService } from '../../../config/config.service.js';
import {
  AIConversationDetailResponseDto,
  AIConversationQueryDto,
  AIConversationResponseDto,
  AIFeedbackResponseDto,
  AIMessageResponseDto,
  CreateAIConversationDto,
  PaginatedAIConversationsResponseDto,
  ProcessAttachmentDto,
  SendAIMessageDto,
  SendAIMessageResponseDto,
  SubmitAIFeedbackDto,
  TranscribeAudioDto,
  UpdateAIConversationDto,
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
import { AI_DISCLOSURE_NOTICE, GROQ_API_BASE_URL } from '../constants/ai.constants.js';

@Injectable()
export class AICompanionService {
  private readonly logger = new Logger(AICompanionService.name);

  constructor(
    @Inject(AI_REPOSITORY)
    private readonly aiRepo: IAIRepository,
    @Inject(AIOrchestratorService)
    private readonly orchestrator: AIOrchestratorService,
    @Inject(AI_AUDIT_SERVICE)
    private readonly auditService: IAIAuditService,
    @Inject(ConfigService)
    private readonly configService?: ConfigService,
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

  public async updateConversation(
    conversationIdentifier: string,
    userId: string,
    dto: UpdateAIConversationDto,
  ): Promise<AIConversationResponseDto> {
    const conversation = await this.resolveConversation(conversationIdentifier);

    if (conversation.userId !== userId) {
      this.auditService.logEvent({
        event: 'AI_ACCESS_DENIED',
        actorId: userId,
        role: 'USER',
        resource: `AI_CONVERSATION:${conversation.id}`,
        action: 'UPDATE_CONVERSATION',
        metadata: {
          reason: 'Access denied: You do not own this conversation',
        },
      });
      throw new ForbiddenError('Access denied: You do not own this conversation');
    }

    if (conversation.status === AIConversationStatus.DELETED) {
      throw new ValidationError('Cannot update a deleted conversation');
    }

    const trimmedTitle = dto.title?.trim();
    if (!trimmedTitle) {
      throw new ValidationError('Conversation title cannot be empty');
    }

    const updated = await this.aiRepo.updateConversation(conversation.id, {
      title: trimmedTitle,
    });

    this.auditService.logEvent({
      event: 'AI_CONVERSATION_UPDATED',
      actorId: userId,
      role: 'USER',
      resource: `AI_CONVERSATION:${conversation.id}`,
      action: 'RENAME_CONVERSATION',
      metadata: {
        newTitle: updated.title,
      },
    });

    return this.mapConversation(updated);
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

  public async transcribeAudio(
    userId: string,
    dto: TranscribeAudioDto,
  ): Promise<{ text: string; language?: string; duration?: number }> {
    if (!dto.audioBase64 || typeof dto.audioBase64 !== 'string') {
      throw new ValidationError(
        'audioBase64 is required and must be a valid base64-encoded string',
      );
    }

    // Size limit check: max 10MB base64 payload
    if (dto.audioBase64.length > 10 * 1024 * 1024) {
      throw new ValidationError('Audio payload exceeds maximum allowed size of 10MB');
    }

    const cleanBase64 = dto.audioBase64.replace(/^data:audio\/[a-zA-Z0-9-+.]+;base64,/, '');
    const audioBuffer = Buffer.from(cleanBase64, 'base64');
    if (audioBuffer.length === 0) {
      throw new ValidationError('Audio payload is empty or invalid');
    }

    const apiKey = this.configService?.groqApiKey || process.env.GROQ_API_KEY || '';
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

    // Mock fallback for unit/integration tests when real Groq key is absent or in test mode
    if (isTest && (!apiKey || process.env.AI_USE_REAL_PROVIDER !== 'true')) {
      if (dto.audioBase64.includes('SIMULATE_TRANSCRIBE_ERROR')) {
        throw new Error('Simulated transcription service failure');
      }
      return {
        text: 'Hello doctor, I would like to build a healthy morning routine.',
        language: 'en',
        duration: 3.2,
      };
    }

    if (!apiKey) {
      throw new Error('Groq speech-to-text API is not configured on this server');
    }

    try {
      const mimeType = dto.mimeType || 'audio/webm';
      const extension =
        mimeType.includes('mp4') || mimeType.includes('m4a')
          ? 'm4a'
          : mimeType.includes('wav')
            ? 'wav'
            : 'webm';
      const filename = `recording.${extension}`;

      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: mimeType });
      formData.append('file', audioBlob, filename);
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('response_format', 'verbose_json');

      const response = await fetch(`${GROQ_API_BASE_URL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        this.logger.error(
          `Groq Whisper transcription failed: HTTP ${response.status} - ${errBody}`,
        );
        throw new Error(`Speech transcription failed with status ${response.status}`);
      }

      const data = (await response.json()) as {
        text?: string;
        language?: string;
        duration?: number;
      };
      const text = data.text?.trim() || '';

      this.auditService.logEvent({
        event: 'AI_AUDIO_TRANSCRIBED',
        actorId: userId,
        role: 'USER',
        resource: 'AI_TRANSCRIPTION',
        action: 'TRANSCRIBE_AUDIO',
        metadata: {
          audioLengthBytes: audioBuffer.length,
          transcriptLength: text.length,
        },
      });

      const result: { text: string; language?: string; duration?: number } = { text };
      if (data.language) {
        result.language = data.language;
      }
      if (typeof data.duration === 'number') {
        result.duration = data.duration;
      }
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to transcribe audio: ${msg}`);
      throw err;
    }
  }

  public async processAttachment(
    userId: string,
    dto: ProcessAttachmentDto,
  ): Promise<{
    filename: string;
    mimeType: string;
    extractedText: string;
    characterCount: number;
    truncated: boolean;
  }> {
    const rawDto = dto as unknown as Record<string, unknown>;
    const rawFileName =
      dto.fileName || (typeof rawDto.filename === 'string' ? rawDto.filename : '');
    const rawContentBase64 =
      dto.contentBase64 || (typeof rawDto.fileBase64 === 'string' ? rawDto.fileBase64 : '');

    if (!rawFileName || !rawContentBase64) {
      throw new ValidationError('fileName and contentBase64 are required');
    }

    const cleanBase64 = rawContentBase64.replace(/^data:[a-zA-Z0-9-+/.]+;base64,/, '');
    const fileBuffer = Buffer.from(cleanBase64, 'base64');

    if (fileBuffer.length === 0) {
      throw new ValidationError('Uploaded file is empty');
    }

    if (fileBuffer.length > 5 * 1024 * 1024) {
      throw new ValidationError('File size exceeds the 5MB limit');
    }

    const mime = (dto.mimeType || '').toLowerCase();
    const ext = rawFileName.toLowerCase().split('.').pop() || '';

    // Images: user-safe guidance that vision/OCR is not supported
    if (
      mime.startsWith('image/') ||
      ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)
    ) {
      throw new ValidationError(
        'Image analysis (OCR/vision) is not supported by the current AI text model. Please upload documents in TXT, Markdown, CSV, JSON, or PDF format.',
      );
    }

    // Dangerous executable extensions
    if (['exe', 'bat', 'cmd', 'sh', 'bin', 'dll', 'so', 'py', 'js', 'vbs', 'msi'].includes(ext)) {
      throw new ValidationError(
        'Executable and script files cannot be uploaded for safety reasons.',
      );
    }

    let extractedText = '';

    if (
      mime.includes('text/plain') ||
      mime.includes('text/markdown') ||
      mime.includes('text/csv') ||
      mime.includes('application/json') ||
      ['txt', 'md', 'csv', 'json'].includes(ext)
    ) {
      extractedText = fileBuffer.toString('utf-8');
    } else if (mime.includes('pdf') || ext === 'pdf') {
      try {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: fileBuffer });
        const result = await parser.getText();
        extractedText = result.text || '';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Corrupt or unreadable PDF';
        throw new ValidationError(`Failed to parse PDF document: ${msg}`);
      }
    } else {
      throw new ValidationError(
        'Unsupported file format. Supported document formats are .txt, .md, .csv, .json, and .pdf.',
      );
    }

    const MAX_EXTRACT_CHARS = 10000;
    const truncated = extractedText.length > MAX_EXTRACT_CHARS;
    const finalContent = truncated
      ? extractedText.slice(0, MAX_EXTRACT_CHARS) +
        '\n\n[... Note: Remaining document text truncated to respect context limit ...]'
      : extractedText;

    this.auditService.logEvent({
      event: 'AI_ATTACHMENT_PROCESSED',
      actorId: userId,
      role: 'USER',
      resource: 'AI_ATTACHMENT',
      action: 'PROCESS_DOCUMENT',
      metadata: {
        filename: rawFileName,
        fileSize: fileBuffer.length,
        characterCount: finalContent.length,
        truncated,
      },
    });

    return {
      filename: rawFileName,
      mimeType: dto.mimeType,
      extractedText: finalContent,
      characterCount: finalContent.length,
      truncated,
    };
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
