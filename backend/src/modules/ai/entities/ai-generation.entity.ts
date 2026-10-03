export interface AIMessageGenerationEntity {
  id: string;
  messageId: string;
  provider: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string | null;
  correlationId: string | null;
  isAiGenerated: boolean;
  disclosureNotice: string;
  createdAt: Date;
}
