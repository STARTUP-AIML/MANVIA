/**
 * MANVIA AI Companion TanStack Query Server-State Hooks
 * Handles conversation listing, active thread detail, optimistic message dispatch,
 * cache reconciliation, and feedback submission.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { aiCompanionService } from '@/features/ai-companion/api/aiCompanionService';
import {
  AIMessageRole,
  AIMessageStatus,
  type AIConversationDetailResponseDto,
  type AIConversationResponseDto,
  type AIConversationStatus,
  type AIFeedbackResponseDto,
  type CreateAIConversationDto,
  type PaginatedAIConversationsResponseDto,
  type SendAIMessageDto,
  type SendAIMessageResponseDto,
  type SubmitAIFeedbackDto,
} from "../types";
import type { ApiError } from "@/api/errors/apiError";

export const AI_QUERY_KEYS = {
  all: ["ai"] as const,
  conversations: (params?: {
    page?: number;
    limit?: number;
    status?: AIConversationStatus;
  }) => ["ai", "conversations", params] as const,
  conversation: (id: string) => ["ai", "conversation", id] as const,
};

/**
 * Hook to retrieve paginated AI conversation sessions.
 */
export function useAiConversationsQuery(params?: {
  page?: number;
  limit?: number;
  status?: AIConversationStatus;
}): UseQueryResult<PaginatedAIConversationsResponseDto, ApiError> {
  return useQuery<PaginatedAIConversationsResponseDto, ApiError>({
    queryKey: AI_QUERY_KEYS.conversations(params),
    queryFn: () => aiCompanionService.listConversations(params),
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

/**
 * Hook to retrieve full message history and metadata for a specific conversation.
 */
export function useAiConversationQuery(
  conversationId?: string,
): UseQueryResult<AIConversationDetailResponseDto, ApiError> {
  return useQuery<AIConversationDetailResponseDto, ApiError>({
    queryKey: AI_QUERY_KEYS.conversation(conversationId || ""),
    queryFn: () => aiCompanionService.getConversation(conversationId!),
    enabled: Boolean(conversationId && conversationId.trim().length > 0),
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to initialize a new AI Companion conversation session.
 */
export function useCreateConversationMutation(): UseMutationResult<
  AIConversationResponseDto,
  ApiError,
  CreateAIConversationDto | undefined
> {
  const queryClient = useQueryClient();

  return useMutation<
    AIConversationResponseDto,
    ApiError,
    CreateAIConversationDto | undefined
  >({
    mutationFn: (dto) => aiCompanionService.createConversation(dto),
    onSuccess: (newConversation) => {
      // Invalidate conversations list so new session appears
      queryClient.invalidateQueries({
        queryKey: ["ai", "conversations"],
      });
      // Pre-seed the conversation detail cache
      queryClient.setQueryData<AIConversationDetailResponseDto>(
        AI_QUERY_KEYS.conversation(newConversation.id),
        {
          conversation: newConversation,
          messages: [],
        },
      );
    },
  });
}

/**
 * Hook to send a message to the AI Companion with optimistic state update
 * and reliable server reconciliation.
 */
export function useSendAiMessageMutation(): UseMutationResult<
  SendAIMessageResponseDto,
  ApiError,
  { conversationId: string; data: SendAIMessageDto },
  { previousDetail?: AIConversationDetailResponseDto; conversationId: string }
> {
  const queryClient = useQueryClient();

  return useMutation<
    SendAIMessageResponseDto,
    ApiError,
    { conversationId: string; data: SendAIMessageDto },
    { previousDetail?: AIConversationDetailResponseDto; conversationId: string }
  >({
    mutationFn: ({ conversationId, data }) =>
      aiCompanionService.sendMessage(conversationId, data),
    onMutate: async ({ conversationId, data }) => {
      // Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({
        queryKey: AI_QUERY_KEYS.conversation(conversationId),
      });

      // Snapshot previous value for rollback on failure
      const previousDetail =
        queryClient.getQueryData<AIConversationDetailResponseDto>(
          AI_QUERY_KEYS.conversation(conversationId),
        );

      // Optimistically append user message
      if (previousDetail) {
        const optimisticUserMessage = {
          id: `temp-${Date.now()}`,
          publicMessageId: `AIM-TEMP-${Date.now()}`,
          conversationId,
          role: AIMessageRole.USER,
          content: data.content,
          status: AIMessageStatus.SENT,
          isAiGenerated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData<AIConversationDetailResponseDto>(
          AI_QUERY_KEYS.conversation(conversationId),
          {
            ...previousDetail,
            messages: [...previousDetail.messages, optimisticUserMessage],
          },
        );
      }

      return { previousDetail, conversationId };
    },
    onError: (_err, variables, context) => {
      // Revert back to snapshot if mutation failed
      if (context?.previousDetail) {
        queryClient.setQueryData<AIConversationDetailResponseDto>(
          AI_QUERY_KEYS.conversation(variables.conversationId),
          context.previousDetail,
        );
      }
    },
    onSuccess: (response, variables) => {
      // Reconcile optimistic user message and append assistant response
      const current = queryClient.getQueryData<AIConversationDetailResponseDto>(
        AI_QUERY_KEYS.conversation(variables.conversationId),
      );

      if (current) {
        // Filter out temporary optimistic message and append authoritative server messages
        const filteredMessages = current.messages.filter(
          (m) => !m.id.startsWith("temp-"),
        );

        // Check if userMessage is already in the list
        const hasUserMessage = filteredMessages.some(
          (m) => m.id === response.userMessage.id,
        );
        const hasAssistantMessage = filteredMessages.some(
          (m) => m.id === response.assistantMessage.id,
        );

        const updatedMessages = [...filteredMessages];
        if (!hasUserMessage) {
          updatedMessages.push(response.userMessage);
        }
        if (!hasAssistantMessage) {
          updatedMessages.push(response.assistantMessage);
        }

        queryClient.setQueryData<AIConversationDetailResponseDto>(
          AI_QUERY_KEYS.conversation(variables.conversationId),
          {
            ...current,
            messages: updatedMessages,
          },
        );
      } else {
        // If not present in cache, invalidate
        queryClient.invalidateQueries({
          queryKey: AI_QUERY_KEYS.conversation(variables.conversationId),
        });
      }

      // Refresh conversations list to update lastMessageAt
      queryClient.invalidateQueries({
        queryKey: ["ai", "conversations"],
      });
    },
  });
}

/**
 * Hook to delete or archive a conversation.
 */
export function useDeleteConversationMutation(): UseMutationResult<
  { success: boolean; id: string },
  ApiError,
  string
> {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; id: string }, ApiError, string>({
    mutationFn: (conversationId) =>
      aiCompanionService.deleteConversation(conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.removeQueries({
        queryKey: AI_QUERY_KEYS.conversation(conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: ["ai", "conversations"],
      });
    },
  });
}

/**
 * Hook to submit feedback on an AI assistant response.
 */
export function useSubmitFeedbackMutation(): UseMutationResult<
  AIFeedbackResponseDto,
  ApiError,
  { messageId: string; data: SubmitAIFeedbackDto }
> {
  return useMutation<
    AIFeedbackResponseDto,
    ApiError,
    { messageId: string; data: SubmitAIFeedbackDto }
  >({
    mutationFn: ({ messageId, data }) =>
      aiCompanionService.submitFeedback(messageId, data),
  });
}
