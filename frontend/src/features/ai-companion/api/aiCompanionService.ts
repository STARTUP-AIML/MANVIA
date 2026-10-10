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
  ProcessAttachmentDto,
  ProcessAttachmentResponseDto,
  SendAIMessageDto,
  SendAIMessageResponseDto,
  SubmitAIFeedbackDto,
  TranscribeAudioDto,
  TranscribeAudioResponseDto,
  UpdateAIConversationDto,
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
   * Updates or renames an AI Companion conversation.
   */
  async updateConversation(
    conversationId: string,
    data: UpdateAIConversationDto,
  ): Promise<AIConversationResponseDto> {
    return apiClient.patch<AIConversationResponseDto>(
      `ai/conversations/${conversationId}`,
      data,
    );
  },

  /**
   * Transcribes recorded speech audio into text using backend Groq Whisper.
   */
  async transcribeAudio(
    data: TranscribeAudioDto,
  ): Promise<TranscribeAudioResponseDto> {
    return apiClient.post<TranscribeAudioResponseDto>("ai/transcribe", data);
  },

  /**
   * Processes and extracts plain text from supported document attachments.
   */
  async processAttachment(
    data: ProcessAttachmentDto,
  ): Promise<ProcessAttachmentResponseDto> {
    return apiClient.post<ProcessAttachmentResponseDto>(
      "ai/attachments/process",
      data,
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
