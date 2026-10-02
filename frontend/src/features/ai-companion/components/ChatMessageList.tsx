/**
 * MANVIA Chat Message List Component
 * Renders chronological message stream, automatic scroll-to-bottom anchor,
 * and accessible loading states while assistant is generating responses.
 */

import React, { useEffect, useRef } from "react";
import { ChatMessageItem } from "./ChatMessageItem";
import { Spinner } from "@/components/ui/Spinner";
import type { AIMessageResponseDto } from "../types";

export interface ChatMessageListProps {
  messages: AIMessageResponseDto[];
  isSending?: boolean;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isSending = false,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending]);

  return (
    <div
      className="manvia-chat-message-list"
      role="log"
      aria-label="Conversation with MANVIA AI"
      aria-live="polite"
      data-testid="chat-message-list"
      style={{
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        flex: 1,
        padding: "var(--space-4) 0",
      }}
    >
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} />
      ))}

      {/* Sending / Processing indicator */}
      {isSending && (
        <div
          role="status"
          aria-live="polite"
          data-testid="ai-thinking-indicator"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-4)",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-xs)",
            backgroundColor: "var(--color-bg-surface-elevated)",
            borderRadius: "var(--radius-lg)",
            alignSelf: "flex-start",
            marginBottom: "var(--space-2)",
          }}
        >
          <Spinner size="sm" />
          <span>MANVIA AI is thinking...</span>
        </div>
      )}

      <div ref={bottomRef} style={{ height: "1px" }} aria-hidden="true" />
    </div>
  );
};
