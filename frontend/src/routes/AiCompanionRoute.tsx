/**
 * MANVIA AI Companion Route (/app/ai and /app/ai/:conversationId)
 * Phase 5.2 Redesign: Responsive Two-Panel AI Companion Workspace
 *
 * Layout Structure:
 * - Left Panel: Prominent Virtual Healthcare Companion Avatar Panel (3D/Portrait,
 *   soft daylight healthcare clinic lighting, white uniform with teal trim,
 *   live status badges, 52px interactive microphone for Groq Whisper, and speech playback)
 * - Right Panel: Dedicated Healthcare Chatbot Workspace
 *   - Header: MANVIA brand mark, "Chat with MANVIA AI", wellness subtitle,
 *     Light/Auto/Dark theme segmented controls, Recent Chats drawer, and "+ New Chat"
 *   - Body: Compact non-diagnostic medical notice, chronological message history,
 *     user teal bubbles, assistant neutral bubbles with markdown, Read Aloud & Stop audio
 *   - Suggested Prompt Chips: Sleep improvement, Meditation, Stress relief, Healthy daily routine
 *   - Bottom Anchored Composer: Textarea, document attachments, microphone STT, Send button
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AiDisclosureBanner,
  ChatMessageItem,
  MessageComposer,
  type MessageComposerHandle,
  EmptyChatState,
  ManviaAvatar3D,
  useSpeechSynthesis,
  type AvatarCompanionState,
  useAiConversationsQuery,
  useAiConversationQuery,
  useCreateConversationMutation,
  useUpdateConversationMutation,
  useDeleteConversationMutation,
  useSendAiMessageMutation,
  AIConversationStatus,
  ConversationListPanel,
} from "@/features/ai-companion";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useUIStore } from "@/state/uiStore";

const SUGGESTED_CHIPS = [
  { label: "😴 Sleep improvement", prompt: "How can I improve my sleep routine and sleep quality naturally?" },
  { label: "🧘 Meditation for beginners", prompt: "Can you guide me through a 5-minute meditation and breathwork exercise for beginners?" },
  { label: "🌿 Stress relief", prompt: "What are evidence-based techniques to relieve daily work stress and tension?" },
  { label: "☀️ Healthy daily routine", prompt: "Help me design an energizing, realistic morning and evening wellness routine." },
];

export const AiCompanionRoute: React.FC = () => {
  const { conversationId: paramConversationId } = useParams<{
    conversationId?: string;
  }>();
  const navigate = useNavigate();
  const composerRef = useRef<MessageComposerHandle>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Global UI State & Theme Controls
  const { themeMode, setThemeMode } = useUIStore();

  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(
    paramConversationId,
  );
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Audio / Speech / Microphone States
  const speech = useSpeechSynthesis();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isMicRecording, setIsMicRecording] = useState(false);
  const [micSeconds, setMicSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showAvatarPanel, setShowAvatarPanel] = useState(true);

  // 1. Query active conversations for authenticated patient
  const conversationsQuery = useAiConversationsQuery({
    status: AIConversationStatus.ACTIVE,
  });

  const conversations = useMemo(
    () => conversationsQuery.data?.data || [],
    [conversationsQuery.data?.data],
  );

  // 2. Synchronize active conversation with route parameter
  useEffect(() => {
    if (paramConversationId) {
      setActiveConversationId(paramConversationId);
    } else if (conversations.length > 0 && !activeConversationId) {
      const latest = conversations[0];
      if (latest) {
        setActiveConversationId(latest.id);
      }
    }
  }, [paramConversationId, conversations, activeConversationId]);

  const effectiveConversationId = activeConversationId || paramConversationId || conversations[0]?.id;

  // 3. Query active conversation messages
  const activeDetailQuery = useAiConversationQuery(effectiveConversationId);
  const messages = activeDetailQuery.data?.messages || [];

  // Auto-scroll messages to bottom on update
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
    }
  }, [messages.length, activeDetailQuery.isFetching]);

  // 4. Mutations
  const createMutation = useCreateConversationMutation();
  const updateMutation = useUpdateConversationMutation();
  const deleteMutation = useDeleteConversationMutation();
  const sendMutation = useSendAiMessageMutation();

  // Derive reactive Avatar Companion state
  const avatarState: AvatarCompanionState = useMemo(() => {
    if (speech.isPlaying) return "speaking";
    if (isMicRecording) return "listening";
    if (sendMutation.isPending || createMutation.isPending || isTranscribing) return "thinking";
    if (sendError) return "error";
    return "idle";
  }, [
    speech.isPlaying,
    isMicRecording,
    sendMutation.isPending,
    createMutation.isPending,
    isTranscribing,
    sendError,
  ]);

  // Initialize new conversation
  const handleStartNewConversation = async () => {
    try {
      speech.stop();
      setSendError(null);
      const newConv = await createMutation.mutateAsync({
        title: "Wellness Conversation",
      });
      setActiveConversationId(newConv.id);
      setShowHistoryDrawer(false);
      navigate(`/app/ai/${newConv.id}`);
    } catch {
      setSendError("Failed to initialize a new conversation session. Please try again.");
    }
  };

  // Switch conversation
  const handleSelectConversation = (convId: string) => {
    speech.stop();
    setSendError(null);
    setActiveConversationId(convId);
    setShowHistoryDrawer(false);
    navigate(`/app/ai/${convId}`);
  };

  // Rename conversation
  const handleRenameConversation = async (convId: string, newTitle: string) => {
    try {
      await updateMutation.mutateAsync({
        conversationId: convId,
        data: { title: newTitle },
      });
    } catch {
      setSendError("Failed to rename conversation.");
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (convId: string) => {
    try {
      speech.stop();
      await deleteMutation.mutateAsync(convId);
      if (activeConversationId === convId) {
        handleStartNewConversation();
      }
    } catch {
      setSendError("Failed to delete conversation.");
    }
  };

  // Submit message
  const handleSendMessage = async (content: string) => {
    speech.stop();
    setSendError(null);
    setLastFailedMessage(content);

    let targetConvId = activeConversationId;

    if (!targetConvId) {
      try {
        const titleSnippet =
          content.split("\n")[0]?.slice(0, 35).trim() || "Wellness Conversation";
        const newConv = await createMutation.mutateAsync({
          title: titleSnippet,
        });
        targetConvId = newConv.id;
        setActiveConversationId(newConv.id);
        navigate(`/app/ai/${newConv.id}`, { replace: true });
      } catch {
        setSendError("Unable to establish conversation session. Please try again.");
        return;
      }
    }

    try {
      await sendMutation.mutateAsync({
        conversationId: targetConvId,
        data: { content },
      });
      setLastFailedMessage(null);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to receive response from MANVIA AI";
      setSendError(errorMessage);
    }
  };

  return (
    <div
      className="manvia-ai-companion-view"
      data-testid="ai-companion-view"
      style={{
        display: "flex",
        flex: 1,
        height: "100%",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "var(--color-bg-app)",
        padding: "16px 20px",
        boxSizing: "border-box",
        gap: "20px",
      }}
    >
      {/* ============================================================== */}
      {/* CENTRAL-LEFT AVATAR PANEL                                     */}
      {/* ============================================================== */}
      {showAvatarPanel && (
        <section
          className="manvia-avatar-panel"
          data-testid="avatar-container-panel"
          style={{
            flex: "0 0 45%",
            minWidth: "340px",
            maxWidth: "560px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
          aria-label="MANVIA Virtual Healthcare Companion Avatar Panel"
        >
          <ManviaAvatar3D
            state={avatarState}
            voiceEnabled={speech.voiceEnabled}
            onToggleVoice={speech.toggleVoiceEnabled}
            isVoicePlaying={speech.isPlaying}
            onStopVoice={speech.stop}
            visemeState={speech.visemeState}
            isRecording={isMicRecording}
            recordingSeconds={micSeconds}
            onStartRecording={() => composerRef.current?.startRecording()}
            onStopRecording={() => composerRef.current?.stopRecording()}
            onCancelRecording={() => composerRef.current?.cancelRecording()}
            isTranscribing={isTranscribing}
            onRetry={() => lastFailedMessage && handleSendMessage(lastFailedMessage)}
            errorMessage={sendError}
          />
        </section>
      )}

      {/* ============================================================== */}
      {/* RIGHT-SIDE CHATBOT PANEL                                       */}
      {/* ============================================================== */}
      <section
        className="manvia-chatbot-panel"
        data-testid="chatbot-panel"
        style={{
          flex: 1,
          minWidth: "360px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--color-bg-surface)",
          borderRadius: "24px",
          border: "1px solid var(--color-border-subtle)",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
          overflow: "hidden",
          position: "relative",
        }}
        aria-label="Chat with MANVIA AI Workspace"
      >
        {/* Chatbot Header */}
        <header
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--color-border-subtle)",
            backgroundColor: "var(--color-bg-surface)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {/* Brand Mark & Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "#f0fdfa",
                border: "1.5px solid #99f6e4",
                boxShadow: "0 2px 8px rgba(13, 148, 136, 0.15)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <img
                src="/manvia-logo-mark.png"
                alt="MANVIA"
                style={{ width: "24px", height: "24px", objectFit: "contain" }}
              />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "1.05rem",
                    fontWeight: 800,
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  <span>Chat with MANVIA AI</span>
                  <span className="sr-only">MANVIA AI Companion</span>
                </h1>
                <Badge variant="info" data-testid="ai-header-badge">
                  AI • Non-Diagnostic
                </Badge>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Personalized clinical wellness & care guidance
                </span>
                <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>•</span>
                <a
                  href="/app/wellness"
                  data-testid="ai-journey-wellness-link"
                  style={{ fontSize: "0.75rem", color: "var(--color-primary-700)", textDecoration: "none", fontWeight: 500 }}
                >
                  Wellness
                </a>
                <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>•</span>
                <a
                  href="/app/doctors"
                  data-testid="ai-journey-care-link"
                  style={{ fontSize: "0.75rem", color: "var(--color-primary-700)", textDecoration: "none", fontWeight: 500 }}
                >
                  Care / Doctors
                </a>
              </div>
            </div>
          </div>

          {/* Controls: Theme Selector, History Drawer & New Chat */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Global Voice Toggle */}
            <Button
              variant={voiceEnabled ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                if (voiceEnabled && speech.isPlaying) {
                  speech.stop();
                }
                setVoiceEnabled(!voiceEnabled);
              }}
              data-testid="toggle-voice-btn"
              title={voiceEnabled ? "Mute Spoken Responses" : "Enable Spoken Responses"}
              style={{ fontSize: "0.72rem", padding: "4px 8px" }}
            >
              {voiceEnabled ? "🔊 Spoken: ON" : "🔇 Spoken: OFF"}
            </Button>

            {/* Theme Selector Segmented Pill (Light / Auto / Dark) */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px",
                borderRadius: "20px",
                backgroundColor: "var(--color-bg-surface-subtle, #f1f5f9)",
                border: "1px solid var(--color-border-subtle, #e2e8f0)",
                gap: "2px",
              }}
              role="radiogroup"
              aria-label="Color theme selection"
              data-testid="theme-selector"
            >
              <button
                type="button"
                onClick={() => setThemeMode("light")}
                role="radio"
                aria-checked={themeMode === "light"}
                title="Light Theme"
                data-testid="theme-btn-light"
                style={{
                  border: "none",
                  padding: "3px 8px",
                  borderRadius: "16px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: themeMode === "light" ? "var(--color-bg-surface, #ffffff)" : "transparent",
                  color: themeMode === "light" ? "var(--color-primary-700, #0f766e)" : "var(--color-text-muted, #64748b)",
                  boxShadow: themeMode === "light" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 150ms ease",
                }}
              >
                ☀️ Light
              </button>
              <button
                type="button"
                onClick={() => setThemeMode("system")}
                role="radio"
                aria-checked={themeMode === "system"}
                title="Auto / System Theme"
                data-testid="theme-btn-auto"
                style={{
                  border: "none",
                  padding: "3px 8px",
                  borderRadius: "16px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: themeMode === "system" ? "var(--color-bg-surface, #ffffff)" : "transparent",
                  color: themeMode === "system" ? "var(--color-primary-700, #0f766e)" : "var(--color-text-muted, #64748b)",
                  boxShadow: themeMode === "system" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 150ms ease",
                }}
              >
                💻 Auto
              </button>
              <button
                type="button"
                onClick={() => setThemeMode("dark")}
                role="radio"
                aria-checked={themeMode === "dark"}
                title="Dark Theme"
                data-testid="theme-btn-dark"
                style={{
                  border: "none",
                  padding: "3px 8px",
                  borderRadius: "16px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: themeMode === "dark" ? "var(--color-bg-surface, #ffffff)" : "transparent",
                  color: themeMode === "dark" ? "var(--color-primary-700, #0f766e)" : "var(--color-text-muted, #64748b)",
                  boxShadow: themeMode === "dark" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 150ms ease",
                }}
              >
                🌙 Dark
              </button>
            </div>

            {/* Avatar Toggle (Desktop/Mobile responsive switch) */}
            <Button
              variant={showAvatarPanel ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowAvatarPanel(!showAvatarPanel)}
              data-testid="toggle-avatar-btn"
              title={showAvatarPanel ? "Hide Avatar (Text-Only Chat)" : "Show Companion Avatar"}
              aria-label={showAvatarPanel ? "Hide Avatar" : "Show Companion Avatar"}
              style={{ fontSize: "0.72rem", padding: "4px 8px" }}
            >
              {showAvatarPanel ? "👤 3D Avatar: ON" : "👤 3D Avatar: OFF"}
            </Button>

            {/* Recent Chats Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              data-testid="recent-chats-drawer-btn"
              title="View previous chats"
              style={{ fontSize: "0.72rem", padding: "4px 10px" }}
            >
              📜 Chats ({conversations.length})
            </Button>

            {/* New Chat Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartNewConversation}
              disabled={createMutation.isPending}
              data-testid="header-new-chat-btn"
              style={{ fontSize: "0.75rem", padding: "4px 12px" }}
            >
              + New Chat
            </Button>
          </div>
        </header>

        {/* Recent Chats Dropdown / Overlay Drawer */}
        <aside
          data-testid="sidebar-conversation-list"
          style={
            showHistoryDrawer
              ? {
                  position: "absolute",
                  top: "60px",
                  right: "20px",
                  width: "320px",
                  maxHeight: "480px",
                  backgroundColor: "var(--color-bg-surface)",
                  borderRadius: "16px",
                  border: "1px solid var(--color-border-subtle)",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                  zIndex: 30,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }
              : {
                  position: "absolute",
                  left: "-9999px",
                  top: 0,
                  width: "300px",
                  height: "300px",
                  overflow: "hidden",
                }
          }
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--color-border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "var(--color-bg-surface-subtle)",
            }}
          >
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
              Previous Conversations
            </span>
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(false)}
              style={{
                background: "none",
                border: "none",
                fontSize: "0.85rem",
                cursor: "pointer",
                color: "var(--color-text-muted)",
              }}
              aria-label="Close conversation drawer"
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <ConversationListPanel
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleStartNewConversation}
              onRenameConversation={handleRenameConversation}
              onDeleteConversation={handleDeleteConversation}
              isCreating={createMutation.isPending}
              isLoading={conversationsQuery.isLoading}
            />
          </div>
        </aside>

        {/* AI Medical Disclosure Banner */}
        <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
          <AiDisclosureBanner compact />
        </div>

        {/* Error Alert Banner */}
        {sendError && (
          <div
            role="alert"
            style={{
              backgroundColor: "var(--color-danger-subtle)",
              color: "var(--color-danger-dark)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "12px",
              padding: "8px 14px",
              fontSize: "0.8rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "6px 16px 0",
              flexShrink: 0,
            }}
            data-testid="chat-error-banner"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⚠️ {sendError}</span>
              {lastFailedMessage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage(lastFailedMessage)}
                  disabled={sendMutation.isPending}
                  data-testid="retry-send-message-btn"
                  style={{ padding: "2px 8px", fontSize: "0.72rem", height: "auto" }}
                >
                  Retry Message
                </Button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSendError(null);
                setLastFailedMessage(null);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "inherit",
              }}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Message Canvas */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px 8px",
            display: "flex",
            flexDirection: "column",
          }}
          data-testid="message-list-container"
        >
          {activeDetailQuery.isError ? (
            <div
              data-testid="conversation-load-error"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                flexDirection: "column",
                gap: "12px",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "2rem" }}>⚠️</span>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-danger-dark, #991b1b)" }}>
                Failed to load conversation history.
              </p>
              <Button
                variant="primary"
                size="sm"
                data-testid="retry-conversation-btn"
                onClick={() => activeDetailQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : activeDetailQuery.isLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <Spinner size="lg" />
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                Loading conversation messages...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <EmptyChatState
              onSelectPrompt={(text) => handleSendMessage(text)}
              disabled={sendMutation.isPending}
            />
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  isPlaying={speech.isPlaying && speech.currentMessageId === msg.id}
                  onPlaySpeech={(text, msgId) => speech.speak(text, msgId)}
                  onStopSpeech={speech.stop}
                  voiceEnabled={speech.voiceEnabled}
                />
              ))}

              {/* Streaming / Response Generation Indicator */}
              {sendMutation.isPending && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 14px",
                    borderRadius: "14px",
                    backgroundColor: "var(--color-bg-surface-subtle, #f8fafc)",
                    maxWidth: "240px",
                    marginBottom: "12px",
                  }}
                  data-testid="ai-thinking-indicator"
                >
                  <Spinner size="sm" />
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                    MANVIA AI is formulating response...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Suggested Prompts (Small Rounded Chips) */}
        <div
          style={{
            padding: "4px 20px 8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
          data-testid="suggested-chips-container"
        >
          {SUGGESTED_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(chip.prompt)}
              disabled={sendMutation.isPending}
              data-testid={`suggested-chip-${idx}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: "20px",
                border: "1px solid var(--color-border-subtle, #e2e8f0)",
                backgroundColor: "var(--color-bg-surface-subtle, #f8fafc)",
                color: "var(--color-text-primary, #0f172a)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms ease",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Fixed Bottom Message Composer */}
        <div
          style={{
            padding: "8px 20px 16px",
            borderTop: "1px solid var(--color-border-subtle)",
            backgroundColor: "var(--color-bg-surface)",
            flexShrink: 0,
          }}
        >
          <MessageComposer
            ref={composerRef}
            onSendMessage={handleSendMessage}
            isLoading={sendMutation.isPending}
            disabled={sendMutation.isPending}
            onRecordingChange={setIsMicRecording}
            onRecordingSecondsChange={setMicSeconds}
            onTranscribingChange={setIsTranscribing}
          />
        </div>
      </section>
    </div>
  );
};
