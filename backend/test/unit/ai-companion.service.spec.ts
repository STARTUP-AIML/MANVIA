import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AICompanionService } from '../../src/modules/ai/services/ai-companion.service.js';
import { AIOrchestratorService } from '../../src/modules/ai/services/ai-orchestrator.service.js';
import { AIContextService } from '../../src/modules/ai/services/ai-context.service.js';
import { MockAIProvider } from '../../src/modules/ai/providers/mock-ai.provider.js';
import { InMemoryAIRepository } from '../../src/modules/ai/repositories/in-memory-ai.repository.js';
import { AIAuditService } from '../../src/modules/ai/services/ai-audit.service.js';
import { AIFeedbackRating } from '../../src/modules/ai/enums/ai-feedback-rating.enum.js';
import { AIMessageRole } from '../../src/modules/ai/enums/ai-message-role.enum.js';
import { AIConversationStatus } from '../../src/modules/ai/enums/ai-conversation-status.enum.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../src/common/errors/app-error.js';

describe('AICompanionService (Unit)', () => {
  let repository: InMemoryAIRepository;
  let companionService: AICompanionService;
  let auditService: AIAuditService;

  beforeEach(() => {
    repository = new InMemoryAIRepository();
    const contextService = new AIContextService(repository);
    const provider = new MockAIProvider();
    auditService = new AIAuditService();
    const orchestrator = new AIOrchestratorService(
      provider,
      repository,
      contextService,
      auditService,
    );
    companionService = new AICompanionService(repository, orchestrator, auditService);
  });

  describe('createConversation', () => {
    it('should create conversation with public ID and default title if not provided', async () => {
      const conv = await companionService.createConversation('usr-alice', {});

      expect(conv.id).toBeDefined();
      expect(conv.publicConversationId).toMatch(/^AIC-[2-9A-Z]{8}$/);
      expect(conv.title).toBe('Wellness Conversation');
      expect(conv.userId).toBe('usr-alice');
      expect(conv.status).toBe(AIConversationStatus.ACTIVE);
    });

    it('should create conversation with provided custom title', async () => {
      const conv = await companionService.createConversation('usr-alice', {
        title: 'Nutritional Lifestyle Plan',
      });

      expect(conv.title).toBe('Nutritional Lifestyle Plan');
    });
  });

  describe('listConversations', () => {
    it('should return paginated list of conversations for the user', async () => {
      await companionService.createConversation('usr-alice', { title: 'Conv 1' });
      await companionService.createConversation('usr-alice', { title: 'Conv 2' });
      await companionService.createConversation('usr-bob', { title: 'Bob Conv' });

      const res = await companionService.listConversations('usr-alice', { page: 1, limit: 10 });

      expect(res.total).toBe(2);
      expect(res.data).toHaveLength(2);
      expect(res.data.every((c) => c.userId === 'usr-alice')).toBe(true);
    });
  });

  describe('getConversation', () => {
    it('should retrieve conversation by UUID or public ID for the owner', async () => {
      const created = await companionService.createConversation('usr-alice', { title: 'My Chat' });

      const byUuid = await companionService.getConversation(created.id, 'usr-alice');
      expect(byUuid.conversation.id).toBe(created.id);

      const byPublicId = await companionService.getConversation(
        created.publicConversationId,
        'usr-alice',
      );
      expect(byPublicId.conversation.publicConversationId).toBe(created.publicConversationId);
    });

    it('should throw NotFoundError if conversation does not exist', async () => {
      await expect(
        companionService.getConversation('non-existent-id', 'usr-alice'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user does not own the conversation', async () => {
      const created = await companionService.createConversation('usr-alice', {
        title: 'Alice Secret',
      });

      await expect(companionService.getConversation(created.id, 'usr-eve')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('deleteConversation', () => {
    it('should mark conversation as DELETED when deleted by owner', async () => {
      const created = await companionService.createConversation('usr-alice', {
        title: 'To Delete',
      });

      const res = await companionService.deleteConversation(created.id, 'usr-alice');
      expect(res.success).toBe(true);

      const retrieved = await repository.findConversationById(created.id);
      expect(retrieved?.status).toBe(AIConversationStatus.DELETED);
    });

    it('should throw ForbiddenError if another user attempts deletion', async () => {
      const created = await companionService.createConversation('usr-alice', {
        title: 'To Protect',
      });

      await expect(companionService.deleteConversation(created.id, 'usr-intruder')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('sendMessage', () => {
    it('should persist user message and generate assistant response with disclosure and tokens', async () => {
      const conv = await companionService.createConversation('usr-alice', { title: 'Chat' });

      const pair = await companionService.sendMessage(conv.id, 'usr-alice', {
        content: 'What is a good evening wind-down routine?',
      });

      expect(pair.userMessage).toBeDefined();
      expect(pair.userMessage.role).toBe(AIMessageRole.USER);
      expect(pair.userMessage.content).toBe('What is a good evening wind-down routine?');
      expect(pair.userMessage.isAiGenerated).toBe(false);

      expect(pair.assistantMessage).toBeDefined();
      expect(pair.assistantMessage.role).toBe(AIMessageRole.ASSISTANT);
      expect(pair.assistantMessage.isAiGenerated).toBe(true);
      expect(pair.assistantMessage.generation?.disclosureNotice).toBeDefined();
      expect(pair.assistantMessage.generation?.totalTokens).toBeGreaterThan(0);
    });

    it('should deny sending messages to another user conversation', async () => {
      const conv = await companionService.createConversation('usr-alice', { title: 'Alice Only' });

      await expect(
        companionService.sendMessage(conv.id, 'usr-bob', {
          content: 'Hello Alice?',
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject message to a deleted conversation', async () => {
      const conv = await companionService.createConversation('usr-alice', {
        title: 'Dead Session',
      });
      await companionService.deleteConversation(conv.id, 'usr-alice');

      await expect(
        companionService.sendMessage(conv.id, 'usr-alice', {
          content: 'Are you there?',
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('submitFeedback', () => {
    it('should record POSITIVE feedback on assistant response by conversation owner', async () => {
      const conv = await companionService.createConversation('usr-alice', { title: 'Chat' });
      const pair = await companionService.sendMessage(conv.id, 'usr-alice', {
        content: 'How much water should I drink?',
      });

      const feedback = await companionService.submitFeedback(
        pair.assistantMessage.id,
        'usr-alice',
        {
          rating: AIFeedbackRating.POSITIVE,
          comment: 'Very practical and helpful',
        },
      );

      expect(feedback.rating).toBe(AIFeedbackRating.POSITIVE);
      expect(feedback.comment).toBe('Very practical and helpful');
      expect(feedback.userId).toBe('usr-alice');
      expect(feedback.messageId).toBe(pair.assistantMessage.id);
    });

    it('should record NEGATIVE feedback on assistant response', async () => {
      const conv = await companionService.createConversation('usr-alice', { title: 'Chat' });
      const pair = await companionService.sendMessage(conv.id, 'usr-alice', {
        content: 'Tell me about nutrition',
      });

      const feedback = await companionService.submitFeedback(
        pair.assistantMessage.id,
        'usr-alice',
        {
          rating: AIFeedbackRating.NEGATIVE,
        },
      );

      expect(feedback.rating).toBe(AIFeedbackRating.NEGATIVE);
    });

    it('should reject feedback on user messages', async () => {
      const conv = await companionService.createConversation('usr-alice', { title: 'Chat' });
      const pair = await companionService.sendMessage(conv.id, 'usr-alice', {
        content: 'Hello',
      });

      await expect(
        companionService.submitFeedback(pair.userMessage.id, 'usr-alice', {
          rating: AIFeedbackRating.POSITIVE,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject feedback submission by another user', async () => {
      const conv = await companionService.createConversation('usr-alice', { title: 'Chat' });
      const pair = await companionService.sendMessage(conv.id, 'usr-alice', {
        content: 'Hello',
      });

      await expect(
        companionService.submitFeedback(pair.assistantMessage.id, 'usr-bob', {
          rating: AIFeedbackRating.POSITIVE,
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('privacy & audit', () => {
    it('should not leak raw user prompt content into audit logs', async () => {
      const logSpy = vi.spyOn(auditService, 'logEvent');
      const conv = await companionService.createConversation('usr-alice', {
        title: 'Secret Health Habit',
      });

      await companionService.sendMessage(conv.id, 'usr-alice', {
        content: 'My secret symptom inquiry',
      });

      const auditCalls = logSpy.mock.calls;
      for (const [call] of auditCalls) {
        if (call.metadata) {
          const stringified = JSON.stringify(call.metadata);
          expect(stringified).not.toContain('My secret symptom inquiry');
        }
      }
    });
  });
});
