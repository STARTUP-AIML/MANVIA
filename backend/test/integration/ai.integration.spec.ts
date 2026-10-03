import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { AIModule } from '../../src/modules/ai/ai.module.js';
import { AICompanionService } from '../../src/modules/ai/services/ai-companion.service.js';
import { AIOrchestratorService } from '../../src/modules/ai/services/ai-orchestrator.service.js';
import { AIContextService } from '../../src/modules/ai/services/ai-context.service.js';
import {
  AI_AUDIT_SERVICE,
  AI_PROVIDER,
  AI_REPOSITORY,
} from '../../src/modules/ai/providers/provider.tokens.js';
import { AIFeedbackRating } from '../../src/modules/ai/enums/ai-feedback-rating.enum.js';
import { AIMessageRole } from '../../src/modules/ai/enums/ai-message-role.enum.js';

describe('AI Module Integration', () => {
  let moduleRef: TestingModule;
  let companionService: AICompanionService;
  let orchestratorService: AIOrchestratorService;
  let contextService: AIContextService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AIModule],
    }).compile();

    companionService = moduleRef.get<AICompanionService>(AICompanionService);
    orchestratorService = moduleRef.get<AIOrchestratorService>(AIOrchestratorService);
    contextService = moduleRef.get<AIContextService>(AIContextService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should wire all required AI services and tokens', () => {
    expect(companionService).toBeDefined();
    expect(orchestratorService).toBeDefined();
    expect(contextService).toBeDefined();
    expect(moduleRef.get(AI_PROVIDER)).toBeDefined();
    expect(moduleRef.get(AI_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(AI_AUDIT_SERVICE)).toBeDefined();
  });

  it('should execute end-to-end conversational workflow with isolation', async () => {
    // 1. Create session
    const conv = await companionService.createConversation('test-usr-1', {
      title: 'Integration Test Session',
    });
    expect(conv.publicConversationId).toMatch(/^AIC-/);

    // 2. Send message
    const result = await companionService.sendMessage(conv.id, 'test-usr-1', {
      content: 'Can you help me build a morning hydration habit?',
    });

    expect(result.userMessage.role).toBe(AIMessageRole.USER);
    expect(result.assistantMessage.role).toBe(AIMessageRole.ASSISTANT);
    expect(result.assistantMessage.isAiGenerated).toBe(true);
    expect(result.assistantMessage.generation?.provider).toBe('MOCK_PROVIDER');

    // 3. Submit feedback
    const feedback = await companionService.submitFeedback(
      result.assistantMessage.id,
      'test-usr-1',
      {
        rating: AIFeedbackRating.POSITIVE,
        comment: 'Very helpful hydration tips!',
      },
    );

    expect(feedback.rating).toBe(AIFeedbackRating.POSITIVE);
    expect(feedback.comment).toBe('Very helpful hydration tips!');

    // 4. Retrieve conversation history
    const detail = await companionService.getConversation(conv.id, 'test-usr-1');
    expect(detail.messages).toHaveLength(2);
    expect(detail.messages[0]?.role).toBe(AIMessageRole.USER);
    expect(detail.messages[1]?.role).toBe(AIMessageRole.ASSISTANT);
  });
});
