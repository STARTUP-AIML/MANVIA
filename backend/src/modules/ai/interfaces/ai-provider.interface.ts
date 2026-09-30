export interface AIProviderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProviderRequest {
  systemInstruction: string;
  messages: AIProviderMessage[];
  userContext?:
    | {
        userId: string;
        locale?: string | undefined;
        preferredName?: string | undefined;
      }
    | undefined;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  correlationId?: string | null | undefined;
}

export interface AIProviderTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIProviderResponse {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
  usage: AIProviderTokenUsage;
  finishReason: string;
  isAiGenerated: boolean;
  disclosureNotice: string;
}

export interface IAIProvider {
  generateResponse(request: AIProviderRequest): Promise<AIProviderResponse>;
}
