/**
 * MANVIA Phase 5 — 3D AI Companion, Voice Interaction & UX Polish Test Suite
 *
 * Verifies:
 * 1. ManviaAvatar3D & AvatarFallbackCard states (idle, listening, thinking, speaking, error)
 * 2. Accessible WebGL fallback rendering & screen reader live announcements
 * 3. Speech synthesis hook (stripMarkdownForSpeech, speak, stop, voice toggle, interruption)
 * 4. Assistant message Read Aloud / Stop button integration
 * 5. Full AiCompanionRoute integration: Avatar viewport, voice controls, text-only mode toggle
 * 6. Non-diagnostic healthcare disclaimer and conversation text flow preservation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, renderHook, act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { AiCompanionRoute } from "@/routes/AiCompanionRoute";
import {
  ManviaAvatar3D,
  AvatarFallbackCard,
  stripMarkdownForSpeech,
  useSpeechSynthesis,
  ChatMessageItem,
  AIMessageRole,
  AIMessageStatus,
  AIConversationStatus,
  type AIMessageResponseDto,
  type AIConversationDetailResponseDto,
  type AIConversationResponseDto,
} from "@/features/ai-companion";
import { aiCompanionService } from "@/features/ai-companion/api/aiCompanionService";
import { sessionStorageManager } from "@/auth/sessionStorage";
import { authService } from "@/auth/authService";
import { patientService } from "@/features/patient/api/patientService";

const mockPatientUser = {
  id: "user-patient-555",
  email: "patient5@manvia.health",
  phone: "+1234567895",
  emailVerified: true,
  phoneVerified: false,
  status: "ACTIVE" as const,
  roles: ["PATIENT" as const],
  createdAt: "2026-01-01T00:00:00Z",
};

const mockProfile = {
  id: "profile-555",
  publicPatientId: "PAT-55512345",
  legalFirstName: "Maya",
  legalLastName: "Lin",
  dateOfBirth: "1992-05-15",
  biologicalSex: "FEMALE" as const,
  bloodGroup: "A+" as const,
  emergencyContact: null,
  preferredLanguage: "en",
  timezone: "UTC",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("MANVIA Phase 5 — 3D AI Companion & Voice Interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();

    sessionStorageManager.setTokens({
      accessToken: "patient-token-555",
      refreshToken: "patient-refresh-555",
    });
    sessionStorageManager.setUser(mockPatientUser.id, "PATIENT");

    vi.spyOn(authService, "getMe").mockResolvedValue(mockPatientUser);
    vi.spyOn(patientService, "getMyProfile").mockResolvedValue(mockProfile);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. Text-to-Speech Markdown Pre-processor
  // ============================================================================
  describe("stripMarkdownForSpeech text pre-processor", () => {
    it("strips code blocks, links, tables, and headers for natural speech", () => {
      const rawMarkdown = `
# Healthcare Guidance
Here is your **treatment** plan:
* Drink plenty of water
* Sleep 8 hours

| Time | Action |
| --- | --- |
| Morning | Walk |

Visit [MANVIA Care](https://manvia.health) for details.
\`\`\`js
console.log("medication");
\`\`\`
Take care!`;

      const cleaned = stripMarkdownForSpeech(rawMarkdown);

      expect(cleaned).not.toContain("```");
      expect(cleaned).not.toContain("https://manvia.health");
      expect(cleaned).not.toContain("#");
      expect(cleaned).not.toContain("**");
      expect(cleaned).toContain("Healthcare Guidance");
      expect(cleaned).toContain("Drink plenty of water");
      expect(cleaned).toContain("MANVIA Care");
      expect(cleaned).toContain("Take care!");
    });
  });

  // ============================================================================
  // 2. Procedural Avatar & WebGL Fallback Card
  // ============================================================================
  describe("ManviaAvatar3D & AvatarFallbackCard", () => {
    it("renders fallback companion card in headless/non-WebGL environments with idle state", () => {
      render(
        <ManviaAvatar3D
          state="idle"
          voiceEnabled={true}
          isVoicePlaying={false}
        />
      );

      expect(screen.getByTestId("manvia-avatar-3d")).toBeInTheDocument();
      expect(screen.getByTestId("avatar-fallback-card")).toBeInTheDocument();
      expect(screen.getByAltText("MANVIA Virtual Healthcare Companion")).toBeInTheDocument();
      expect(screen.getByTestId("avatar-state-badge")).toHaveTextContent("Ready");
      expect(screen.getByTestId("avatar-live-status")).toHaveTextContent(
        "MANVIA Companion is ready"
      );
    });

    it("displays appropriate status indicators across all companion states", () => {
      const { rerender } = render(
        <AvatarFallbackCard avatarState="listening" voiceEnabled={true} />
      );
      expect(screen.getByText("Listening...")).toBeInTheDocument();
      expect(screen.getByTestId("avatar-state-badge")).toHaveTextContent("Mic Active");

      rerender(<AvatarFallbackCard avatarState="thinking" voiceEnabled={true} />);
      expect(screen.getByText("Analyzing...")).toBeInTheDocument();
      expect(screen.getByTestId("avatar-state-badge")).toHaveTextContent("Thinking");

      rerender(<AvatarFallbackCard avatarState="speaking" voiceEnabled={true} />);
      expect(screen.getByText("Speaking...")).toBeInTheDocument();
      expect(screen.getByTestId("avatar-state-badge")).toHaveTextContent("Audio Active");

      rerender(<AvatarFallbackCard avatarState="error" voiceEnabled={true} />);
      expect(screen.getByText("Notice")).toBeInTheDocument();
      expect(screen.getByTestId("avatar-state-badge")).toHaveTextContent("Needs Attention");
    });

    it("triggers onToggleVoice and onStopVoice from fallback controls", async () => {
      const user = userEvent.setup();
      const handleToggleVoice = vi.fn();
      const handleStopVoice = vi.fn();

      render(
        <AvatarFallbackCard
          avatarState="speaking"
          voiceEnabled={true}
          onToggleVoice={handleToggleVoice}
          isVoicePlaying={true}
          onStopVoice={handleStopVoice}
        />
      );

      const voiceToggleBtn = screen.getByTestId("avatar-voice-toggle-btn");
      await user.click(voiceToggleBtn);
      expect(handleToggleVoice).toHaveBeenCalledTimes(1);

      const stopVoiceBtn = screen.getByTestId("avatar-stop-voice-btn");
      await user.click(stopVoiceBtn);
      expect(handleStopVoice).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 3. Spoken Response Control in ChatMessageItem
  // ============================================================================
  describe("ChatMessageItem Read Aloud & Playback Controls", () => {
    const mockAssistantMessage: AIMessageResponseDto = {
      id: "msg-assistant-101",
      publicMessageId: "PUB-MSG-101",
      conversationId: "conv-101",
      role: AIMessageRole.ASSISTANT,
      content: "Please ensure you hydrate throughout the day and get regular rest.",
      status: AIMessageStatus.SENT,
      isAiGenerated: true,
      citations: [],
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
    };

    const mockUserMessage: AIMessageResponseDto = {
      id: "msg-user-102",
      publicMessageId: "PUB-MSG-102",
      conversationId: "conv-101",
      role: AIMessageRole.USER,
      content: "How much water should I drink?",
      status: AIMessageStatus.SENT,
      isAiGenerated: false,
      citations: [],
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
    };

    it("renders Read Aloud button on assistant messages but not on user messages", () => {
      const handlePlay = vi.fn();
      const handleStop = vi.fn();

      const { rerender } = renderWithProviders(
        <ChatMessageItem
          message={mockAssistantMessage}
          onPlaySpeech={handlePlay}
          onStopSpeech={handleStop}
          isPlaying={false}
        />
      );

      expect(screen.getByTestId("speech-btn-msg-assistant-101")).toBeInTheDocument();
      expect(screen.getByText("Read Aloud")).toBeInTheDocument();

      rerender(
        <ChatMessageItem
          message={mockUserMessage}
          onPlaySpeech={handlePlay}
          onStopSpeech={handleStop}
          isPlaying={false}
        />
      );

      expect(screen.queryByTestId("speech-btn-msg-user-102")).not.toBeInTheDocument();
    });

    it("invokes onPlaySpeech when clicked and switches to Stop state while playing", async () => {
      const user = userEvent.setup();
      const handlePlay = vi.fn();
      const handleStop = vi.fn();

      const { rerender } = renderWithProviders(
        <ChatMessageItem
          message={mockAssistantMessage}
          onPlaySpeech={handlePlay}
          onStopSpeech={handleStop}
          isPlaying={false}
        />
      );

      const playBtn = screen.getByTestId("speech-btn-msg-assistant-101");
      await user.click(playBtn);
      expect(handlePlay).toHaveBeenCalledWith(
        mockAssistantMessage.content,
        mockAssistantMessage.id
      );

      // Re-render as currently playing
      rerender(
        <ChatMessageItem
          message={mockAssistantMessage}
          onPlaySpeech={handlePlay}
          onStopSpeech={handleStop}
          isPlaying={true}
        />
      );

      expect(screen.getByText("Stop")).toBeInTheDocument();
      await user.click(screen.getByTestId("speech-btn-msg-assistant-101"));
      expect(handleStop).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 4. AiCompanionRoute Full Integration & UI Controls
  // ============================================================================
  describe("AiCompanionRoute 3D Avatar & Voice Integration", () => {
    const mockConversations: AIConversationResponseDto[] = [
      {
        id: "conv-phase5",
        publicConversationId: "PUB-CONV-P5",
        userId: "user-patient-555",
        title: "Daily Wellness Check",
        status: AIConversationStatus.ACTIVE,
        lastMessageAt: "2026-03-01T12:00:00Z",
        createdAt: "2026-03-01T12:00:00Z",
        updatedAt: "2026-03-01T12:00:00Z",
      },
    ];

    const mockDetail: AIConversationDetailResponseDto = {
      conversation: {
        id: "conv-phase5",
        publicConversationId: "PUB-CONV-P5",
        userId: "user-patient-555",
        title: "Daily Wellness Check",
        status: AIConversationStatus.ACTIVE,
        lastMessageAt: "2026-03-01T12:00:00Z",
        createdAt: "2026-03-01T12:00:00Z",
        updatedAt: "2026-03-01T12:00:00Z",
      },
      messages: [
        {
          id: "msg-p5-1",
          publicMessageId: "PUB-MSG-P5-1",
          conversationId: "conv-phase5",
          role: AIMessageRole.ASSISTANT,
          content: "Welcome to MANVIA! How can I support your health today?",
          status: AIMessageStatus.SENT,
          isAiGenerated: true,
          citations: [],
          createdAt: "2026-03-01T12:00:00Z",
          updatedAt: "2026-03-01T12:00:00Z",
        },
      ],
    };

    beforeEach(() => {
      vi.spyOn(aiCompanionService, "listConversations").mockResolvedValue({
        data: mockConversations,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      vi.spyOn(aiCompanionService, "getConversation").mockResolvedValue(mockDetail);
    });

    it("renders 3D companion avatar panel, non-diagnostic disclaimer, and text chat", async () => {
      renderWithProviders(<AiCompanionRoute />);

      await waitFor(() => {
        expect(screen.getByText("Daily Wellness Check")).toBeInTheDocument();
      });

      // 1. Non-diagnostic safety disclaimer is present
      const safetyBadges = screen.getAllByText(/AI • Non-Diagnostic/i);
      expect(safetyBadges.length).toBeGreaterThanOrEqual(1);

      // 2. 3D Avatar container panel is visible
      expect(screen.getByTestId("avatar-container-panel")).toBeInTheDocument();
      expect(screen.getByTestId("manvia-avatar-3d")).toBeInTheDocument();

      // 3. Header toggle buttons are present
      expect(screen.getByTestId("toggle-avatar-btn")).toHaveTextContent("👤 3D Avatar: ON");
      expect(screen.getByTestId("toggle-voice-btn")).toHaveTextContent("🔊 Spoken: ON");

      // 4. Conversation message and read aloud button are rendered
      await waitFor(() => {
        expect(
          screen.getByText("Welcome to MANVIA! How can I support your health today?")
        ).toBeInTheDocument();
      });
      expect(screen.getByTestId("speech-btn-msg-p5-1")).toBeInTheDocument();
    });

    it("allows toggling avatar off to support pure text-only mode", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AiCompanionRoute />);

      await waitFor(() => {
        expect(screen.getByTestId("avatar-container-panel")).toBeInTheDocument();
      });

      const avatarToggleBtn = screen.getByTestId("toggle-avatar-btn");
      await user.click(avatarToggleBtn);

      // Panel is hidden for pure text-only mode
      expect(screen.queryByTestId("avatar-container-panel")).not.toBeInTheDocument();
      expect(avatarToggleBtn).toHaveTextContent("👤 3D Avatar: OFF");

      // Re-enable
      await user.click(avatarToggleBtn);
      expect(screen.getByTestId("avatar-container-panel")).toBeInTheDocument();
      expect(avatarToggleBtn).toHaveTextContent("👤 3D Avatar: ON");
    });

    it("allows toggling global voice output", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AiCompanionRoute />);

      await waitFor(() => {
        expect(screen.getByTestId("toggle-voice-btn")).toBeInTheDocument();
      });

      const voiceToggleBtn = screen.getByTestId("toggle-voice-btn");
      await user.click(voiceToggleBtn);
      expect(voiceToggleBtn).toHaveTextContent("🔇 Spoken: OFF");

      await user.click(voiceToggleBtn);
      expect(voiceToggleBtn).toHaveTextContent("🔊 Spoken: ON");
    });
  });

  // ============================================================================
  // 5. useSpeechSynthesis Hook Unit & Lifecycle Tests
  // ============================================================================
  describe("useSpeechSynthesis hook lifecycle", () => {
    it("handles browser speech synthesis speak, stop, and unmount cancellation", async () => {
      const mockSpeak = vi.fn();
      const mockCancel = vi.fn();
      const mockGetVoices = vi.fn().mockReturnValue([
        { name: "Google US English", lang: "en-US" },
      ]);

      // Mock window.speechSynthesis
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          speak: mockSpeak,
          cancel: mockCancel,
          getVoices: mockGetVoices,
        },
        writable: true,
      });

      // Mock SpeechSynthesisUtterance
      class MockUtterance {
        text: string;
        rate: number = 1;
        pitch: number = 1;
        voice: unknown = null;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: ((e: unknown) => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      }
      // @ts-expect-error Mocking window.SpeechSynthesisUtterance
      window.SpeechSynthesisUtterance = MockUtterance;

      const { result, unmount } = renderHook(() => useSpeechSynthesis());

      expect(result.current.isSupported).toBe(true);

      // Trigger speak
      act(() => {
        result.current.speak(
          "Hello patient, please remember to take your medication.",
          "msg-123"
        );
      });

      expect(mockCancel).toHaveBeenCalled(); // Cancels previous speech
      expect(mockSpeak).toHaveBeenCalledTimes(1);

      // Trigger stop
      act(() => {
        result.current.stop();
      });
      expect(mockCancel).toHaveBeenCalledTimes(2);

      // Unmount hook triggers cancellation cleanup
      unmount();
      expect(mockCancel).toHaveBeenCalledTimes(3);
    });

    it("tracks viseme mouth state and returns to relaxed closed resting position on stop", () => {
      const mockSpeak = vi.fn();
      const mockCancel = vi.fn();
      Object.defineProperty(window, "speechSynthesis", {
        value: { speak: mockSpeak, cancel: mockCancel, getVoices: () => [] },
        writable: true,
      });

      const { result } = renderHook(() => useSpeechSynthesis());
      expect(result.current.visemeState.viseme).toBe("sil");
      expect(result.current.visemeState.openness).toBe(0);

      act(() => {
        result.current.speak("Welcome to MANVIA healthcare.", "msg-vis-1");
      });

      act(() => {
        result.current.stop();
      });

      // Confirms mouth returns to relaxed closed position
      expect(result.current.visemeState.viseme).toBe("sil");
      expect(result.current.visemeState.openness).toBe(0);
      expect(result.current.visemeState.smile).toBe(0.25);
    });
  });
});
