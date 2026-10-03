/**
 * MANVIA AI Companion Domain Types & Backend Contracts
 * Mirrors authoritative backend AI module specifications:
 * - Module: backend/src/modules/ai
 * - Controller: backend/src/modules/ai/controllers/ai-companion.controller.ts
 */

export enum AIConversationStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
}

export enum AIMessageRole {
  USER = "USER",
  ASSISTANT = "ASSISTANT",
  SYSTEM = "SYSTEM",
}

export enum AIMessageStatus {
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
}

export enum AIFeedbackRating {
  POSITIVE = "POSITIVE",
  NEGATIVE = "NEGATIVE",
}

export interface AICitationDto {
  sourceId: string;
  title: string;
  organization: string;
  documentId: string;
  relevance: number;
  snippet: string;
}

export interface AIMessageGenerationMetadataDto {
  provider: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason?: string | null;
  correlationId?: string | null;
  isAiGenerated: boolean;
  disclosureNotice: string;
}

export interface AIMessageResponseDto {
  id: string;
  publicMessageId: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  status: AIMessageStatus;
  isAiGenerated: boolean;
  generation?: AIMessageGenerationMetadataDto | null;
  citations?: AICitationDto[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIConversationResponseDto {
  id: string;
  publicConversationId: string;
  userId: string;
  title: string;
  status: AIConversationStatus;
  lastMessageAt: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAIConversationsResponseDto {
  data: AIConversationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AIConversationDetailResponseDto {
  conversation: AIConversationResponseDto;
  messages: AIMessageResponseDto[];
}

export interface CreateAIConversationDto {
  title?: string;
}

export interface SendAIMessageDto {
  content: string;
  locale?: string;
}

export interface SendAIMessageResponseDto {
  userMessage: AIMessageResponseDto;
  assistantMessage: AIMessageResponseDto;
  medicalContextUsed?: boolean;
  citations?: AICitationDto[];
  safetyClassification?: string;
  safetyAction?: string;
}

export interface SubmitAIFeedbackDto {
  rating: AIFeedbackRating;
  comment?: string;
}

export interface AIFeedbackResponseDto {
  id: string;
  messageId: string;
  userId: string;
  rating: AIFeedbackRating;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const AI_DISCLOSURE_NOTICE =
  "MANVIA AI Companion provides health and wellness information for educational and informational purposes only. It is not a doctor, cannot provide clinical diagnosis, and cannot prescribe medication. Always consult a licensed healthcare professional for medical concerns or emergencies.";

export const MAX_MESSAGE_CONTENT_LENGTH = 4000;
