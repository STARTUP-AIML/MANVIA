import type { AIConversationEntity } from '../entities/ai-conversation.entity.js';
import type { AIMessageEntity } from '../entities/ai-message.entity.js';
import type { AIMessageGenerationEntity } from '../entities/ai-generation.entity.js';
import type { AIMessageFeedbackEntity } from '../entities/ai-feedback.entity.js';
import type { AIConversationStatus } from '../enums/ai-conversation-status.enum.js';
import type { AIMessageRole } from '../enums/ai-message-role.enum.js';
import type { AIMessageStatus } from '../enums/ai-message-status.enum.js';
import type { AIFeedbackRating } from '../enums/ai-feedback-rating.enum.js';

export interface CreateConversationInput {
  userId: string;
  publicConversationId: string;
  title: string;
}

export interface ListConversationsOptions {
  page?: number | undefined;
  limit?: number | undefined;
  status?: AIConversationStatus | undefined;
}

export interface UpdateConversationInput {
  title?: string | undefined;
  status?: AIConversationStatus | undefined;
  lastMessageAt?: Date | undefined;
  archivedAt?: Date | null | undefined;
}

export interface CreateMessageInput {
  publicMessageId: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  status?: AIMessageStatus | undefined;
}

export interface ListMessagesOptions {
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface CreateGenerationInput {
  messageId: string;
  provider: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason?: string | null | undefined;
  correlationId?: string | null | undefined;
  isAiGenerated: boolean;
  disclosureNotice: string;
}

export interface CreateOrUpdateFeedbackInput {
  messageId: string;
  userId: string;
  rating: AIFeedbackRating;
  comment?: string | null | undefined;
}

export interface IAIRepository {
  // Conversation
  createConversation(input: CreateConversationInput): Promise<AIConversationEntity>;
  findConversationById(id: string): Promise<AIConversationEntity | null>;
  findConversationByPublicId(publicId: string): Promise<AIConversationEntity | null>;
  findConversationsByUserId(
    userId: string,
    options?: ListConversationsOptions,
  ): Promise<{ items: AIConversationEntity[]; total: number }>;
  updateConversation(id: string, input: UpdateConversationInput): Promise<AIConversationEntity>;
  deleteConversation(id: string): Promise<void>;

  // Message
  createMessage(input: CreateMessageInput): Promise<AIMessageEntity>;
  findMessageById(id: string): Promise<AIMessageEntity | null>;
  findMessageByPublicId(publicId: string): Promise<AIMessageEntity | null>;
  findMessagesByConversationId(
    conversationId: string,
    options?: ListMessagesOptions,
  ): Promise<AIMessageEntity[]>;
  updateMessageStatus(id: string, status: AIMessageStatus): Promise<AIMessageEntity>;

  // Generation
  createGeneration(input: CreateGenerationInput): Promise<AIMessageGenerationEntity>;
  findGenerationByMessageId(messageId: string): Promise<AIMessageGenerationEntity | null>;

  // Feedback
  createOrUpdateFeedback(input: CreateOrUpdateFeedbackInput): Promise<AIMessageFeedbackEntity>;
  findFeedbackByMessageAndUser(
    messageId: string,
    userId: string,
  ): Promise<AIMessageFeedbackEntity | null>;
  findFeedbacksByMessageId(messageId: string): Promise<AIMessageFeedbackEntity[]>;
}
