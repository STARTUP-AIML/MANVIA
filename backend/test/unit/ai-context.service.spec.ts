import { describe, it, expect, beforeEach } from 'vitest';
import { AIContextService } from '../../src/modules/ai/services/ai-context.service.js';
import { InMemoryAIRepository } from '../../src/modules/ai/repositories/in-memory-ai.repository.js';
import { AIMessageRole } from '../../src/modules/ai/enums/ai-message-role.enum.js';
import { DEFAULT_AI_SYSTEM_INSTRUCTION } from '../../src/modules/ai/constants/ai.constants.js';

describe('AIContextService (Unit)', () => {
  let repository: InMemoryAIRepository;
  let service: AIContextService;

  beforeEach(() => {
    repository = new InMemoryAIRepository();
    service = new AIContextService(repository);
  });

  it('should build context with system instructions and new message', async () => {
    const conversation = await repository.createConversation({
      userId: 'usr-1',
      publicConversationId: 'AIC-TEST001',
      title: 'Test Session',
    });

    const context = await service.buildContext(conversation.id, 'usr-1', 'How to relax?');

    expect(context.systemInstruction).toBe(DEFAULT_AI_SYSTEM_INSTRUCTION);
    expect(context.messages).toHaveLength(1);
    expect(context.messages[0]).toEqual({
      role: 'user',
      content: 'How to relax?',
    });
    expect(context.userContext.userId).toBe('usr-1');
  });

  it('should include conversation history in chronological order', async () => {
    const conversation = await repository.createConversation({
      userId: 'usr-1',
      publicConversationId: 'AIC-TEST002',
      title: 'History Test',
    });

    await repository.createMessage({
      publicMessageId: 'AIM-001',
      conversationId: conversation.id,
      role: AIMessageRole.USER,
      content: 'I want to sleep better',
    });

    await repository.createMessage({
      publicMessageId: 'AIM-002',
      conversationId: conversation.id,
      role: AIMessageRole.ASSISTANT,
      content: 'Try dimming the lights before bed.',
    });

    const context = await service.buildContext(conversation.id, 'usr-1', 'What else can I do?');

    expect(context.messages).toHaveLength(3);
    expect(context.messages[0]?.role).toBe('user');
    expect(context.messages[0]?.content).toBe('I want to sleep better');
    expect(context.messages[1]?.role).toBe('assistant');
    expect(context.messages[1]?.content).toBe('Try dimming the lights before bed.');
    expect(context.messages[2]?.role).toBe('user');
    expect(context.messages[2]?.content).toBe('What else can I do?');
  });

  it('should honor custom locale in system instructions', async () => {
    const conversation = await repository.createConversation({
      userId: 'usr-1',
      publicConversationId: 'AIC-TEST003',
      title: 'Locale Test',
    });

    const context = await service.buildContext(conversation.id, 'usr-1', 'Hello', {
      locale: 'es-ES',
    });

    expect(context.systemInstruction).toContain('es-ES');
    expect(context.userContext.locale).toBe('es-ES');
  });

  it('should bound history size according to limit parameter', async () => {
    const conversation = await repository.createConversation({
      userId: 'usr-1',
      publicConversationId: 'AIC-TEST004',
      title: 'Bounded Test',
    });

    for (let i = 0; i < 30; i++) {
      await repository.createMessage({
        publicMessageId: `AIM-${i}`,
        conversationId: conversation.id,
        role: i % 2 === 0 ? AIMessageRole.USER : AIMessageRole.ASSISTANT,
        content: `Message ${i}`,
      });
    }

    const context = await service.buildContext(conversation.id, 'usr-1', 'Latest message', {
      historyLimit: 10,
    });

    // Bounded to 10 history + 1 latest message
    expect(context.messages.length).toBeLessThanOrEqual(11);
  });
});
