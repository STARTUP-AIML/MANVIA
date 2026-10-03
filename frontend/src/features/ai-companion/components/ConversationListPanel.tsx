/**
 * MANVIA AI Conversation List Panel
 * Provides quick switching between previous AI companion sessions
 * and an action to initialize a new conversation.
 */

import React from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AIConversationResponseDto } from "../types";

export interface ConversationListPanelProps {
  conversations: AIConversationResponseDto[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  isCreating?: boolean;
}

export const ConversationListPanel: React.FC<ConversationListPanelProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  isCreating = false,
}) => {
  return (
    <nav
      className="manvia-conversation-list-panel"
      aria-label="Previous AI Conversations"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        height: "100%",
      }}
      data-testid="conversation-list-panel"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-2)",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-secondary)",
          }}
        >
          Conversations ({conversations.length})
        </h3>

        <Button
          variant="outline"
          size="sm"
          onClick={onNewConversation}
          isLoading={isCreating}
          data-testid="new-conversation-btn"
          aria-label="Start new conversation"
        >
          + New Chat
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1)",
          overflowY: "auto",
          flex: 1,
        }}
        role="list"
      >
        {conversations.length === 0 ? (
          <div
            style={{
              padding: "var(--space-4) var(--space-2)",
              textAlign: "center",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
            }}
          >
            No previous conversations.
          </div>
        ) : (
          conversations.map((c) => {
            const isActive =
              c.id === activeConversationId ||
              c.publicConversationId === activeConversationId;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectConversation(c.id)}
                role="listitem"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: isActive
                    ? "1px solid var(--color-primary)"
                    : "1px solid transparent",
                  backgroundColor: isActive
                    ? "var(--color-primary-subtle)"
                    : "transparent",
                  color: isActive
                    ? "var(--color-primary-dark)"
                    : "var(--color-text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all var(--transition-fast)",
                }}
                data-testid={`conversation-item-${c.id}`}
                aria-current={isActive ? "true" : undefined}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                    gap: "var(--space-1)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      fontWeight: isActive
                        ? "var(--font-weight-semibold)"
                        : "var(--font-weight-medium)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.title || "Wellness Conversation"}
                  </span>
                  <Badge
                    variant="neutral"
                    style={{ fontSize: "0.6rem", padding: "0 4px" }}
                  >
                    {c.publicConversationId}
                  </Badge>
                </div>

                <span
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--color-text-muted)",
                    marginTop: "2px",
                  }}
                >
                  {new Date(c.lastMessageAt || c.createdAt).toLocaleDateString(
                    [],
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </nav>
  );
};
