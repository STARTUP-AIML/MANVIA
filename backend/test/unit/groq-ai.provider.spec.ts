import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroqAIProvider } from '../../src/modules/ai/providers/groq-ai.provider.js';
import type { ConfigService } from '../../src/config/config.service.js';
import {
  AI_DISCLOSURE_NOTICE,
  DEFAULT_GROQ_MODEL,
  GROQ_AI_PROVIDER_NAME,
} from '../../src/modules/ai/constants/ai.constants.js';

describe('GroqAIProvider (Unit)', () => {
  let mockConfigService: { groqApiKey: string; groqModel: string };
  let provider: GroqAIProvider;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockConfigService = {
      groqApiKey: 'gsk_test_mock_secret_key_12345',
      groqModel: 'openai/gpt-oss-20b',
    };
    provider = new GroqAIProvider(mockConfigService as unknown as ConfigService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should throw clear configuration error when GROQ_API_KEY is not configured', async () => {
    mockConfigService.groqApiKey = '';
    const unconfiguredProvider = new GroqAIProvider(mockConfigService as unknown as ConfigService);

    await expect(
      unconfiguredProvider.generateResponse({
        systemInstruction: 'You are an AI companion',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toThrow('AI provider configuration error: GROQ_API_KEY is not set');
  });

  it('should format request correctly and normalize successful Groq response', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: {
      model: string;
      temperature: number;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    } | null = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = init.headers as Record<string, string>;
      capturedBody = JSON.parse(init.body as string);

      return new Response(
        JSON.stringify({
          id: 'chatcmpl-test-123',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Hello! I am your MANVIA wellness companion on Groq.',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 42,
            completion_tokens: 15,
            total_tokens: 57,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const response = await provider.generateResponse({
      systemInstruction: 'Base system instructions.',
      messages: [
        { role: 'user', content: 'Hello there!' },
        { role: 'assistant', content: 'Hi, how can I help?' },
        { role: 'user', content: 'Give me a healthy hydration tip.' },
      ],
      userContext: {
        userId: 'patient-42',
        preferredName: 'Maya',
        locale: 'en-US',
      },
      temperature: 0.5,
      maxTokens: 256,
    });

    // Verify endpoint & authentication
    expect(capturedUrl).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(capturedHeaders['Authorization']).toBe('Bearer gsk_test_mock_secret_key_12345');
    expect(capturedHeaders['Content-Type']).toBe('application/json');

    // Verify payload body
    expect(capturedBody).not.toBeNull();
    const body = capturedBody!;
    expect(body.model).toBe('openai/gpt-oss-20b');
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(256);
    const firstMsg = body.messages[0]!;
    expect(firstMsg.role).toBe('system');
    expect(firstMsg.content).toContain('Base system instructions.');
    expect(firstMsg.content).toContain('User preferred name: Maya.');
    expect(firstMsg.content).toContain('User preferred locale: en-US.');
    expect(body.messages).toHaveLength(4); // 1 system + 3 conversation

    // Verify normalized response
    expect(response.provider).toBe(GROQ_AI_PROVIDER_NAME);
    expect(response.model).toBe('openai/gpt-oss-20b');
    expect(response.content).toBe('Hello! I am your MANVIA wellness companion on Groq.');
    expect(response.isAiGenerated).toBe(true);
    expect(response.disclosureNotice).toBe(AI_DISCLOSURE_NOTICE);
    expect(response.finishReason).toBe('stop');
    expect(response.usage).toEqual({
      promptTokens: 42,
      completionTokens: 15,
      totalTokens: 57,
    });
    expect(response.latencyMs).toBeGreaterThanOrEqual(1);
  });

  it('should fall back to default model when groqModel is not set', async () => {
    mockConfigService.groqModel = '';
    const fallbackProvider = new GroqAIProvider(mockConfigService as unknown as ConfigService);
    let capturedModel = '';

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      capturedModel = body.model;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Default model response' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const response = await fallbackProvider.generateResponse({
      systemInstruction: '',
      messages: [{ role: 'user', content: 'Ping' }],
    });

    expect(capturedModel).toBe(DEFAULT_GROQ_MODEL);
    expect(response.model).toBe(DEFAULT_GROQ_MODEL);
  });

  it('should not retry on HTTP 401/403 and should throw safe authentication error', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          error: { message: 'Invalid API Key provided', type: 'invalid_request_error' },
        }),
        { status: 401, statusText: 'Unauthorized' },
      );
    });

    await expect(
      provider.generateResponse({
        systemInstruction: 'Test',
        messages: [{ role: 'user', content: 'Test prompt' }],
      }),
    ).rejects.toThrow('AI service authentication failed. Please check provider credentials.');

    // 401 must not trigger retries
    expect(callCount).toBe(1);
  });

  it('should retry transient 429 rate limit errors with backoff', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify({ error: { message: 'Rate limit reached' } }), {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'Retry-After': '1' },
        });
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Recovered after retry' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const res = await provider.generateResponse({
      systemInstruction: 'Test',
      messages: [{ role: 'user', content: 'Test prompt' }],
    });

    expect(callCount).toBe(2);
    expect(res.content).toBe('Recovered after retry');
  });

  it('should fail with safe error when rate limit persists across retries', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({ error: { message: 'Rate limit exceeded continuously' } }),
        { status: 429, statusText: 'Too Many Requests' },
      );
    });

    await expect(
      provider.generateResponse({
        systemInstruction: 'Test',
        messages: [{ role: 'user', content: 'Test prompt' }],
      }),
    ).rejects.toThrow('AI service rate limit exceeded. Please try again shortly.');
  });

  it('should retry on HTTP 502/503 and handle persistent unavailable errors', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });
    });

    await expect(
      provider.generateResponse({
        systemInstruction: 'Test',
        messages: [{ role: 'user', content: 'Test prompt' }],
      }),
    ).rejects.toThrow('AI upstream provider is temporarily unavailable. Please try again shortly.');
  });

  it('should handle request timeout and throw user-safe timeout message', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      throw err;
    });

    await expect(
      provider.generateResponse({
        systemInstruction: 'Test',
        messages: [{ role: 'user', content: 'Test prompt' }],
      }),
    ).rejects.toThrow('AI service request timed out after 15s. Please try again.');
  });

  it('should reject empty or malformed completion content', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '   ' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    await expect(
      provider.generateResponse({
        systemInstruction: 'Test',
        messages: [{ role: 'user', content: 'Test prompt' }],
      }),
    ).rejects.toThrow('AI service returned an empty response. Please try again.');
  });

  it('should throw immediately when test failure hook SIMULATE_AI_PROVIDER_FAILURE is used', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    await expect(
      provider.generateResponse({
        systemInstruction: 'Test',
        messages: [{ role: 'user', content: 'Please SIMULATE_AI_PROVIDER_FAILURE' }],
      }),
    ).rejects.toThrow('Upstream mock AI model provider timeout');

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
