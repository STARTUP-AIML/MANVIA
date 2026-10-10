/**
 * MANVIA Chat Message Item Component
 * Renders individual user messages or AI companion responses with role-specific styling,
 * GitHub Flavored Markdown rendering, scrollable tables, timestamps, medical citations,
 * copy response utility, and feedback controls.
 */

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/Badge";
import {
  AIFeedbackRating,
  AIMessageRole,
  type AIMessageResponseDto,
} from "../types";
import { useSubmitFeedbackMutation } from "@/features/ai-companion/hooks/useAiCompanion";

export interface ChatMessageItemProps {
  message: AIMessageResponseDto;
  isPlaying?: boolean;
  onPlaySpeech?: (text: string, messageId: string) => void;
  onStopSpeech?: () => void;
  voiceEnabled?: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isPlaying = false,
  onPlaySpeech,
  onStopSpeech,
  voiceEnabled = true,
}) => {
  const isAssistant = message.role === AIMessageRole.ASSISTANT;
  const isUser = message.role === AIMessageRole.USER;

  const [showCitations, setShowCitations] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<AIFeedbackRating | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
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
        marginBottom: "var(--space-5)",
        maxWidth: "100%",
        width: "100%",
      }}
    >
      {/* Sender Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-1)",
          paddingLeft: isUser ? 0 : "var(--space-1)",
          paddingRight: isUser ? "var(--space-1)" : 0,
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            color: isUser ? "var(--color-primary)" : "var(--color-text-secondary)",
          }}
        >
          {isUser ? "You" : "MANVIA AI"}
        </span>

        {isAssistant && (
          <Badge
            variant="neutral"
            style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px" }}
          >
            AI · Non-Diagnostic
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
          maxWidth: isUser ? "80%" : "92%",
          width: isUser ? "auto" : "100%",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-lg)",
          borderTopRightRadius: isUser ? "var(--radius-xs)" : "var(--radius-lg)",
          borderTopLeftRadius: isAssistant ? "var(--radius-xs)" : "var(--radius-lg)",
          backgroundColor: isUser ? "var(--color-primary)" : "var(--color-bg-surface)",
          color: isUser ? "#ffffff" : "var(--color-text-primary)",
          border: isUser
            ? "1px solid var(--color-primary)"
            : "1px solid var(--color-border-subtle)",
          boxShadow: isUser ? "0 1px 3px rgba(0,0,0,0.1)" : "0 1px 2px rgba(0,0,0,0.05)",
          wordBreak: "break-word",
          lineHeight: 1.6,
          fontSize: "var(--font-size-sm)",
          overflowWrap: "anywhere",
        }}
        data-testid="message-content"
      >
        {isAssistant ? (
          <div className="manvia-markdown-body" style={{ overflowX: "auto" }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p style={{ margin: "0.5rem 0", lineHeight: 1.6 }}>{children}</p>
                ),
                h1: ({ children }) => (
                  <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0.75rem 0 0.5rem", color: "var(--color-text-primary)" }}>{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0.65rem 0 0.4rem", color: "var(--color-text-primary)" }}>{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0.5rem 0 0.35rem", color: "var(--color-text-primary)" }}>{children}</h3>
                ),
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: "1.25rem", margin: "0.5rem 0" }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ paddingLeft: "1.25rem", margin: "0.5rem 0" }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ margin: "0.25rem 0" }}>{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote style={{
                    borderLeft: "3px solid var(--color-primary)",
                    margin: "0.5rem 0",
                    paddingLeft: "0.75rem",
                    color: "var(--color-text-secondary)",
                    fontStyle: "italic",
                    backgroundColor: "var(--color-bg-subtle)",
                    padding: "4px 8px 4px 12px",
                    borderRadius: "0 4px 4px 0",
                  }}>{children}</blockquote>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--color-primary)", textDecoration: "underline", fontWeight: 500 }}
                  >
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div
                    style={{
                      overflowX: "auto",
                      margin: "0.75rem 0",
                      maxWidth: "100%",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <table
                      style={{
                        borderCollapse: "collapse",
                        width: "100%",
                        fontSize: "0.85rem",
                        textAlign: "left",
                      }}
                    >
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th
                    style={{
                      borderBottom: "2px solid var(--color-border-subtle)",
                      backgroundColor: "var(--color-bg-subtle)",
                      padding: "8px 12px",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td
                    style={{
                      borderBottom: "1px solid var(--color-border-subtle)",
                      padding: "8px 12px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {children}
                  </td>
                ),
                pre: ({ children }) => (
                  <div
                    style={{
                      margin: "0.75rem 0",
                      borderRadius: "6px",
                      overflow: "hidden",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <pre
                      style={{
                        overflowX: "auto",
                        padding: "10px 14px",
                        backgroundColor: "#1e293b",
                        color: "#f8fafc",
                        fontSize: "0.82rem",
                        margin: 0,
                        fontFamily: "monospace",
                      }}
                    >
                      {children}
                    </pre>
                  </div>
                ),
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code
                      style={{
                        backgroundColor: "var(--color-bg-subtle)",
                        color: "var(--color-primary)",
                        padding: "2px 5px",
                        borderRadius: "4px",
                        fontSize: "0.85em",
                        fontFamily: "monospace",
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {message.content}
          </div>
        )}
      </div>

      {/* Assistant Evidence Citations */}
      {isAssistant && message.citations && message.citations.length > 0 && (
        <div
          style={{
            marginTop: "var(--space-2)",
            maxWidth: "92%",
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
              fontWeight: 500,
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
                      idx < message.citations!.length - 1 ? "var(--space-2)" : 0,
                    paddingBottom:
                      idx < message.citations!.length - 1 ? "var(--space-2)" : 0,
                    borderBottom:
                      idx < message.citations!.length - 1
                        ? "1px dashed var(--color-border-subtle)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
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

      {/* Assistant Utility and Feedback Controls */}
      {isAssistant && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-2)",
            paddingLeft: "var(--space-1)",
          }}
        >
          {/* Copy Response Button */}
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy assistant response"
            title="Copy response to clipboard"
            style={{
              background: "none",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "var(--font-size-xs)",
              padding: "2px 8px",
              color: copied ? "var(--color-success)" : "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            <span>{copied ? "✓" : "📋"}</span>
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          {/* Read Aloud / Audio Playback Button */}
          {onPlaySpeech && (
            <button
              type="button"
              onClick={() => {
                if (isPlaying) {
                  onStopSpeech?.();
                } else {
                  onPlaySpeech(message.content, message.id);
                }
              }}
              disabled={!voiceEnabled && !isPlaying}
              aria-label={isPlaying ? "Stop spoken audio" : "Read assistant response aloud"}
              title={isPlaying ? "Stop audio" : voiceEnabled ? "Read response aloud" : "Voice output disabled"}
              data-testid={`speech-btn-${message.id}`}
              style={{
                background: isPlaying ? "var(--color-primary-subtle, #e0f2fe)" : "none",
                border: isPlaying
                  ? "1px solid var(--color-primary, #0284c7)"
                  : "1px solid var(--color-border-subtle)",
                borderRadius: "4px",
                cursor: !voiceEnabled && !isPlaying ? "not-allowed" : "pointer",
                fontSize: "var(--font-size-xs)",
                padding: "2px 8px",
                color: isPlaying
                  ? "var(--color-primary, #0284c7)"
                  : !voiceEnabled
                    ? "var(--color-text-disabled, #cbd5e1)"
                    : "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "color 0.15s, border-color 0.15s, background-color 0.15s",
              }}
            >
              <span>{isPlaying ? "⏹" : "🔊"}</span>
              <span>{isPlaying ? "Stop" : "Read Aloud"}</span>
            </button>
          )}

          {/* Feedback Rating */}
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
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
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
                  padding: "2px 6px",
                  color: "var(--color-text-muted)",
                  borderRadius: "4px",
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
                  padding: "2px 6px",
                  color: "var(--color-text-muted)",
                  borderRadius: "4px",
                }}
              >
                👎
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
