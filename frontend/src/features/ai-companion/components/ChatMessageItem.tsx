/**
 * MANVIA Chat Message Item Component
 * Renders individual user messages or AI companion responses with role-specific styling,
 * timestamps, medical evidence citations, and feedback actions.
 */

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import {
  AIFeedbackRating,
  AIMessageRole,
  type AIMessageResponseDto,
} from "../types";
import { useSubmitFeedbackMutation } from '@/features/ai-companion/hooks/useAiCompanion';

export interface ChatMessageItemProps {
  message: AIMessageResponseDto;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
}) => {
  const isAssistant = message.role === AIMessageRole.ASSISTANT;
  const isUser = message.role === AIMessageRole.USER;

  const [showCitations, setShowCitations] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<AIFeedbackRating | null>(
    null,
  );

  const feedbackMutation = useSubmitFeedbackMutation();

  const handleFeedback = (rating: AIFeedbackRating) => {
    if (feedbackSent || feedbackMutation.isPending) return;
    feedbackMutation.mutate(
      {
        messageId: message.id,
        data: { rating },
      },
      {
        onSuccess: () => {
          setFeedbackSent(rating);
        },
      },
    );
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article
      className={`manvia-chat-message ${isUser ? "manvia-chat-message-user" : "manvia-chat-message-assistant"}`}
      aria-label={`${isUser ? "User message" : "MANVIA AI response"} at ${formattedTime}`}
      data-testid={`chat-message-${message.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: "var(--space-4)",
        maxWidth: "100%",
      }}
    >
      {/* Sender Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-1)",
          paddingLeft: isUser ? 0 : "var(--space-2)",
          paddingRight: isUser ? "var(--space-2)" : 0,
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-secondary)",
          }}
        >
          {isUser ? "You" : "MANVIA AI"}
        </span>

        {isAssistant && (
          <Badge
            variant="neutral"
            style={{ fontSize: "0.65rem", padding: "1px 6px" }}
          >
            Automated
          </Badge>
        )}

        <time
          dateTime={message.createdAt}
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
          }}
        >
          {formattedTime}
        </time>
      </div>

      {/* Message Bubble */}
      <div
        style={{
          maxWidth: "80%",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-lg)",
          borderTopRightRadius: isUser
            ? "var(--radius-sm)"
            : "var(--radius-lg)",
          borderTopLeftRadius: isAssistant
            ? "var(--radius-sm)"
            : "var(--radius-lg)",
          backgroundColor: isUser
            ? "var(--color-primary)"
            : "var(--color-bg-surface-elevated)",
          color: isUser ? "#ffffff" : "var(--color-text-primary)",
          border: isUser
            ? "1px solid var(--color-primary)"
            : "1px solid var(--color-border-subtle)",
          boxShadow: "var(--shadow-sm)",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          lineHeight: "var(--line-height-relaxed)",
          fontSize: "var(--font-size-sm)",
        }}
        data-testid="message-content"
      >
        {message.content}
      </div>

      {/* Assistant Evidence Citations */}
      {isAssistant && message.citations && message.citations.length > 0 && (
        <div
          style={{
            marginTop: "var(--space-2)",
            maxWidth: "80%",
            fontSize: "var(--font-size-xs)",
          }}
          data-testid="citations-container"
        >
          <button
            type="button"
            onClick={() => setShowCitations(!showCitations)}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary)",
              cursor: "pointer",
              padding: 0,
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
            }}
            aria-expanded={showCitations}
          >
            <span>📚</span>
            <span>
              {showCitations
                ? "Hide Medical Citations"
                : `View Evidence Citations (${message.citations.length})`}
            </span>
          </button>

          {showCitations && (
            <div
              style={{
                marginTop: "var(--space-2)",
                padding: "var(--space-3)",
                backgroundColor: "var(--color-bg-subtle)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-subtle)",
              }}
              data-testid="citations-list"
            >
              {message.citations.map((citation, idx) => (
                <div
                  key={`${citation.documentId}-${idx}`}
                  style={{
                    marginBottom:
                      idx < message.citations!.length - 1
                        ? "var(--space-2)"
                        : 0,
                    paddingBottom:
                      idx < message.citations!.length - 1
                        ? "var(--space-2)"
                        : 0,
                    borderBottom:
                      idx < message.citations!.length - 1
                        ? "1px dashed var(--color-border-subtle)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {citation.title}
                  </div>
                  <div
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: "0.7rem",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    Source: {citation.organization} • Ref: {citation.documentId}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--color-text-secondary)",
                      fontStyle: "italic",
                    }}
                  >
                    &ldquo;{citation.snippet}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assistant Feedback Controls */}
      {isAssistant && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginTop: "var(--space-1)",
            paddingLeft: "var(--space-2)",
          }}
        >
          {feedbackSent ? (
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-success)",
              }}
              data-testid="feedback-success"
            >
              ✓ Thank you for your feedback
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleFeedback(AIFeedbackRating.POSITIVE)}
                disabled={feedbackMutation.isPending}
                aria-label="Helpful response"
                title="Helpful response"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "var(--font-size-xs)",
                  padding: "var(--space-1)",
                  color: "var(--color-text-muted)",
                }}
              >
                👍
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(AIFeedbackRating.NEGATIVE)}
                disabled={feedbackMutation.isPending}
                aria-label="Unhelpful response"
                title="Unhelpful response"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "var(--font-size-xs)",
                  padding: "var(--space-1)",
                  color: "var(--color-text-muted)",
                }}
              >
                👎
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
};
