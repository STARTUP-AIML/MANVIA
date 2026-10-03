/**
 * MANVIA Message Composer Component
 * High-quality message input with accessible controls, keyboard dispatch (Enter to send,
 * Shift+Enter for newline), character constraint counter, and mobile-friendly layout.
 */

import React, {
  useState,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/Button";
import { MAX_MESSAGE_CONTENT_LENGTH } from "../types";

export interface MessageComposerProps {
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isLoading = false,
  disabled = false,
}) => {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmedContent = content.trim();
  const isOverLimit = content.length > MAX_MESSAGE_CONTENT_LENGTH;
  const canSend =
    trimmedContent.length > 0 && !isOverLimit && !isLoading && !disabled;

  const handleSubmit = (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!canSend) return;

    onSendMessage(trimmedContent);
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Auto-adjust height up to max
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="manvia-message-composer"
      data-testid="message-composer-form"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-3) var(--space-4)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "var(--space-2)",
        }}
      >
        <div style={{ flex: 1, position: "relative" }}>
          <label htmlFor="ai-message-input" className="visually-hidden">
            Message MANVIA AI
          </label>
          <textarea
            ref={textareaRef}
            id="ai-message-input"
            rows={1}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            placeholder="Ask MANVIA AI a wellness question... (Press Enter to send)"
            style={{
              width: "100%",
              resize: "none",
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              color: "var(--color-text-primary)",
              fontSize: "var(--font-size-sm)",
              lineHeight: "var(--line-height-normal)",
              fontFamily: "inherit",
              padding: "var(--space-2) 0",
              minHeight: "24px",
              maxHeight: "160px",
              overflowY: "auto",
            }}
            data-testid="message-composer-input"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!canSend}
          isLoading={isLoading}
          data-testid="send-message-btn"
          aria-label="Send message"
          style={{
            borderRadius: "var(--radius-full)",
            minWidth: "40px",
            height: "40px",
            padding: "0 var(--space-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!isLoading && (
            <span style={{ fontSize: "1rem" }} aria-hidden="true">
              ➤
            </span>
          )}
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.7rem",
          color: isOverLimit
            ? "var(--color-danger)"
            : "var(--color-text-muted)",
          paddingTop: "var(--space-1)",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <span>Enter to send • Shift+Enter for new line</span>
        <span data-testid="character-counter">
          {content.length} / {MAX_MESSAGE_CONTENT_LENGTH}
        </span>
      </div>
    </form>
  );
};
