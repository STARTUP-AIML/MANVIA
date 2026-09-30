import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIMemoryService } from '../../src/modules/ai/memory/ai-memory.service.js';
import { AIMemoryCategory, AIMemoryStatus } from '../../src/modules/ai/memory/memory.enums.js';
import { ForbiddenError, NotFoundError } from '../../src/common/errors/app-error.js';

import type { PrismaService } from '../../src/database/prisma.service.js';
import type { AIAuditService } from '../../src/modules/ai/services/ai-audit.service.js';

interface MockPrismaMemory {
  aIMemory: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

describe('AIMemoryService (Unit)', () => {
  let memoryService: AIMemoryService;
  let mockPrisma: MockPrismaMemory;
  let mockAudit: { logEvent: ReturnType<typeof vi.fn> };

  const USER_A = 'a0000000-0000-0000-0000-000000000001';
  const USER_B = 'b0000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    mockPrisma = {
      aIMemory: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    mockAudit = {
      logEvent: vi.fn(),
    };

    memoryService = new AIMemoryService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AIAuditService,
    );
  });

  describe('Memory Creation', () => {
    it('should create memory for user with valid category and non-sensitive key/value', async () => {
      mockPrisma.aIMemory.findUnique.mockResolvedValue(null);
      mockPrisma.aIMemory.create.mockResolvedValue({
        id: 'mem-db-1',
        publicMemoryId: 'MEM-ABC12345',
        userId: USER_A,
        category: AIMemoryCategory.PREFERENCE,
        key: 'preferred_wake_time',
        value: '07:00 AM',
        confidence: 1.0,
        status: AIMemoryStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await memoryService.createMemory(USER_A, {
        category: AIMemoryCategory.PREFERENCE,
        key: 'preferred_wake_time',
        value: '07:00 AM',
      });

      expect(res.publicMemoryId).toBe('MEM-ABC12345');
      expect(res.category).toBe(AIMemoryCategory.PREFERENCE);
      expect(mockPrisma.aIMemory.create).toHaveBeenCalled();
      expect(mockAudit.logEvent).toHaveBeenCalled();
    });
  });

  describe('Memory Retrieval & Cross-User Isolation', () => {
    it('should return active memories belonging only to the requesting user', async () => {
      mockPrisma.aIMemory.findMany.mockResolvedValue([
        {
          id: 'mem-db-1',
          publicMemoryId: 'MEM-ABC12345',
          userId: USER_A,
          category: AIMemoryCategory.COMMUNICATION_STYLE,
          key: 'tone',
          value: 'concise and gentle',
          confidence: 0.9,
          status: AIMemoryStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const memories = await memoryService.listMemories(USER_A);
      expect(memories).toHaveLength(1);
      expect(mockPrisma.aIMemory.findMany).toHaveBeenCalledWith({
        where: { userId: USER_A, status: AIMemoryStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should inject active memories into prompt context for authorized user', async () => {
      mockPrisma.aIMemory.findMany.mockResolvedValue([
        {
          id: 'mem-db-1',
          publicMemoryId: 'MEM-ABC12345',
          userId: USER_A,
          category: AIMemoryCategory.WELLNESS_GOAL,
          key: 'daily_step_target',
          value: '8000 steps',
          confidence: 1.0,
          status: AIMemoryStatus.ACTIVE,
        },
      ]);

      const context = await memoryService.getActiveMemoriesContext(USER_A);
      expect(context).toContain('User Approved Preference');
      expect(context).toContain('daily_step_target');
      expect(context).toContain('8000 steps');
    });

    it('should return empty context if user has no active memories', async () => {
      mockPrisma.aIMemory.findMany.mockResolvedValue([]);
      const context = await memoryService.getActiveMemoriesContext(USER_A);
      expect(context).toBe('');
    });
  });

  describe('Memory Deletion & Ownership Security', () => {
    it('should allow user to delete their own memory', async () => {
      mockPrisma.aIMemory.findFirst.mockResolvedValue({
        id: 'mem-db-1',
        publicMemoryId: 'MEM-ABC12345',
        userId: USER_A,
        status: AIMemoryStatus.ACTIVE,
      });
      mockPrisma.aIMemory.delete.mockResolvedValue({
        id: 'mem-db-1',
      });

      const res = await memoryService.deleteMemory(USER_A, 'MEM-ABC12345');
      expect(res.success).toBe(true);
      expect(mockPrisma.aIMemory.delete).toHaveBeenCalledWith({
        where: { id: 'mem-db-1' },
      });
      expect(mockAudit.logEvent).toHaveBeenCalled();
    });

    it('should throw ForbiddenError when User B attempts to delete User A memory', async () => {
      mockPrisma.aIMemory.findFirst.mockResolvedValue({
        id: 'mem-db-1',
        publicMemoryId: 'MEM-ABC12345',
        userId: USER_A,
        status: AIMemoryStatus.ACTIVE,
      });

      await expect(memoryService.deleteMemory(USER_B, 'MEM-ABC12345')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('should throw NotFoundError if memory does not exist', async () => {
      mockPrisma.aIMemory.findFirst.mockResolvedValue(null);

      await expect(memoryService.deleteMemory(USER_A, 'MEM-NONEXISTENT')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
