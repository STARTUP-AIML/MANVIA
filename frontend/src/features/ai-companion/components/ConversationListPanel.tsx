/**
 * MANVIA AI Conversation List Panel & Dedicated Sidebar
 * Features:
 * - MANVIA AI branding & Collapse/Expand control
 * - Prominent '+ New Chat' action
 * - Realtime search filtering
 * - Grouped history: Today, Yesterday, Previous 7 Days, Older
 * - Active item indicator with subtle teal accent
 * - Contextual Rename & Delete actions with confirmation
 * - Loading and empty states
 */

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { AIConversationResponseDto } from "../types";

export interface ConversationListPanelProps {
  conversations: AIConversationResponseDto[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onRenameConversation?: (conversationId: string, newTitle: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  isCreating?: boolean;
  isLoading?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type TimeGroup = "Today" | "Yesterday" | "Previous 7 Days" | "Older";

export const ConversationListPanel: React.FC<ConversationListPanelProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isCreating = false,
  isLoading = false,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter conversations by search term
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.publicConversationId.toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  // Group conversations chronologically
  const groupedConversations = useMemo(() => {
    const groups: Record<TimeGroup, AIConversationResponseDto[]> = {
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      Older: [],
    };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7Days = startOfToday - 7 * 86400000;

    for (const c of filteredConversations) {
      const time = new Date(c.lastMessageAt || c.createdAt).getTime();
      if (time >= startOfToday) {
        groups.Today.push(c);
      } else if (time >= startOfYesterday) {
        groups.Yesterday.push(c);
      } else if (time >= startOf7Days) {
        groups["Previous 7 Days"].push(c);
      } else {
        groups.Older.push(c);
      }
    }

    return groups;
  }, [filteredConversations]);

  const handleStartRename = (e: React.MouseEvent, c: AIConversationResponseDto) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title || "Wellness Conversation");
  };

  const handleSaveRename = (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (editTitle.trim() && onRenameConversation) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDeleteConversation) {
      onDeleteConversation(id);
    }
    setConfirmDeleteId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  if (isCollapsed) {
    return (
      <aside
        style={{
          width: "56px",
          height: "100%",
          backgroundColor: "#f8fafc",
          borderRight: "1px solid var(--color-border-subtle)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "var(--space-3) var(--space-1)",
          gap: "var(--space-3)",
          flexShrink: 0,
        }}
        aria-label="Collapsed AI Sidebar"
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          style={{
            background: "none",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: "6px",
            padding: "6px",
            cursor: "pointer",
            fontSize: "1rem",
            color: "var(--color-text-secondary)",
          }}
        >
          ➡️
        </button>
        <button
          type="button"
          onClick={onNewConversation}
          title="New Chat"
          aria-label="New Chat"
          style={{
            background: "var(--color-primary)",
            color: "#ffffff",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            cursor: "pointer",
            fontSize: "1.1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
      </aside>
    );
  }

  return (
    <nav
      className="manvia-ai-sidebar"
      aria-label="AI Conversation History"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "280px",
        minWidth: "260px",
        maxWidth: "320px",
        backgroundColor: "#f8fafc",
        borderRight: "1px solid var(--color-border-subtle)",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
      data-testid="conversation-list-panel"
    >
      {/* Sidebar Header & Collapse Toggle */}
      <div
        style={{
          padding: "var(--space-3) var(--space-3) var(--space-2)",
          borderBottom: "1px solid var(--color-border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "1.2rem" }}>🤖</span>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "var(--font-size-sm)",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                lineHeight: 1.2,
              }}
            >
              MANVIA Conversations
            </h2>
            <span
              style={{
                fontSize: "0.68rem",
                color: "var(--color-text-muted)",
              }}
            >
              Health Companion
            </span>
          </div>
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: "4px",
              fontSize: "0.9rem",
              color: "var(--color-text-muted)",
            }}
          >
            ◀
          </button>
        )}
      </div>

      {/* New Chat Action */}
      <div style={{ padding: "var(--space-3)" }}>
        <Button
          variant="primary"
          size="md"
          onClick={onNewConversation}
          isLoading={isCreating}
          data-testid="new-conversation-btn"
          aria-label="Start new conversation"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontWeight: 600,
            borderRadius: "8px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <span>+</span>
          <span>New Chat</span>
        </Button>
      </div>

      {/* Search Input */}
      <div style={{ padding: "0 var(--space-3) var(--space-2)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#ffffff",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: "6px",
            padding: "4px 8px",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            aria-label="Search conversation history"
            style={{
              border: "none",
              outline: "none",
              fontSize: "var(--font-size-xs)",
              width: "100%",
              backgroundColor: "transparent",
              color: "var(--color-text-primary)",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grouped Conversation Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-1) var(--space-2)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
        role="list"
      >
        {isLoading ? (
          <div
            style={{
              padding: "var(--space-6) var(--space-2)",
              textAlign: "center",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
            }}
          >
            Loading history...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div
            style={{
              padding: "var(--space-6) var(--space-2)",
              textAlign: "center",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
            }}
          >
            {searchQuery
              ? `No chats matching "${searchQuery}"`
              : "No conversation history yet. Start a new chat to begin!"}
          </div>
        ) : (
          (Object.keys(groupedConversations) as TimeGroup[]).map((groupName) => {
            const items = groupedConversations[groupName];
            if (items.length === 0) return null;

            return (
              <div key={groupName}>
                <div
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--color-text-muted)",
                    padding: "4px 8px",
                  }}
                >
                  {groupName}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {items.map((c) => {
                    const isActive =
                      c.id === activeConversationId ||
                      c.publicConversationId === activeConversationId;
                    const isEditing = editingId === c.id;
                    const isConfirmingDelete = confirmDeleteId === c.id;

                    if (isEditing) {
                      return (
                        <form
                          key={c.id}
                          onSubmit={(e) => handleSaveRename(e, c.id)}
                          style={{
                            padding: "4px 6px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            backgroundColor: "#ffffff",
                            borderRadius: "6px",
                            border: "1px solid var(--color-primary)",
                          }}
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            autoFocus
                            maxLength={100}
                            style={{
                              fontSize: "var(--font-size-xs)",
                              padding: "4px 6px",
                              border: "1px solid var(--color-border-subtle)",
                              borderRadius: "4px",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          />
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "4px" }}>
                            <button
                              type="button"
                              onClick={handleCancelRename}
                              style={{
                                fontSize: "0.7rem",
                                padding: "2px 6px",
                                background: "none",
                                border: "1px solid var(--color-border-subtle)",
                                borderRadius: "3px",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              style={{
                                fontSize: "0.7rem",
                                padding: "2px 8px",
                                backgroundColor: "var(--color-primary)",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              Save
                            </button>
                          </div>
                        </form>
                      );
                    }

                    if (isConfirmingDelete) {
                      return (
                        <div
                          key={c.id}
                          style={{
                            padding: "6px 8px",
                            backgroundColor: "#fef2f2",
                            border: "1px solid #f87171",
                            borderRadius: "6px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <div style={{ fontSize: "0.72rem", color: "#991b1b", fontWeight: 600 }}>
                            Delete conversation?
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "4px" }}>
                            <button
                              type="button"
                              onClick={handleCancelDelete}
                              style={{
                                fontSize: "0.68rem",
                                padding: "2px 6px",
                                background: "none",
                                border: "1px solid #d1d5db",
                                borderRadius: "3px",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleConfirmDelete(e, c.id)}
                              style={{
                                fontSize: "0.68rem",
                                padding: "2px 6px",
                                backgroundColor: "#ef4444",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={c.id}
                        role="listitem"
                        onClick={() => onSelectConversation(c.id)}
                        data-testid={`conversation-item-${c.id}`}
                        aria-current={isActive ? "true" : undefined}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          backgroundColor: isActive ? "#e6fffa" : "transparent",
                          borderLeft: isActive
                            ? "3px solid var(--color-primary)"
                            : "3px solid transparent",
                          cursor: "pointer",
                          transition: "background-color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = "#f1f5f9";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <div
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            marginRight: "6px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "var(--font-size-xs)",
                              fontWeight: isActive ? 600 : 500,
                              color: isActive ? "var(--color-primary)" : "var(--color-text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c.title || "Wellness Conversation"}
                          </div>
                        </div>

                        {/* Actions (Rename, Delete) */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                            flexShrink: 0,
                          }}
                        >
                          {onRenameConversation && (
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(e, c)}
                              title="Rename chat"
                              aria-label={`Rename ${c.title}`}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "2px 4px",
                                fontSize: "0.75rem",
                                color: "var(--color-text-muted)",
                                borderRadius: "3px",
                              }}
                            >
                              ✏️
                            </button>
                          )}
                          {onDeleteConversation && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(e, c.id)}
                              title="Delete chat"
                              aria-label={`Delete ${c.title}`}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "2px 4px",
                                fontSize: "0.75rem",
                                color: "var(--color-text-muted)",
                                borderRadius: "3px",
                              }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </nav>
  );
};
