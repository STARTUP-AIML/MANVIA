import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { NotFoundError, ForbiddenError } from '../../../common/errors/app-error.js';
import { generatePublicMemoryId } from '../utils/public-ai-id.util.js';
import { CreateAIMemoryDto } from './dto/create-memory.dto.js';
import { AIMemoryResponseDto } from './dto/ai-memory-response.dto.js';
import { AIMemoryCategory, AIMemoryStatus } from './memory.enums.js';
import { AIAuditService } from '../services/ai-audit.service.js';

@Injectable()
export class AIMemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AIAuditService,
  ) {}

  public async createMemory(userId: string, dto: CreateAIMemoryDto): Promise<AIMemoryResponseDto> {
    const existing = await this.prisma.aIMemory.findUnique({
      where: {
        userId_category_key: {
          userId,
          category: dto.category,
          key: dto.key,
        },
      },
    });

    let memoryRecord;
    if (existing) {
      memoryRecord = await this.prisma.aIMemory.update({
        where: { id: existing.id },
        data: {
          value: dto.value,
          status: AIMemoryStatus.ACTIVE,
          updatedAt: new Date(),
        },
      });
    } else {
      const publicMemoryId = generatePublicMemoryId();
      memoryRecord = await this.prisma.aIMemory.create({
        data: {
          publicMemoryId,
          userId,
          category: dto.category,
          key: dto.key,
          value: dto.value,
          status: AIMemoryStatus.ACTIVE,
          isUserApproved: true,
        },
      });
    }

    this.auditService.logEvent({
      event: 'AI_MEMORY_CREATED',
      actorId: userId,
      role: 'USER',
      action: 'AI_MEMORY_CREATED',
      resource: `AI_MEMORY:${memoryRecord.publicMemoryId}`,
      metadata: {
        category: memoryRecord.category,
        key: memoryRecord.key,
      },
    });

    return this.mapToDto(memoryRecord);
  }

  public async listMemories(userId: string): Promise<AIMemoryResponseDto[]> {
    const records = await this.prisma.aIMemory.findMany({
      where: {
        userId,
        status: AIMemoryStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToDto(r));
  }

  public async deleteMemory(
    userId: string,
    memoryIdentifier: string,
  ): Promise<{ success: boolean; id: string }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      memoryIdentifier,
    );
    const memory = await this.prisma.aIMemory.findFirst({
      where: isUuid
        ? { OR: [{ id: memoryIdentifier }, { publicMemoryId: memoryIdentifier }] }
        : { publicMemoryId: memoryIdentifier },
    });

    if (!memory) {
      throw new NotFoundError('Memory not found');
    }

    if (memory.userId !== userId) {
      this.auditService.logEvent({
        event: 'AI_ACCESS_DENIED',
        actorId: userId,
        role: 'USER',
        action: 'AI_ACCESS_DENIED',
        resource: `AI_MEMORY:${memory.publicMemoryId}`,
        metadata: { reason: 'Access denied: You do not own this memory' },
      });
      throw new ForbiddenError('Access denied: You do not own this memory');
    }

    await this.prisma.aIMemory.delete({
      where: { id: memory.id },
    });

    this.auditService.logEvent({
      event: 'AI_MEMORY_DELETED',
      actorId: userId,
      role: 'USER',
      action: 'AI_MEMORY_DELETED',
      resource: `AI_MEMORY:${memory.publicMemoryId}`,
    });

    return { success: true, id: memory.publicMemoryId };
  }

  public async getActiveMemoriesContext(userId: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isUuid) return '';

    const records = await this.prisma.aIMemory.findMany({
      where: {
        userId,
        status: AIMemoryStatus.ACTIVE,
      },
      take: 10,
    });

    if (records.length === 0) return '';

    return records.map((r) => `[User Approved Preference] ${r.key}: "${r.value}"`).join('\n');
  }

  private mapToDto(record: {
    id: string;
    publicMemoryId: string;
    category: AIMemoryCategory;
    key: string;
    value: string;
    confidence: number;
    status: AIMemoryStatus;
    createdAt: Date;
    updatedAt: Date;
  }): AIMemoryResponseDto {
    return {
      id: record.id,
      publicMemoryId: record.publicMemoryId,
      category: record.category,
      key: record.key,
      value: record.value,
      confidence: record.confidence,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
