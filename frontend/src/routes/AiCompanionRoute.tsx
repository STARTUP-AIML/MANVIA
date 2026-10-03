/**
 * MANVIA AI Companion Route (/app/ai and /app/ai/:conversationId)
 * Production-oriented text-chat interface connecting to the authoritative backend AI module.
 * Features:
 * - AI Disclosure Banner and Non-Diagnostic Badges
 * - Active thread persistence & message history retrieval
 * - Interactive Message Composer with Enter to send / Shift+Enter for newline
 * - Optimistic user message rendering and loading indicator
 * - Medical evidence citations and feedback
 * - Conversation switching and session creation
 * - Partial failure resilience and accessible live announcements
 */

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AiDisclosureBanner,
  ChatMessageList,
  MessageComposer,
  EmptyChatState,
  ConversationListPanel,
  useAiConversationsQuery,
  useAiConversationQuery,
  useCreateConversationMutation,
  useSendAiMessageMutation,
  AIConversationStatus,
} from "@/features/ai-companion";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export const AiCompanionRoute: React.FC = () => {
  const { conversationId: paramConversationId } = useParams<{
    conversationId?: string;
  }>();
  const navigate = useNavigate();

  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(paramConversationId);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // 1. Query all active conversations for the authenticated patient
  const conversationsQuery = useAiConversationsQuery({
    status: AIConversationStatus.ACTIVE,
  });

  const conversations = useMemo(
    () => conversationsQuery.data?.data || [],
    [conversationsQuery.data?.data],
  );

  // 2. Automatically select or synchronize active conversation
  useEffect(() => {
    if (paramConversationId) {
      setActiveConversationId(paramConversationId);
    } else if (conversations.length > 0 && !activeConversationId) {
      // Pick latest conversation
      const latest = conversations[0];
      if (latest) {
        setActiveConversationId(latest.id);
      }
    }
  }, [paramConversationId, conversations, activeConversationId]);

  // 3. Query active conversation details and chronological message history
  const activeDetailQuery = useAiConversationQuery(activeConversationId);
  const messages = activeDetailQuery.data?.messages || [];
  const currentConversation = activeDetailQuery.data?.conversation;

  // 4. Mutations
  const createMutation = useCreateConversationMutation();
  const sendMutation = useSendAiMessageMutation();

  // Handle new conversation creation
  const handleStartNewConversation = async () => {
    try {
      setSendError(null);
      const newConv = await createMutation.mutateAsync({
        title: "Wellness Conversation",
      });
      setActiveConversationId(newConv.id);
      navigate(`/app/ai/${newConv.id}`);
    } catch {
      setSendError(
        "Failed to initialize a new conversation session. Please try again.",
      );
    }
  };

  // Handle switching conversations
  const handleSelectConversation = (convId: string) => {
    setSendError(null);
    setActiveConversationId(convId);
    navigate(`/app/ai/${convId}`);
    setShowHistoryPanel(false);
  };

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    setSendError(null);

    let targetConvId = activeConversationId;

    // If no conversation exists yet, create one first
    if (!targetConvId) {
      try {
        const newConv = await createMutation.mutateAsync({
          title: content.slice(0, 40) || "Wellness Conversation",
        });
        targetConvId = newConv.id;
        setActiveConversationId(newConv.id);
        navigate(`/app/ai/${newConv.id}`);
      } catch {
        setSendError(
          "Unable to establish conversation session. Please try again.",
        );
        return;
      }
    }

    try {
      await sendMutation.mutateAsync({
        conversationId: targetConvId,
        data: { content },
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to receive response from MANVIA AI";
      setSendError(errorMessage);
    }
  };

  return (
    <div
      className="manvia-ai-companion-view"
      data-testid="ai-companion-view"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 120px)",
        maxWidth: "1120px",
        margin: "0 auto",
      }}
    >
      {/* View Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          marginBottom: "var(--space-3)",
          paddingBottom: "var(--space-3)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <h1
            className="heading-2"
            style={{ margin: 0, color: "var(--color-text-primary)" }}
          >
            MANVIA AI Companion
          </h1>
          <Badge variant="info" data-testid="ai-header-badge">
            AI • Non-Diagnostic
          </Badge>
          {currentConversation && (
            <Badge variant="neutral" style={{ fontSize: "0.7rem" }}>
              {currentConversation.publicConversationId}
            </Badge>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            data-testid="toggle-history-btn"
            aria-label="Toggle conversation history"
          >
            📋 Sessions ({conversations.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleStartNewConversation}
            isLoading={createMutation.isPending}
            data-testid="header-new-chat-btn"
          >
            + New Chat
          </Button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: "var(--space-4)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Optional Collapsible History Sidebar */}
        {showHistoryPanel && (
          <aside
            style={{
              width: "280px",
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-3)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-md)",
              zIndex: 10,
            }}
            data-testid="sidebar-conversation-list"
          >
            <ConversationListPanel
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleStartNewConversation}
              isCreating={createMutation.isPending}
            />
          </aside>
        )}

        {/* Chat Area Container */}
        <section
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
          aria-label="Active conversation"
        >
          {/* Mandatory AI Disclosure Banner */}
          <AiDisclosureBanner compact />

          {/* Error Banner if message failed to send */}
          {sendError && (
            <div
              role="alert"
              style={{
                backgroundColor: "var(--color-danger-subtle)",
                color: "var(--color-danger-dark)",
                border: "1px solid var(--color-danger-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
                fontSize: "var(--font-size-xs)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-2)",
              }}
              data-testid="chat-error-banner"
            >
              <span>⚠️ {sendError}</span>
              <button
                type="button"
                onClick={() => setSendError(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1rem",
                  lineHeight: 1,
                  color: "inherit",
                }}
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Conversation Query Error Card */}
          {activeDetailQuery.isError && (
            <Card
              style={{
                padding: "var(--space-4)",
                backgroundColor: "var(--color-danger-subtle)",
                border: "1px solid var(--color-danger-border)",
                marginBottom: "var(--space-3)",
              }}
              data-testid="conversation-load-error"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h4
                    style={{
                      margin: "0 0 var(--space-1) 0",
                      color: "var(--color-danger-dark)",
                    }}
                  >
                    Unable to load conversation
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {activeDetailQuery.error?.message ||
                      "Conversation could not be retrieved from the server."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => activeDetailQuery.refetch()}
                  data-testid="retry-conversation-btn"
                >
                  Retry
                </Button>
              </div>
            </Card>
          )}

          {/* Chat Messages Stream or Empty State */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activeDetailQuery.isLoading && activeConversationId ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "200px",
                  gap: "var(--space-2)",
                  color: "var(--color-text-muted)",
                }}
                data-testid="chat-loading-skeleton"
              >
                <Spinner size="md" />
                <span>Loading conversation...</span>
              </div>
            ) : messages.length === 0 ? (
              <EmptyChatState
                onSelectPrompt={handleSendMessage}
                disabled={sendMutation.isPending || createMutation.isPending}
              />
            ) : (
              <ChatMessageList
                messages={messages}
                isSending={sendMutation.isPending}
              />
            )}
          </div>

          {/* Input Composer */}
          <div style={{ marginTop: "auto", paddingTop: "var(--space-2)" }}>
            <MessageComposer
              onSendMessage={handleSendMessage}
              isLoading={sendMutation.isPending || createMutation.isPending}
              disabled={activeDetailQuery.isError}
            />
          </div>
        </section>
      </div>
    </div>
  );
};
