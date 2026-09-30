import { Injectable } from '@nestjs/common';
import type {
  CreateConversationInput,
  CreateGenerationInput,
  CreateMessageInput,
  CreateOrUpdateFeedbackInput,
  IAIRepository,
  ListConversationsOptions,
  ListMessagesOptions,
  UpdateConversationInput,
} from '../interfaces/ai-repository.interface.js';
import type { AIConversationEntity } from '../entities/ai-conversation.entity.js';
import type { AIMessageEntity } from '../entities/ai-message.entity.js';
import type { AIMessageGenerationEntity } from '../entities/ai-generation.entity.js';
import type { AIMessageFeedbackEntity } from '../entities/ai-feedback.entity.js';
import { AIConversationStatus } from '../enums/ai-conversation-status.enum.js';
import { AIMessageStatus } from '../enums/ai-message-status.enum.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class InMemoryAIRepository implements IAIRepository {
  private readonly conversations: Map<string, AIConversationEntity> = new Map();
  private readonly messages: Map<string, AIMessageEntity> = new Map();
  private readonly generations: Map<string, AIMessageGenerationEntity> = new Map();
  private readonly feedbacks: Map<string, AIMessageFeedbackEntity> = new Map();

  // Reset helper for tests
  public clear(): void {
    this.conversations.clear();
    this.messages.clear();
    this.generations.clear();
    this.feedbacks.clear();
  }

  // --- Conversations ---

  public async createConversation(input: CreateConversationInput): Promise<AIConversationEntity> {
    const now = new Date();
    const entity: AIConversationEntity = {
      id: randomUUID(),
      publicConversationId: input.publicConversationId,
      userId: input.userId,
      title: input.title,
      status: AIConversationStatus.ACTIVE,
      lastMessageAt: now,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(entity.id, { ...entity });
    return { ...entity };
  }

  public async findConversationById(id: string): Promise<AIConversationEntity | null> {
    const found = this.conversations.get(id);
    return found ? { ...found } : null;
  }

  public async findConversationByPublicId(publicId: string): Promise<AIConversationEntity | null> {
    for (const c of this.conversations.values()) {
      if (c.publicConversationId === publicId) {
        return { ...c };
      }
    }
    return null;
  }

  public async findConversationsByUserId(
    userId: string,
    options?: ListConversationsOptions,
  ): Promise<{ items: AIConversationEntity[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const status = options?.status;

    let all = Array.from(this.conversations.values()).filter((c) => c.userId === userId);

    if (status) {
      all = all.filter((c) => c.status === status);
    } else {
      // Exclude soft-deleted by default
      all = all.filter((c) => c.status !== AIConversationStatus.DELETED);
    }

    // Sort descending by lastMessageAt
    all.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

    const total = all.length;
    const offset = (page - 1) * limit;
    const items = all.slice(offset, offset + limit).map((c) => ({ ...c }));

    return { items, total };
  }

  public async updateConversation(
    id: string,
    input: UpdateConversationInput,
  ): Promise<AIConversationEntity> {
    const existing = this.conversations.get(id);
    if (!existing) {
      throw new Error(`Conversation not found: ${id}`);
    }

    const updated: AIConversationEntity = {
      ...existing,
      title: input.title ?? existing.title,
      status: input.status ?? existing.status,
      lastMessageAt: input.lastMessageAt ?? existing.lastMessageAt,
      archivedAt: input.archivedAt !== undefined ? input.archivedAt : existing.archivedAt,
      updatedAt: new Date(),
    };

    this.conversations.set(id, { ...updated });
    return { ...updated };
  }

  public async deleteConversation(id: string): Promise<void> {
    this.conversations.delete(id);
    // Also remove associated messages
    for (const [msgId, msg] of this.messages.entries()) {
      if (msg.conversationId === id) {
        this.messages.delete(msgId);
        this.generations.delete(msgId);
      }
    }
  }

  // --- Messages ---

  public async createMessage(input: CreateMessageInput): Promise<AIMessageEntity> {
    const now = new Date();
    const entity: AIMessageEntity = {
      id: randomUUID(),
      publicMessageId: input.publicMessageId,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      status: input.status ?? AIMessageStatus.SENT,
      createdAt: now,
      updatedAt: now,
    };
    this.messages.set(entity.id, { ...entity });
    return { ...entity };
  }

  public async findMessageById(id: string): Promise<AIMessageEntity | null> {
    const found = this.messages.get(id);
    if (!found) return null;

    const generation = this.generations.get(id) ?? null;
    const feedbacks = Array.from(this.feedbacks.values()).filter((f) => f.messageId === id);

    return {
      ...found,
      generation: generation ? { ...generation } : null,
      feedbacks: feedbacks.map((f) => ({ ...f })),
    };
  }

  public async findMessageByPublicId(publicId: string): Promise<AIMessageEntity | null> {
    for (const m of this.messages.values()) {
      if (m.publicMessageId === publicId) {
        return this.findMessageById(m.id);
      }
    }
    return null;
  }

  public async findMessagesByConversationId(
    conversationId: string,
    options?: ListMessagesOptions,
  ): Promise<AIMessageEntity[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const all = Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const slice = all.slice(offset, offset + limit);

    return slice.map((m) => {
      const generation = this.generations.get(m.id) ?? null;
      const feedbacks = Array.from(this.feedbacks.values()).filter((f) => f.messageId === m.id);
      return {
        ...m,
        generation: generation ? { ...generation } : null,
        feedbacks: feedbacks.map((f) => ({ ...f })),
      };
    });
  }

  public async updateMessageStatus(id: string, status: AIMessageStatus): Promise<AIMessageEntity> {
    const existing = this.messages.get(id);
    if (!existing) {
      throw new Error(`Message not found: ${id}`);
    }

    const updated: AIMessageEntity = {
      ...existing,
      status,
      updatedAt: new Date(),
    };

    this.messages.set(id, { ...updated });
    return { ...updated };
  }

  // --- Generation ---

  public async createGeneration(input: CreateGenerationInput): Promise<AIMessageGenerationEntity> {
    const entity: AIMessageGenerationEntity = {
      id: randomUUID(),
      messageId: input.messageId,
      provider: input.provider,
      model: input.model,
      latencyMs: input.latencyMs,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens: input.totalTokens,
      finishReason: input.finishReason ?? null,
      correlationId: input.correlationId ?? null,
      isAiGenerated: input.isAiGenerated,
      disclosureNotice: input.disclosureNotice,
      createdAt: new Date(),
    };
    this.generations.set(input.messageId, { ...entity });
    return { ...entity };
  }

  public async findGenerationByMessageId(
    messageId: string,
  ): Promise<AIMessageGenerationEntity | null> {
    const found = this.generations.get(messageId);
    return found ? { ...found } : null;
  }

  // --- Feedback ---

  public async createOrUpdateFeedback(
    input: CreateOrUpdateFeedbackInput,
  ): Promise<AIMessageFeedbackEntity> {
    const key = `${input.messageId}:${input.userId}`;
    const existing = this.feedbacks.get(key);
    const now = new Date();

    if (existing) {
      const updated: AIMessageFeedbackEntity = {
        ...existing,
        rating: input.rating,
        comment: input.comment !== undefined ? input.comment : existing.comment,
        updatedAt: now,
      };
      this.feedbacks.set(key, { ...updated });
      return { ...updated };
    }

    const created: AIMessageFeedbackEntity = {
      id: randomUUID(),
      messageId: input.messageId,
      userId: input.userId,
      rating: input.rating,
      comment: input.comment ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.feedbacks.set(key, { ...created });
    return { ...created };
  }

  public async findFeedbackByMessageAndUser(
    messageId: string,
    userId: string,
  ): Promise<AIMessageFeedbackEntity | null> {
    const key = `${messageId}:${userId}`;
    const found = this.feedbacks.get(key);
    return found ? { ...found } : null;
  }

  public async findFeedbacksByMessageId(messageId: string): Promise<AIMessageFeedbackEntity[]> {
    return Array.from(this.feedbacks.values())
      .filter((f) => f.messageId === messageId)
      .map((f) => ({ ...f }));
  }
}
