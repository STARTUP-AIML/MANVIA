import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIOrchestratorService } from '../../src/modules/ai/services/ai-orchestrator.service.js';
import { AIContextService } from '../../src/modules/ai/services/ai-context.service.js';
import { MockAIProvider } from '../../src/modules/ai/providers/mock-ai.provider.js';
import { InMemoryAIRepository } from '../../src/modules/ai/repositories/in-memory-ai.repository.js';
import { AIAuditService } from '../../src/modules/ai/services/ai-audit.service.js';
import { AIMessageRole } from '../../src/modules/ai/enums/ai-message-role.enum.js';
import { AIMessageStatus } from '../../src/modules/ai/enums/ai-message-status.enum.js';
import { InternalServerError } from '../../src/common/errors/app-error.js';

describe('AIOrchestratorService (Unit)', () => {
  let repository: InMemoryAIRepository;
  let contextService: AIContextService;
  let provider: MockAIProvider;
  let auditService: AIAuditService;
  let orchestrator: AIOrchestratorService;

  beforeEach(() => {
    repository = new InMemoryAIRepository();
    contextService = new AIContextService(repository);
    provider = new MockAIProvider();
    auditService = new AIAuditService();
    orchestrator = new AIOrchestratorService(provider, repository, contextService, auditService);
  });

  it('should process message, persist assistant response and generation metadata', async () => {
    const conversation = await repository.createConversation({
      userId: 'usr-123',
      publicConversationId: 'AIC-ABCDEF12',
      title: 'Healthy Living',
    });

    const userMessage = await repository.createMessage({
      publicMessageId: 'AIM-USR001',
      conversationId: conversation.id,
      role: AIMessageRole.USER,
      content: 'Can you recommend good sleep habits?',
      status: AIMessageStatus.SENT,
    });

    const result = await orchestrator.processMessage({
      conversationId: conversation.id,
      userMessageId: userMessage.id,
      userId: 'usr-123',
      content: 'Can you recommend good sleep habits?',
      correlationId: 'req-test-999',
    });

    expect(result.assistantMessage).toBeDefined();
    expect(result.assistantMessage.role).toBe(AIMessageRole.ASSISTANT);
    expect(result.assistantMessage.status).toBe(AIMessageStatus.DELIVERED);
    expect(result.assistantMessage.content).toContain('restful sleep');

    expect(result.generation).toBeDefined();
    expect(result.generation.isAiGenerated).toBe(true);
    expect(result.generation.correlationId).toBe('req-test-999');
    expect(result.generation.disclosureNotice).toContain('informational purposes only');
    expect(result.generation.totalTokens).toBeGreaterThan(0);

    // Verify persisted in repository
    const stored = await repository.findMessageById(result.assistantMessage.id);
    expect(stored).toBeDefined();
    expect(stored?.generation).toBeDefined();
    expect(stored?.generation?.model).toBe('mock-companion-v1');
  });

  it('should handle provider failure gracefully without exposing internal stack traces', async () => {
    const conversation = await repository.createConversation({
      userId: 'usr-123',
      publicConversationId: 'AIC-ABCDEF13',
      title: 'Failure Test',
    });

    const userMessage = await repository.createMessage({
      publicMessageId: 'AIM-USR002',
      conversationId: conversation.id,
      role: AIMessageRole.USER,
      content: 'SIMULATE_AI_PROVIDER_FAILURE now',
      status: AIMessageStatus.SENT,
    });

    const auditSpy = vi.spyOn(auditService, 'logEvent');

    await expect(
      orchestrator.processMessage({
        conversationId: conversation.id,
        userMessageId: userMessage.id,
        userId: 'usr-123',
        content: 'SIMULATE_AI_PROVIDER_FAILURE now',
      }),
    ).rejects.toThrow(InternalServerError);

    // Verify user message is preserved
    const preserved = await repository.findMessageById(userMessage.id);
    expect(preserved).toBeDefined();
    expect(preserved?.content).toBe('SIMULATE_AI_PROVIDER_FAILURE now');

    // Verify audit event was logged
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'AI_RESPONSE_FAILED',
        actorId: 'usr-123',
      }),
    );
  });
});
