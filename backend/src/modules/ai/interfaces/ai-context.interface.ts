import type { AIProviderMessage } from './ai-provider.interface.js';

export interface AIContextPayload {
  systemInstruction: string;
  messages: AIProviderMessage[];
  userContext: {
    userId: string;
    locale?: string | undefined;
    preferredName?: string | undefined;
  };
}

export interface BuildContextOptions {
  historyLimit?: number | undefined;
  locale?: string | undefined;
  preferredName?: string | undefined;
  additionalInstructions?: string | undefined;
}
