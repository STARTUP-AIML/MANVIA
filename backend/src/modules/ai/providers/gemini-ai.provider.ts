import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service.js';
import type {
  AIProviderMessage,
  AIProviderRequest,
  AIProviderResponse,
  IAIProvider,
} from '../interfaces/ai-provider.interface.js';
import { AI_DISCLOSURE_NOTICE } from '../constants/ai.constants.js';

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
      role?: string;
    };
    finishReason?: string;
    index?: number;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

@Injectable()
export class GeminiAIProvider implements IAIProvider {
  private readonly logger = new Logger(GeminiAIProvider.name);

  constructor(private readonly configService: ConfigService) {}

  public async generateResponse(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startTime = Date.now();

    // Support test simulation hook
    const lastUserMsg =
      [...request.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    if (lastUserMsg.includes('SIMULATE_AI_PROVIDER_FAILURE')) {
      throw new Error('Upstream mock AI model provider timeout');
    }

    const apiKey = this.configService.geminiApiKey;
    const model = this.configService.geminiModel || 'gemini-3.8-flash';

    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not configured in environment');
      throw new Error('AI provider configuration error: GEMINI_API_KEY is not set');
    }

    const contents = this.formatGeminiContents(request.messages);
    const systemInstructionText = this.buildSystemInstruction(request);

    const bodyPayload = {
      systemInstruction: {
        parts: [{ text: systemInstructionText }],
      },
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 1024,
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(30000),
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'TimeoutError';
      const msg = isTimeout
        ? 'Request timed out after 30s'
        : err instanceof Error
          ? err.message
          : 'Network error';
      this.logger.error(`Gemini API connection error: ${msg}`);
      throw new Error(`AI service connection failed: ${msg}`);
    }

    const latencyMs = Math.max(1, Date.now() - startTime);

    if (!response.ok) {
      let errorDetails = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorJson = (await response.json()) as GeminiResponse;
        if (errorJson.error?.message) {
          errorDetails = errorJson.error.message;
        }
      } catch {
        // Fall back to HTTP status
      }

      this.logger.error(`Gemini API failed: ${errorDetails} (latency: ${latencyMs}ms)`);
      if (response.status === 429) {
        throw new Error('AI service rate limit exceeded. Please try again shortly.');
      }
      throw new Error(`AI service provider error: ${errorDetails}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const candidate = data.candidates?.[0];
    const generatedText = candidate?.content?.parts?.[0]?.text?.trim() ?? '';

    if (!generatedText) {
      this.logger.warn('Gemini returned empty candidate text');
      throw new Error('AI service returned an empty response. Please try again.');
    }

    const promptTokens =
      data.usageMetadata?.promptTokenCount ??
      Math.max(1, Math.ceil(JSON.stringify(bodyPayload).length / 4));
    const completionTokens =
      data.usageMetadata?.candidatesTokenCount ?? Math.max(1, Math.ceil(generatedText.length / 4));
    const totalTokens = data.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;

    return {
      content: generatedText,
      provider: 'gemini',
      model,
      latencyMs,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      finishReason: candidate?.finishReason ?? 'STOP',
      isAiGenerated: true,
      disclosureNotice: AI_DISCLOSURE_NOTICE,
    };
  }

  private buildSystemInstruction(request: AIProviderRequest): string {
    let instruction = request.systemInstruction;
    if (request.userContext?.preferredName) {
      instruction += `\nUser preferred name: ${request.userContext.preferredName}.`;
    }
    if (request.userContext?.locale) {
      instruction += `\nUser preferred locale: ${request.userContext.locale}. Respond in this language if appropriate.`;
    }
    return instruction;
  }

  /**
   * Transforms raw messages into alternating user/model turns as required by the Gemini API.
   */
  private formatGeminiContents(messages: AIProviderMessage[]): GeminiContent[] {
    const valid = messages.filter((m) => m.content && m.content.trim().length > 0);
    if (valid.length === 0) {
      return [{ role: 'user', parts: [{ text: 'Hello' }] }];
    }

    const turns: GeminiContent[] = [];

    for (const msg of valid) {
      const geminiRole: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';

      const lastTurn = turns[turns.length - 1];
      if (lastTurn && lastTurn.role === geminiRole) {
        // Merge consecutive messages of the same role into parts
        lastTurn.parts.push({ text: msg.content.trim() });
      } else {
        turns.push({
          role: geminiRole,
          parts: [{ text: msg.content.trim() }],
        });
      }
    }

    // Gemini requires the first turn to be 'user'
    if (turns.length > 0 && turns[0]?.role === 'model') {
      turns.unshift({
        role: 'user',
        parts: [{ text: 'Hello' }],
      });
    }

    return turns;
  }
}
