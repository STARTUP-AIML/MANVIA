import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai/providers/mock-ai.provider.js';
import {
  AI_DISCLOSURE_NOTICE,
  MOCK_AI_MODEL_NAME,
  MOCK_AI_PROVIDER_NAME,
} from '../../src/modules/ai/constants/ai.constants.js';

describe('MockAIProvider (Unit)', () => {
  const provider = new MockAIProvider();

  it('should return deterministic greeting response with user preferred name', async () => {
    const res = await provider.generateResponse({
      systemInstruction: 'You are an AI companion',
      messages: [{ role: 'user', content: 'Hello there' }],
      userContext: { userId: 'usr-123', preferredName: 'Alice' },
    });

    expect(res.content).toContain('Hello Alice!');
    expect(res.content).toContain('MANVIA AI Companion');
    expect(res.provider).toBe(MOCK_AI_PROVIDER_NAME);
    expect(res.model).toBe(MOCK_AI_MODEL_NAME);
    expect(res.isAiGenerated).toBe(true);
    expect(res.disclosureNotice).toBe(AI_DISCLOSURE_NOTICE);
    expect(res.usage.promptTokens).toBeGreaterThan(0);
    expect(res.usage.completionTokens).toBeGreaterThan(0);
    expect(res.usage.totalTokens).toBe(res.usage.promptTokens + res.usage.completionTokens);
    expect(res.finishReason).toBe('stop');
  });

  it('should provide explicit non-clinical boundary when user asks for diagnosis or medication', async () => {
    const res = await provider.generateResponse({
      systemInstruction: 'You are an AI companion',
      messages: [
        { role: 'user', content: 'Can you diagnose my chest pain and prescribe antibiotics?' },
      ],
      userContext: { userId: 'usr-123' },
    });

    expect(res.content).toContain('not a licensed medical professional');
    expect(res.content).toContain('cannot provide clinical diagnoses');
    expect(res.content).toContain('prescribe medications');
    expect(res.content).toContain('emergency services or consult a qualified physician');
    expect(res.isAiGenerated).toBe(true);
  });

  it('should provide sleep guidance for sleep-related queries', async () => {
    const res = await provider.generateResponse({
      systemInstruction: 'You are an AI companion',
      messages: [{ role: 'user', content: 'I have trouble with sleep and insomnia' }],
      userContext: { userId: 'usr-123' },
    });

    expect(res.content).toContain('restful sleep');
    expect(res.content).toContain('circadian rhythm');
  });

  it('should provide mindfulness guidance for stress queries', async () => {
    const res = await provider.generateResponse({
      systemInstruction: 'You are an AI companion',
      messages: [{ role: 'user', content: 'I feel a lot of stress and anxiety today' }],
      userContext: { userId: 'usr-123' },
    });

    expect(res.content).toContain('breaths');
    expect(res.content).toContain('nervous system');
  });

  it('should provide hydration and nutrition guidance', async () => {
    const res = await provider.generateResponse({
      systemInstruction: 'You are an AI companion',
      messages: [{ role: 'user', content: 'What is a good water and nutrition habit?' }],
      userContext: { userId: 'usr-123' },
    });

    expect(res.content).toContain('hydration');
    expect(res.content).toContain('balanced');
  });

  it('should provide activity guidance for exercise queries', async () => {
    const res = await provider.generateResponse({
      systemInstruction: 'You are an AI companion',
      messages: [{ role: 'user', content: 'How often should I walk or exercise?' }],
      userContext: { userId: 'usr-123' },
    });

    expect(res.content).toContain('Consistent movement');
    expect(res.content).toContain('brisk walking');
  });

  it('should throw an error when simulation failure token is provided', async () => {
    await expect(
      provider.generateResponse({
        systemInstruction: 'You are an AI companion',
        messages: [{ role: 'user', content: 'Please SIMULATE_AI_PROVIDER_FAILURE now' }],
        userContext: { userId: 'usr-123' },
      }),
    ).rejects.toThrow('Upstream mock AI model provider timeout');
  });
});
