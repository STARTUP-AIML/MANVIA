/**
 * MANVIA AI Companion API Service
 * Interacts with authoritative backend endpoints:
 * - GET /api/v1/ai/conversations
 * - POST /api/v1/ai/conversations
 * - GET /api/v1/ai/conversations/:conversationId
 * - POST /api/v1/ai/conversations/:conversationId/messages
 * - DELETE /api/v1/ai/conversations/:conversationId
 * - POST /api/v1/ai/messages/:messageId/feedback
 */

import { apiClient } from "@/api/client/apiClient";
import type {
  AIConversationDetailResponseDto,
  AIConversationResponseDto,
  AIConversationStatus,
  AIFeedbackResponseDto,
  CreateAIConversationDto,
  PaginatedAIConversationsResponseDto,
  SendAIMessageDto,
  SendAIMessageResponseDto,
  SubmitAIFeedbackDto,
} from "../types";

export const aiCompanionService = {
  /**
   * Lists the authenticated patient's AI conversations.
   */
  async listConversations(params?: {
    page?: number;
    limit?: number;
    status?: AIConversationStatus;
  }): Promise<PaginatedAIConversationsResponseDto> {
    return apiClient.get<PaginatedAIConversationsResponseDto>(
      "ai/conversations",
      {
        params,
      },
    );
  },

  /**
   * Retrieves conversation details and chronological message history.
   */
  async getConversation(
    conversationId: string,
  ): Promise<AIConversationDetailResponseDto> {
    return apiClient.get<AIConversationDetailResponseDto>(
      `ai/conversations/${conversationId}`,
    );
  },

  /**
   * Creates a new AI Companion conversation session.
   */
  async createConversation(
    data?: CreateAIConversationDto,
  ): Promise<AIConversationResponseDto> {
    return apiClient.post<AIConversationResponseDto>(
      "ai/conversations",
      data || {},
    );
  },

  /**
   * Sends a message within an existing AI Companion conversation session.
   */
  async sendMessage(
    conversationId: string,
    data: SendAIMessageDto,
  ): Promise<SendAIMessageResponseDto> {
    return apiClient.post<SendAIMessageResponseDto>(
      `ai/conversations/${conversationId}/messages`,
      data,
    );
  },

  /**
   * Archives or soft-deletes an AI Companion conversation.
   */
  async deleteConversation(
    conversationId: string,
  ): Promise<{ success: boolean; id: string }> {
    return apiClient.delete<{ success: boolean; id: string }>(
      `ai/conversations/${conversationId}`,
    );
  },

  /**
   * Submits user feedback (thumbs up / down) on an assistant message.
   */
  async submitFeedback(
    messageId: string,
    data: SubmitAIFeedbackDto,
  ): Promise<AIFeedbackResponseDto> {
    return apiClient.post<AIFeedbackResponseDto>(
      `ai/messages/${messageId}/feedback`,
      data,
    );
  },
};
