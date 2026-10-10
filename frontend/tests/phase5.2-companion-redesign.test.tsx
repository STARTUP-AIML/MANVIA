import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { AiCompanionRoute } from "@/routes/AiCompanionRoute";
import { ManviaAvatar3D } from "@/features/ai-companion/components/ManviaAvatar3D";
import {
  aiCompanionService,
  AIConversationStatus,
  AIMessageRole,
  AIMessageStatus,
  type AIConversationResponseDto,
  type AIConversationDetailResponseDto,
} from "@/features/ai-companion";
import { sessionStorageManager } from "@/auth/sessionStorage";
import { authService } from "@/auth/authService";
import { patientService } from "@/features/patient/api/patientService";

const mockPatientUser = {
  id: "user-patient-123",
  email: "patient123@manvia.health",
  phone: "+1234567895",
  emailVerified: true,
  phoneVerified: false,
  status: "ACTIVE" as const,
  roles: ["PATIENT" as const],
  createdAt: "2026-01-01T00:00:00Z",
};

const mockProfile = {
  id: "profile-123",
  publicPatientId: "PAT-12345678",
  legalFirstName: "Jane",
  legalLastName: "Doe",
  dateOfBirth: "1994-04-12",
  biologicalSex: "FEMALE" as const,
  bloodGroup: "O+" as const,
  emergencyContact: null,
  preferredLanguage: "en",
  timezone: "UTC",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("MANVIA Phase 5.2 — Complete AI Companion UI Redesign", () => {
  const mockConversations: AIConversationResponseDto[] = [
    {
      id: "conv-p52-1",
      publicConversationId: "PUB-CONV-P52-1",
      userId: "user-patient-123",
      title: "Wellness & Sleep Consultation",
      status: AIConversationStatus.ACTIVE,
      lastMessageAt: "2026-03-01T12:00:00Z",
      createdAt: "2026-03-01T12:00:00Z",
      updatedAt: "2026-03-01T12:00:00Z",
    },
  ];

  const mockDetail: AIConversationDetailResponseDto = {
    conversation: {
      id: "conv-p52-1",
      publicConversationId: "PUB-CONV-P52-1",
      userId: "user-patient-123",
      title: "Wellness & Sleep Consultation",
      status: AIConversationStatus.ACTIVE,
      lastMessageAt: "2026-03-01T12:00:00Z",
      createdAt: "2026-03-01T12:00:00Z",
      updatedAt: "2026-03-01T12:00:00Z",
    },
    messages: [
      {
        id: "msg-p52-1",
        publicMessageId: "PUB-MSG-P52-1",
        conversationId: "conv-p52-1",
        role: AIMessageRole.ASSISTANT,
        content: "Hello! I am your MANVIA AI companion. How can I assist your health and wellness goals today?",
        status: AIMessageStatus.SENT,
        isAiGenerated: true,
        citations: [],
        createdAt: "2026-03-01T12:00:00Z",
        updatedAt: "2026-03-01T12:00:00Z",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();

    sessionStorageManager.setTokens({
      accessToken: "patient-token-123",
      refreshToken: "patient-refresh-123",
    });
    sessionStorageManager.setUser(mockPatientUser.id, "PATIENT");

    vi.spyOn(authService, "getMe").mockResolvedValue(mockPatientUser);
    vi.spyOn(patientService, "getMyProfile").mockResolvedValue(mockProfile);

    vi.spyOn(aiCompanionService, "listConversations").mockResolvedValue({
      data: mockConversations,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    vi.spyOn(aiCompanionService, "getConversation").mockResolvedValue(mockDetail);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Central-Left Avatar Panel & Character Presentation", () => {
    it("renders ManviaAvatar3D with status badge and interactive microphone control", () => {
      const handleStartRecording = vi.fn();
      renderWithProviders(
        <ManviaAvatar3D
          state="idle"
          voiceEnabled={true}
          onStartRecording={handleStartRecording}
          isRecording={false}
          recordingSeconds={0}
        />
      );

      // Verify container exists
      expect(screen.getByTestId("manvia-avatar-3d")).toBeInTheDocument();
      // Status badge shows Ready • Companion
      expect(screen.getByTestId("avatar-overlay-state-label")).toHaveTextContent("Ready • Companion");
      // Interactive 52px microphone button is present
      const micBtn = screen.getByTestId("avatar-mic-activate-btn");
      expect(micBtn).toBeInTheDocument();
      expect(micBtn).toHaveAttribute("aria-label", "Activate microphone");
    });

    it("displays Listening state and recording counter when recording", () => {
      renderWithProviders(
        <ManviaAvatar3D
          state="listening"
          voiceEnabled={true}
          isRecording={true}
          recordingSeconds={7}
          onStopRecording={vi.fn()}
          onCancelRecording={vi.fn()}
        />
      );

      expect(screen.getByTestId("avatar-overlay-state-label")).toHaveTextContent("Listening...");
      expect(screen.getByText(/Listening \(00:07\)/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Done recording" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel recording" })).toBeInTheDocument();
    });

    it("displays Speaking state with synchronized audio playback indicator", () => {
      renderWithProviders(
        <ManviaAvatar3D
          state="speaking"
          voiceEnabled={true}
          isVoicePlaying={true}
          onStopVoice={vi.fn()}
          isRecording={false}
          recordingSeconds={0}
        />
      );

      expect(screen.getByTestId("avatar-overlay-state-label")).toHaveTextContent("Speaking (Lip-Synced)");
    });
  });

  describe("2. Two-Panel Layout & Chatbot Workspace", () => {
    it("renders both Avatar Panel and Chatbot Panel side-by-side with brand header", async () => {
      renderWithProviders(<AiCompanionRoute />);

      // Avatar panel
      await waitFor(() => {
        expect(screen.getByTestId("avatar-container-panel")).toBeInTheDocument();
      });

      // Chatbot panel
      expect(screen.getByTestId("chatbot-panel")).toBeInTheDocument();

      // Brand mark and Title
      expect(screen.getByText("Chat with MANVIA AI")).toBeInTheDocument();

      // Non-diagnostic disclosure
      expect(screen.getAllByText(/AI • Non-Diagnostic/i).length).toBeGreaterThanOrEqual(1);

      // Persisted conversation title and message
      await waitFor(() => {
        expect(screen.getByText("Wellness & Sleep Consultation")).toBeInTheDocument();
        expect(
          screen.getByText("Hello! I am your MANVIA AI companion. How can I assist your health and wellness goals today?")
        ).toBeInTheDocument();
      });
    });

    it("renders Light, Auto, and Dark theme controls and supports switching", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AiCompanionRoute />);

      await waitFor(() => {
        expect(screen.getByTestId("theme-selector")).toBeInTheDocument();
      });

      const lightBtn = screen.getByTestId("theme-btn-light");
      const darkBtn = screen.getByTestId("theme-btn-dark");
      const autoBtn = screen.getByTestId("theme-btn-auto");

      expect(lightBtn).toBeInTheDocument();
      expect(darkBtn).toBeInTheDocument();
      expect(autoBtn).toBeInTheDocument();

      // Switch to dark
      await user.click(darkBtn);
      expect(darkBtn).toHaveAttribute("aria-checked", "true");

      // Switch to light
      await user.click(lightBtn);
      expect(lightBtn).toHaveAttribute("aria-checked", "true");
    });

    it("renders suggested prompt chips and allows quick submission", async () => {
      const user = userEvent.setup();
      const sendSpy = vi.spyOn(aiCompanionService, "sendMessage").mockResolvedValue({
        userMessage: {
          id: "msg-p52-user",
          publicMessageId: "PUB-MSG-P52-USER",
          conversationId: "conv-p52-1",
          role: AIMessageRole.USER,
          content: "How can I improve my sleep routine and sleep quality naturally?",
          status: AIMessageStatus.SENT,
          isAiGenerated: false,
          citations: [],
          createdAt: "2026-03-01T12:01:00Z",
          updatedAt: "2026-03-01T12:01:00Z",
        },
        assistantMessage: {
          id: "msg-p52-resp",
          publicMessageId: "PUB-MSG-P52-RESP",
          conversationId: "conv-p52-1",
          role: AIMessageRole.ASSISTANT,
          content: "Here are some proven strategies to optimize your sleep quality...",
          status: AIMessageStatus.SENT,
          isAiGenerated: true,
          citations: [],
          createdAt: "2026-03-01T12:01:00Z",
          updatedAt: "2026-03-01T12:01:00Z",
        },
      });

      renderWithProviders(<AiCompanionRoute />);

      await waitFor(() => {
        expect(screen.getByTestId("suggested-chips-container")).toBeInTheDocument();
      });

      const chipsContainer = screen.getByTestId("suggested-chips-container");

      // Verify suggested chips from reference within container
      expect(within(chipsContainer).getByText(/Sleep improvement/i)).toBeInTheDocument();
      expect(within(chipsContainer).getByText(/Meditation for beginners/i)).toBeInTheDocument();
      expect(within(chipsContainer).getByText(/Stress relief/i)).toBeInTheDocument();
      expect(within(chipsContainer).getByText(/Healthy daily routine/i)).toBeInTheDocument();

      // Click "Sleep improvement"
      const sleepChip = within(chipsContainer).getByText(/Sleep improvement/i);
      await user.click(sleepChip);

      await waitFor(() => {
        expect(sendSpy).toHaveBeenCalledWith(
          "conv-p52-1",
          expect.objectContaining({
            content: "How can I improve my sleep routine and sleep quality naturally?",
          })
        );
      });
    });

    it("anchors composer with textarea, mic button, and send button", async () => {
      renderWithProviders(<AiCompanionRoute />);

      await waitFor(() => {
        expect(screen.getByTestId("message-composer")).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/Ask MANVIA AI a wellness question/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
    });
  });
});
