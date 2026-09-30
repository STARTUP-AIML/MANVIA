import { Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
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
import { AIMessageRole } from '../enums/ai-message-role.enum.js';
import { AIMessageStatus } from '../enums/ai-message-status.enum.js';
import { AIFeedbackRating } from '../enums/ai-feedback-rating.enum.js';

interface RawConversation {
  id: string;
  publicConversationId: string;
  userId: string;
  title: string;
  status: AIConversationStatus | string;
  lastMessageAt: Date | string;
  archivedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface RawGeneration {
  id: string;
  messageId: string;
  provider: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string | null;
  correlationId: string | null;
  isAiGenerated: boolean;
  disclosureNotice: string;
  createdAt: Date | string;
}

interface RawFeedback {
  id: string;
  messageId: string;
  userId: string;
  rating: AIFeedbackRating | string;
  comment: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface RawMessage {
  id: string;
  publicMessageId: string;
  conversationId: string;
  role: AIMessageRole | string;
  content: string;
  status: AIMessageStatus | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  generation?: RawGeneration | null;
  feedbacks?: RawFeedback[];
}

@Injectable()
export class PrismaAIRepository implements IAIRepository {
  constructor(
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
  ) {}

  private getClient(): PrismaService {
    if (!this.prisma) {
      throw new Error(
        'PrismaService is not initialized in PrismaAIRepository. Provide a valid Prisma client or use InMemoryAIRepository.',
      );
    }
    return this.prisma;
  }

  private mapConversation(raw: RawConversation): AIConversationEntity {
    return {
      id: raw.id,
      publicConversationId: raw.publicConversationId,
      userId: raw.userId,
      title: raw.title,
      status: raw.status as AIConversationStatus,
      lastMessageAt: new Date(raw.lastMessageAt),
      archivedAt: raw.archivedAt ? new Date(raw.archivedAt) : null,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  private mapGeneration(raw: RawGeneration): AIMessageGenerationEntity {
    return {
      id: raw.id,
      messageId: raw.messageId,
      provider: raw.provider,
      model: raw.model,
      latencyMs: raw.latencyMs,
      promptTokens: raw.promptTokens,
      completionTokens: raw.completionTokens,
      totalTokens: raw.totalTokens,
      finishReason: raw.finishReason,
      correlationId: raw.correlationId,
      isAiGenerated: raw.isAiGenerated,
      disclosureNotice: raw.disclosureNotice,
      createdAt: new Date(raw.createdAt),
    };
  }

  private mapFeedback(raw: RawFeedback): AIMessageFeedbackEntity {
    return {
      id: raw.id,
      messageId: raw.messageId,
      userId: raw.userId,
      rating: raw.rating as AIFeedbackRating,
      comment: raw.comment,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  private mapMessage(raw: RawMessage): AIMessageEntity {
    return {
      id: raw.id,
      publicMessageId: raw.publicMessageId,
      conversationId: raw.conversationId,
      role: raw.role as AIMessageRole,
      content: raw.content,
      status: raw.status as AIMessageStatus,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
      generation: raw.generation ? this.mapGeneration(raw.generation) : null,
      feedbacks: raw.feedbacks ? raw.feedbacks.map((f) => this.mapFeedback(f)) : [],
    };
  }

  // --- Conversations ---

  public async createConversation(input: CreateConversationInput): Promise<AIConversationEntity> {
    const client = this.getClient();
    const created = await client.aIConversation.create({
      data: {
        publicConversationId: input.publicConversationId,
        userId: input.userId,
        title: input.title,
        status: AIConversationStatus.ACTIVE,
      },
    });
    return this.mapConversation(created);
  }

  public async findConversationById(id: string): Promise<AIConversationEntity | null> {
    const client = this.getClient();
    const found = await client.aIConversation.findUnique({
      where: { id },
    });
    return found ? this.mapConversation(found) : null;
  }

  public async findConversationByPublicId(publicId: string): Promise<AIConversationEntity | null> {
    const client = this.getClient();
    const found = await client.aIConversation.findUnique({
      where: { publicConversationId: publicId },
    });
    return found ? this.mapConversation(found) : null;
  }

  public async findConversationsByUserId(
    userId: string,
    options?: ListConversationsOptions,
  ): Promise<{ items: AIConversationEntity[]; total: number }> {
    const client = this.getClient();
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: {
      userId: string;
      status?: AIConversationStatus | { not: AIConversationStatus };
    } = {
      userId,
    };

    if (options?.status) {
      where.status = options.status;
    } else {
      where.status = { not: AIConversationStatus.DELETED };
    }

    const [items, total] = await Promise.all([
      client.aIConversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
      }),
      client.aIConversation.count({ where }),
    ]);

    return {
      items: items.map((c: RawConversation) => this.mapConversation(c)),
      total,
    };
  }

  public async updateConversation(
    id: string,
    input: UpdateConversationInput,
  ): Promise<AIConversationEntity> {
    const client = this.getClient();
    const updated = await client.aIConversation.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.lastMessageAt !== undefined ? { lastMessageAt: input.lastMessageAt } : {}),
        ...(input.archivedAt !== undefined ? { archivedAt: input.archivedAt } : {}),
      },
    });
    return this.mapConversation(updated);
  }

  public async deleteConversation(id: string): Promise<void> {
    const client = this.getClient();
    await client.aIConversation.delete({
      where: { id },
    });
  }

  // --- Messages ---

  public async createMessage(input: CreateMessageInput): Promise<AIMessageEntity> {
    const client = this.getClient();
    const created = await client.aIMessage.create({
      data: {
        publicMessageId: input.publicMessageId,
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        status: input.status ?? AIMessageStatus.SENT,
      },
      include: {
        generation: true,
        feedbacks: true,
      },
    });
    return this.mapMessage(created);
  }

  public async findMessageById(id: string): Promise<AIMessageEntity | null> {
    const client = this.getClient();
    const found = await client.aIMessage.findUnique({
      where: { id },
      include: {
        generation: true,
        feedbacks: true,
      },
    });
    return found ? this.mapMessage(found) : null;
  }

  public async findMessageByPublicId(publicId: string): Promise<AIMessageEntity | null> {
    const client = this.getClient();
    const found = await client.aIMessage.findUnique({
      where: { publicMessageId: publicId },
      include: {
        generation: true,
        feedbacks: true,
      },
    });
    return found ? this.mapMessage(found) : null;
  }

  public async findMessagesByConversationId(
    conversationId: string,
    options?: ListMessagesOptions,
  ): Promise<AIMessageEntity[]> {
    const client = this.getClient();
    const limit = options?.limit ?? 50;
    const skip = options?.offset ?? 0;

    const messages = await client.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
      include: {
        generation: true,
        feedbacks: true,
      },
    });

    return messages.map((m: RawMessage) => this.mapMessage(m));
  }

  public async updateMessageStatus(id: string, status: AIMessageStatus): Promise<AIMessageEntity> {
    const client = this.getClient();
    const updated = await client.aIMessage.update({
      where: { id },
      data: { status },
      include: {
        generation: true,
        feedbacks: true,
      },
    });
    return this.mapMessage(updated);
  }

  // --- Generation ---

  public async createGeneration(input: CreateGenerationInput): Promise<AIMessageGenerationEntity> {
    const client = this.getClient();
    const created = await client.aIMessageGeneration.create({
      data: {
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
      },
    });
    return this.mapGeneration(created);
  }

  public async findGenerationByMessageId(
    messageId: string,
  ): Promise<AIMessageGenerationEntity | null> {
    const client = this.getClient();
    const found = await client.aIMessageGeneration.findUnique({
      where: { messageId },
    });
    return found ? this.mapGeneration(found) : null;
  }

  // --- Feedback ---

  public async createOrUpdateFeedback(
    input: CreateOrUpdateFeedbackInput,
  ): Promise<AIMessageFeedbackEntity> {
    const client = this.getClient();
    const updated = await client.aIMessageFeedback.upsert({
      where: {
        messageId_userId: {
          messageId: input.messageId,
          userId: input.userId,
        },
      },
      update: {
        rating: input.rating,
        ...(input.comment !== undefined ? { comment: input.comment } : {}),
      },
      create: {
        messageId: input.messageId,
        userId: input.userId,
        rating: input.rating,
        comment: input.comment ?? null,
      },
    });
    return this.mapFeedback(updated);
  }

  public async findFeedbackByMessageAndUser(
    messageId: string,
    userId: string,
  ): Promise<AIMessageFeedbackEntity | null> {
    const client = this.getClient();
    const found = await client.aIMessageFeedback.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });
    return found ? this.mapFeedback(found) : null;
  }

  public async findFeedbacksByMessageId(messageId: string): Promise<AIMessageFeedbackEntity[]> {
    const client = this.getClient();
    const feedbacks = await client.aIMessageFeedback.findMany({
      where: { messageId },
    });
    return feedbacks.map((f: RawFeedback) => this.mapFeedback(f));
  }
}
