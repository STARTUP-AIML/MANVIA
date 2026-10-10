/**
 * MANVIA Chat Message List Component
 * Renders chronological message stream, smart scroll-to-bottom anchor
 * (only auto-scrolls when user is near bottom or sending),
 * and typing/thinking indicator.
 */

import React, { useEffect, useRef } from "react";
import { ChatMessageItem } from "./ChatMessageItem";
import { Spinner } from "@/components/ui/Spinner";
import type { AIMessageResponseDto } from "../types";

export interface ChatMessageListProps {
  messages: AIMessageResponseDto[];
  isSending?: boolean;
  playingMessageId?: string | null;
  onPlaySpeech?: (text: string, messageId: string) => void;
  onStopSpeech?: () => void;
  voiceEnabled?: boolean;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isSending = false,
  playingMessageId = null,
  onPlaySpeech,
  onStopSpeech,
  voiceEnabled = true,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    // User is near bottom if within 150px
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  };

  useEffect(() => {
    // Scroll if near bottom or if isSending became true
    if (isNearBottomRef.current && typeof bottomRef.current?.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending]);

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
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
        padding: "var(--space-4) var(--space-4)",
        maxWidth: "840px",
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {messages.map((message) => (
        <ChatMessageItem
          key={message.id}
          message={message}
          isPlaying={playingMessageId === message.id}
          onPlaySpeech={onPlaySpeech}
          onStopSpeech={onStopSpeech}
          voiceEnabled={voiceEnabled}
        />
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
            padding: "8px 14px",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-xs)",
            backgroundColor: "#f1f5f9",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: "16px",
            alignSelf: "flex-start",
            marginBottom: "var(--space-2)",
          }}
        >
          <Spinner size="sm" />
          <span>MANVIA AI is generating response...</span>
        </div>
      )}

      <div ref={bottomRef} style={{ height: "1px" }} aria-hidden="true" />
    </div>
  );
};
