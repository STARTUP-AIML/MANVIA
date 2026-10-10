import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service.js';
import type {
  AIProviderRequest,
  AIProviderResponse,
  IAIProvider,
} from '../interfaces/ai-provider.interface.js';
import {
  AI_DISCLOSURE_NOTICE,
  DEFAULT_GROQ_MODEL,
  GROQ_AI_PROVIDER_NAME,
  GROQ_API_BASE_URL,
} from '../constants/ai.constants.js';

interface GroqChoice {
  index?: number;
  message?: {
    role?: string;
    content?: string | null;
  };
  finish_reason?: string;
}

interface GroqChatCompletionResponse {
  id?: string;
  choices?: GroqChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

@Injectable()
export class GroqAIProvider implements IAIProvider {
  private readonly logger = new Logger(GroqAIProvider.name);
  private readonly baseUrl = GROQ_API_BASE_URL;

  constructor(private readonly configService: ConfigService) {}

  public async generateResponse(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startTime = Date.now();

    // Support test simulation hook for timeout / upstream failure
    const lastUserMsg =
      [...request.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    if (lastUserMsg.includes('SIMULATE_AI_PROVIDER_FAILURE')) {
      throw new Error('Upstream mock AI model provider timeout');
    }

    const apiKey = this.configService.groqApiKey;
    const model = this.configService.groqModel || DEFAULT_GROQ_MODEL;

    if (!apiKey) {
      this.logger.error('GROQ_API_KEY is not configured in environment');
      throw new Error('AI provider configuration error: GROQ_API_KEY is not set');
    }

    const messages = this.formatMessages(request);

    const bodyPayload = {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1024,
    };

    const endpoint = `${this.baseUrl}/chat/completions`;
    let response: Response | null = null;
    let lastError: Error | null = null;
    const maxRetries = 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
          signal: AbortSignal.timeout(15000), // 15s bounded timeout
        });

        // Do not retry 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden)
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          break;
        }

        // Retry transient upstream rate limit (429) or temporary server errors (500, 502, 503)
        if (
          (response.status === 429 ||
            response.status === 500 ||
            response.status === 502 ||
            response.status === 503) &&
          attempt < maxRetries
        ) {
          const retryAfterHeader = response.headers.get('retry-after');
          let delayMs = 1000;
          if (retryAfterHeader) {
            const parsedSeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
              delayMs = Math.min(parsedSeconds * 1000, 5000);
            }
          }
          this.logger.warn(
            `Groq API returned HTTP ${response.status}; retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          this.logger.warn(
            `Groq network/timeout error: ${lastError.message}; retrying in 1000ms (attempt ${attempt + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        break;
      }
    }

    if (!response) {
      const isTimeout =
        lastError?.name === 'TimeoutError' || lastError?.message.includes('timeout');
      const msg = isTimeout
        ? 'AI service request timed out after 15s. Please try again.'
        : `AI service connection failed: ${lastError?.message || 'Network error'}`;
      this.logger.error(`Groq API connection error: ${msg}`);
      throw new Error(msg);
    }

    const latencyMs = Math.max(1, Date.now() - startTime);

    if (!response.ok) {
      let errorDetails = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorJson = (await response.json()) as GroqChatCompletionResponse;
        if (errorJson.error?.message) {
          errorDetails = errorJson.error.message;
        }
      } catch {
        // Fall back to status text
      }

      this.logger.error(`Groq API call failed: ${errorDetails} (latency: ${latencyMs}ms)`);

      if (response.status === 401 || response.status === 403) {
        throw new Error('AI service authentication failed. Please check provider credentials.');
      }
      if (response.status === 429) {
        throw new Error('AI service rate limit exceeded. Please try again shortly.');
      }
      if (response.status === 502 || response.status === 503) {
        throw new Error(
          'AI upstream provider is temporarily unavailable. Please try again shortly.',
        );
      }
      throw new Error(`AI service provider error: ${errorDetails}`);
    }

    let data: GroqChatCompletionResponse;
    try {
      data = (await response.json()) as GroqChatCompletionResponse;
    } catch {
      this.logger.error('Groq returned malformed JSON response');
      throw new Error('AI service returned an invalid response. Please try again.');
    }

    const choice = data.choices?.[0];
    const generatedText = choice?.message?.content?.trim() ?? '';

    if (!generatedText) {
      this.logger.warn('Groq returned empty completion text');
      throw new Error('AI service returned an empty response. Please try again.');
    }

    const promptTokens =
      data.usage?.prompt_tokens ?? Math.max(1, Math.ceil(JSON.stringify(messages).length / 4));
    const completionTokens =
      data.usage?.completion_tokens ?? Math.max(1, Math.ceil(generatedText.length / 4));
    const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;

    return {
      content: generatedText,
      provider: GROQ_AI_PROVIDER_NAME,
      model,
      latencyMs,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      finishReason: choice?.finish_reason ?? 'stop',
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

  private formatMessages(request: AIProviderRequest): Array<{ role: string; content: string }> {
    const formatted: Array<{ role: string; content: string }> = [];

    const systemInstruction = this.buildSystemInstruction(request);
    if (systemInstruction && systemInstruction.trim().length > 0) {
      formatted.push({
        role: 'system',
        content: systemInstruction.trim(),
      });
    }

    const validMessages = request.messages.filter((m) => m.content && m.content.trim().length > 0);

    for (const msg of validMessages) {
      const role =
        msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user';
      formatted.push({
        role,
        content: msg.content.trim(),
      });
    }

    if (formatted.length === 0 || !formatted.some((m) => m.role === 'user')) {
      formatted.push({
        role: 'user',
        content: 'Hello',
      });
    }

    return formatted;
  }
}
