import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AICompanionController } from '../../src/modules/ai/controllers/ai-companion.controller.js';
import { AICompanionService } from '../../src/modules/ai/services/ai-companion.service.js';
import type { CurrentUserContext } from '../../src/modules/doctors/interfaces/auth-context.interface.js';
import { AIFeedbackRating } from '../../src/modules/ai/enums/ai-feedback-rating.enum.js';
import { AIConversationStatus } from '../../src/modules/ai/enums/ai-conversation-status.enum.js';
import { AIMessageRole } from '../../src/modules/ai/enums/ai-message-role.enum.js';
import { AIMessageStatus } from '../../src/modules/ai/enums/ai-message-status.enum.js';
import { AIMemoryService } from '../../src/modules/ai/memory/ai-memory.service.js';
import { AIRealtimeService } from '../../src/modules/ai/realtime/ai-realtime.service.js';
import { AIHandoffService } from '../../src/modules/ai/handoff/ai-handoff.service.js';
import { AISafetyService } from '../../src/modules/ai/safety/ai-safety.service.js';
import { MedicalRAGService } from '../../src/modules/ai/rag/medical-rag.service.js';

describe('AICompanionController (Unit)', () => {
  let controller: AICompanionController;
  let service: AICompanionService;

  const mockUser: CurrentUserContext = {
    userId: 'usr-100',
    activeRole: 'PATIENT',
    email: 'patient@example.com',
  };

  beforeEach(() => {
    service = {
      createConversation: vi.fn(),
      listConversations: vi.fn(),
      getConversation: vi.fn(),
      deleteConversation: vi.fn(),
      sendMessage: vi.fn(),
      submitFeedback: vi.fn(),
    } as unknown as AICompanionService;

    const mockMemory = {
      createMemory: vi.fn(),
      listMemories: vi.fn(),
      deleteMemory: vi.fn(),
      getActiveMemoriesContext: vi.fn(),
    } as unknown as AIMemoryService;

    const mockRealtime = {
      createSession: vi.fn(),
      getSession: vi.fn(),
      transitionState: vi.fn(),
      interruptSession: vi.fn(),
      endSession: vi.fn(),
    } as unknown as AIRealtimeService;

    const mockHandoff = {
      requestHandoff: vi.fn(),
      listUserHandoffs: vi.fn(),
      getUserHandoff: vi.fn(),
      cancelHandoff: vi.fn(),
      listPendingHandoffsForDoctor: vi.fn(),
      acceptHandoff: vi.fn(),
    } as unknown as AIHandoffService;

    const mockSafety = {
      evaluatePreCheck: vi.fn(),
      evaluatePostCheck: vi.fn(),
    } as unknown as AISafetyService;

    const mockRag = {
      retrieveEvidence: vi.fn(),
    } as unknown as MedicalRAGService;

    controller = new AICompanionController(
      service,
      mockMemory,
      mockRealtime,
      mockHandoff,
      mockSafety,
      mockRag,
    );
  });

  it('should delegate createConversation to service with user context', async () => {
    const expected = {
      id: 'conv-1',
      publicConversationId: 'AIC-12345678',
      userId: 'usr-100',
      title: 'Session',
      status: AIConversationStatus.ACTIVE,
      lastMessageAt: new Date().toISOString(),
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.mocked(service.createConversation).mockResolvedValue(expected);

    const res = await controller.createConversation(mockUser, { title: 'Session' });
    expect(res).toEqual(expected);
    expect(service.createConversation).toHaveBeenCalledWith('usr-100', { title: 'Session' });
  });

  it('should delegate listConversations to service', async () => {
    const expected = {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    vi.mocked(service.listConversations).mockResolvedValue(expected);

    const res = await controller.listConversations(mockUser, { page: 1, limit: 20 });
    expect(res).toEqual(expected);
    expect(service.listConversations).toHaveBeenCalledWith('usr-100', { page: 1, limit: 20 });
  });

  it('should delegate getConversation to service', async () => {
    const expected = {
      conversation: {
        id: 'conv-1',
        publicConversationId: 'AIC-12345678',
        userId: 'usr-100',
        title: 'Session',
        status: AIConversationStatus.ACTIVE,
        lastMessageAt: new Date().toISOString(),
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      messages: [],
    };
    vi.mocked(service.getConversation).mockResolvedValue(expected);

    const res = await controller.getConversation(mockUser, 'conv-1');
    expect(res).toEqual(expected);
    expect(service.getConversation).toHaveBeenCalledWith('conv-1', 'usr-100');
  });

  it('should delegate deleteConversation to service', async () => {
    vi.mocked(service.deleteConversation).mockResolvedValue({ success: true, id: 'conv-1' });

    const res = await controller.deleteConversation(mockUser, 'conv-1');
    expect(res).toEqual({ success: true, id: 'conv-1' });
    expect(service.deleteConversation).toHaveBeenCalledWith('conv-1', 'usr-100');
  });

  it('should delegate sendMessage to service with correlation headers', async () => {
    const expected = {
      userMessage: {
        id: 'msg-u',
        publicMessageId: 'AIM-U',
        conversationId: 'conv-1',
        role: AIMessageRole.USER,
        content: 'Hi',
        status: AIMessageStatus.SENT,
        isAiGenerated: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: 'msg-a',
        publicMessageId: 'AIM-A',
        conversationId: 'conv-1',
        role: AIMessageRole.ASSISTANT,
        content: 'Hello!',
        status: AIMessageStatus.DELIVERED,
        isAiGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    vi.mocked(service.sendMessage).mockResolvedValue(expected);

    const res = await controller.sendMessage(mockUser, 'conv-1', { content: 'Hi' }, 'corr-123');
    expect(res).toEqual(expected);
    expect(service.sendMessage).toHaveBeenCalledWith(
      'conv-1',
      'usr-100',
      { content: 'Hi' },
      'corr-123',
    );
  });

  it('should delegate submitFeedback to service', async () => {
    const expected = {
      id: 'fb-1',
      messageId: 'msg-a',
      userId: 'usr-100',
      rating: AIFeedbackRating.POSITIVE,
      comment: 'Good',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.mocked(service.submitFeedback).mockResolvedValue(expected);

    const res = await controller.submitFeedback(mockUser, 'msg-a', {
      rating: AIFeedbackRating.POSITIVE,
      comment: 'Good',
    });
    expect(res).toEqual(expected);
    expect(service.submitFeedback).toHaveBeenCalledWith('msg-a', 'usr-100', {
      rating: AIFeedbackRating.POSITIVE,
      comment: 'Good',
    });
  });
});
