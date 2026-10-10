import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { AI_PROVIDER } from '../../src/modules/ai/providers/provider.tokens.js';
import { GroqAIProvider } from '../../src/modules/ai/providers/groq-ai.provider.js';
import { GeminiAIProvider } from '../../src/modules/ai/providers/gemini-ai.provider.js';
import { MockAIProvider } from '../../src/modules/ai/providers/mock-ai.provider.js';
import { ConfigService } from '../../src/config/config.service.js';

describe('AI Provider Factory & Selection (Unit)', () => {
  const createTestingModuleWithConfig = async (configOverrides: Record<string, unknown>) => {
    const mockConfigService = {
      aiProvider: 'gemini',
      geminiApiKey: '',
      geminiModel: 'gemini-1.5-flash',
      groqApiKey: '',
      groqModel: 'openai/gpt-oss-20b',
      isProduction: false,
      ...configOverrides,
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MockAIProvider,
          useValue: new MockAIProvider(),
        },
        {
          provide: GeminiAIProvider,
          useValue: new GeminiAIProvider(mockConfigService as unknown as ConfigService),
        },
        {
          provide: GroqAIProvider,
          useValue: new GroqAIProvider(mockConfigService as unknown as ConfigService),
        },
        {
          provide: AI_PROVIDER,
          useFactory: (
            config: ConfigService,
            gemini: GeminiAIProvider,
            groq: GroqAIProvider,
            mock: MockAIProvider,
          ) => {
            const providerName = (config.aiProvider || '').toLowerCase();
            const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

            if (isTest && process.env.AI_USE_REAL_PROVIDER !== 'true') {
              return mock;
            }

            if (providerName === 'mock') {
              if (config.isProduction) {
                throw new Error(
                  'AI provider configuration error: mock provider cannot be used in production',
                );
              }
              return mock;
            }

            if (providerName === 'groq') {
              if (!config.groqApiKey) {
                throw new Error(
                  'AI provider configuration error: GROQ_API_KEY is not configured in environment',
                );
              }
              return groq;
            }

            if (providerName === 'gemini') {
              if (!config.geminiApiKey) {
                if (config.isProduction) {
                  throw new Error(
                    'AI provider configuration error: GEMINI_API_KEY is not configured in environment',
                  );
                }
                return mock;
              }
              return gemini;
            }

            throw new Error(
              `AI provider configuration error: unsupported AI_PROVIDER "${config.aiProvider}". Supported values: "groq", "gemini", "mock"`,
            );
          },
          inject: [ConfigService, GeminiAIProvider, GroqAIProvider, MockAIProvider],
        },
      ],
    }).compile();

    return moduleRef.get(AI_PROVIDER);
  };

  it('should default to MockAIProvider during unit tests when AI_USE_REAL_PROVIDER is not set', async () => {
    const original = process.env.AI_USE_REAL_PROVIDER;
    delete process.env.AI_USE_REAL_PROVIDER;

    const provider = await createTestingModuleWithConfig({
      aiProvider: 'groq',
      groqApiKey: 'some_key',
    });

    expect(provider).toBeInstanceOf(MockAIProvider);

    if (original !== undefined) {
      process.env.AI_USE_REAL_PROVIDER = original;
    }
  });

  it('should select GroqAIProvider when AI_PROVIDER is "groq" and real provider is requested', async () => {
    process.env.AI_USE_REAL_PROVIDER = 'true';

    const provider = await createTestingModuleWithConfig({
      aiProvider: 'groq',
      groqApiKey: 'gsk_valid_key',
    });

    expect(provider).toBeInstanceOf(GroqAIProvider);

    delete process.env.AI_USE_REAL_PROVIDER;
  });

  it('should fail safely when AI_PROVIDER is "groq" but GROQ_API_KEY is missing', async () => {
    process.env.AI_USE_REAL_PROVIDER = 'true';

    await expect(
      createTestingModuleWithConfig({
        aiProvider: 'groq',
        groqApiKey: '',
      }),
    ).rejects.toThrow(
      'AI provider configuration error: GROQ_API_KEY is not configured in environment',
    );

    delete process.env.AI_USE_REAL_PROVIDER;
  });

  it('should select GeminiAIProvider when AI_PROVIDER is "gemini" and key is configured', async () => {
    process.env.AI_USE_REAL_PROVIDER = 'true';

    const provider = await createTestingModuleWithConfig({
      aiProvider: 'gemini',
      geminiApiKey: 'gemini_valid_key',
    });

    expect(provider).toBeInstanceOf(GeminiAIProvider);

    delete process.env.AI_USE_REAL_PROVIDER;
  });

  it('should reject mock provider in production', async () => {
    process.env.AI_USE_REAL_PROVIDER = 'true';

    await expect(
      createTestingModuleWithConfig({
        aiProvider: 'mock',
        isProduction: true,
      }),
    ).rejects.toThrow(
      'AI provider configuration error: mock provider cannot be used in production',
    );

    delete process.env.AI_USE_REAL_PROVIDER;
  });

  it('should reject unknown provider setting', async () => {
    process.env.AI_USE_REAL_PROVIDER = 'true';

    await expect(
      createTestingModuleWithConfig({
        aiProvider: 'anthropic_claude',
      }),
    ).rejects.toThrow(
      'AI provider configuration error: unsupported AI_PROVIDER "anthropic_claude"',
    );

    delete process.env.AI_USE_REAL_PROVIDER;
  });
});
