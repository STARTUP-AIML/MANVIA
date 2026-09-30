import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';

describe('AI Companion Core HTTP API (E2E)', () => {
  let app: NestFastifyApplication;

  const USER_A = 'usr-e2e-ai-user-a';
  const USER_B = 'usr-e2e-ai-user-b';

  let conversationAId: string;
  let conversationAPublicId: string;
  let assistantMessageId: string;
  let userMessageId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication & Authorization Boundaries', () => {
    it('should reject unauthenticated request to /api/v1/ai/conversations with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/conversations',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Conversation Lifecycle', () => {
    it('should create conversation with default title for authenticated User A', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/conversations',
        headers: {
          'x-user-id': USER_A,
          'x-user-role': 'PATIENT',
        },
        payload: {},
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.id).toBeDefined();
      expect(body.publicConversationId).toMatch(/^AIC-[2-9A-Z]{8}$/);
      expect(body.title).toBe('Wellness Conversation');
      expect(body.status).toBe('ACTIVE');
      expect(body.userId).toBe(USER_A);

      conversationAId = body.id;
      conversationAPublicId = body.publicConversationId;
    });

    it('should create conversation with custom title', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/conversations',
        headers: {
          'x-user-id': USER_A,
          'x-user-role': 'PATIENT',
        },
        payload: {
          title: 'Sleep Optimization Routine',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.title).toBe('Sleep Optimization Routine');
    });

    it('should list conversations for User A', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/conversations?page=1&limit=10',
        headers: {
          'x-user-id': USER_A,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBe(2);
      expect(body.data).toHaveLength(2);
      expect(body.page).toBe(1);
    });

    it('should retrieve conversation details by public ID for User A', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/ai/conversations/${conversationAPublicId}`,
        headers: {
          'x-user-id': USER_A,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.conversation.id).toBe(conversationAId);
      expect(body.conversation.publicConversationId).toBe(conversationAPublicId);
      expect(Array.isArray(body.messages)).toBe(true);
    });

    it('should forbid User B from accessing User A conversation', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/ai/conversations/${conversationAId}`,
        headers: {
          'x-user-id': USER_B,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Messaging & AI Generation Flow', () => {
    it('should submit user message, generate AI response, and return message pair', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/conversations/${conversationAId}/messages`,
        headers: {
          'x-user-id': USER_A,
          'x-user-role': 'PATIENT',
          'x-correlation-id': 'corr-e2e-12345',
        },
        payload: {
          content: 'How can I establish a consistent sleep schedule?',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);

      // User Message
      expect(body.userMessage).toBeDefined();
      expect(body.userMessage.role).toBe('USER');
      expect(body.userMessage.content).toBe('How can I establish a consistent sleep schedule?');
      expect(body.userMessage.status).toBe('SENT');
      expect(body.userMessage.isAiGenerated).toBe(false);
      userMessageId = body.userMessage.id;

      // Assistant Message
      expect(body.assistantMessage).toBeDefined();
      expect(body.assistantMessage.role).toBe('ASSISTANT');
      expect(body.assistantMessage.status).toBe('DELIVERED');
      expect(body.assistantMessage.isAiGenerated).toBe(true);
      expect(body.assistantMessage.content).toContain('restful sleep');

      // Generation Metadata & Disclosure
      expect(body.assistantMessage.generation).toBeDefined();
      expect(body.assistantMessage.generation.provider).toBe('MOCK_PROVIDER');
      expect(body.assistantMessage.generation.model).toBe('mock-companion-v1');
      expect(body.assistantMessage.generation.isAiGenerated).toBe(true);
      expect(body.assistantMessage.generation.disclosureNotice).toContain(
        'educational and informational purposes only',
      );
      expect(body.assistantMessage.generation.promptTokens).toBeGreaterThan(0);
      expect(body.assistantMessage.generation.completionTokens).toBeGreaterThan(0);
      expect(body.assistantMessage.generation.totalTokens).toBeGreaterThan(0);

      assistantMessageId = body.assistantMessage.id;
    });

    it('should enforce non-clinical boundary when user asks for diagnosis', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/conversations/${conversationAId}/messages`,
        headers: {
          'x-user-id': USER_A,
          'x-user-role': 'PATIENT',
        },
        payload: {
          content: 'Please diagnose my sharp chest pain',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.assistantMessage.content).toContain('not a licensed medical professional');
      expect(body.assistantMessage.content).toContain('cannot provide clinical diagnoses');
      expect(body.assistantMessage.content).toContain('emergency services');
    });

    it('should forbid User B from sending messages to User A conversation', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/conversations/${conversationAId}/messages`,
        headers: {
          'x-user-id': USER_B,
          'x-user-role': 'PATIENT',
        },
        payload: {
          content: 'Hello unauthorized',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('AI Feedback Loop', () => {
    it('should allow User A to submit POSITIVE feedback on assistant response', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/messages/${assistantMessageId}/feedback`,
        headers: {
          'x-user-id': USER_A,
          'x-user-role': 'PATIENT',
        },
        payload: {
          rating: 'POSITIVE',
          comment: 'Very helpful and comforting guidance.',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.rating).toBe('POSITIVE');
      expect(body.comment).toBe('Very helpful and comforting guidance.');
      expect(body.userId).toBe(USER_A);
      expect(body.messageId).toBe(assistantMessageId);
    });

    it('should allow updating feedback to NEGATIVE', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/messages/${assistantMessageId}/feedback`,
        headers: {
          'x-user-id': USER_A,
          'x-user-role': 'PATIENT',
        },
        payload: {
          rating: 'NEGATIVE',
          comment: 'Changed mind, needed more detail.',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.rating).toBe('NEGATIVE');
    });

    it('should reject feedback on user message', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/messages/${userMessageId}/feedback`,
        headers: {
          'x-user-id': USER_A,
          'x-user-role': 'PATIENT',
        },
        payload: {
          rating: 'POSITIVE',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should forbid User B from providing feedback on User A assistant message', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/messages/${assistantMessageId}/feedback`,
        headers: {
          'x-user-id': USER_B,
          'x-user-role': 'PATIENT',
        },
        payload: {
          rating: 'POSITIVE',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Conversation Deletion & Archiving', () => {
    it('should forbid User B from deleting User A conversation', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/ai/conversations/${conversationAId}`,
        headers: {
          'x-user-id': USER_B,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should allow User A to delete conversation', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/ai/conversations/${conversationAId}`,
        headers: {
          'x-user-id': USER_A,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.id).toBe(conversationAId);
    });

    it('should reject sending messages to deleted conversation with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/conversations/${conversationAId}/messages`,
        headers: {
          'x-user-id': USER_A,
          'x-user-role': 'PATIENT',
        },
        payload: {
          content: 'Are you still active?',
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
