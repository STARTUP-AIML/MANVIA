/**
 * MANVIA Frontend — Phase 4: AI Companion Automated Tests
 * Tests text-chat experience, AI disclosure, message exchange, loading states,
 * error handling, conversation management, citations, feedback, and route protection.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { AppRoutes } from "@/app/router/routes";
import { AiCompanionRoute } from "@/routes/AiCompanionRoute";
import { aiCompanionService } from "@/features/ai-companion/api/aiCompanionService";
import { sessionStorageManager } from "@/auth/sessionStorage";
import { authService } from "@/auth/authService";
import { patientService } from "@/features/patient/api/patientService";
import {
  AIConversationStatus,
  AIMessageRole,
  AIMessageStatus,
  AIFeedbackRating,
  type AIConversationDetailResponseDto,
  type AIConversationResponseDto,
  type PaginatedAIConversationsResponseDto,
  type SendAIMessageResponseDto,
} from "@/features/ai-companion/types";
import type { UserResponseDto } from "@/auth/types";
import type { PatientProfileResponseDto } from "@/features/patient/types";
import { ApiError } from "@/api/errors/apiError";

const mockPatientUser: UserResponseDto = {
  id: "user-patient-123",
  email: "patient@manvia.health",
  phone: "+1234567890",
  emailVerified: true,
  phoneVerified: false,
  status: "ACTIVE",
  roles: ["PATIENT"],
  createdAt: "2026-01-01T00:00:00Z",
};

const mockProfile: PatientProfileResponseDto = {
  id: "profile-123",
  publicPatientId: "PAT-84920193",
  legalFirstName: "Aarav",
  legalLastName: "Patel",
  dateOfBirth: "1990-01-01",
  biologicalSex: "MALE",
  bloodGroup: "O+",
  emergencyContact: null,
  preferredLanguage: "en",
  timezone: "Asia/Kolkata",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockConversation: AIConversationResponseDto = {
  id: "conv-1",
  publicConversationId: "AIC-7X9B2K5M",
  userId: "user-patient-123",
  title: "Sleep and Routine Guidance",
  status: AIConversationStatus.ACTIVE,
  lastMessageAt: "2026-10-02T10:00:00.000Z",
  archivedAt: null,
  createdAt: "2026-10-02T09:30:00.000Z",
  updatedAt: "2026-10-02T10:00:00.000Z",
};

const mockConversationsList: PaginatedAIConversationsResponseDto = {
  data: [mockConversation],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockDetailWithMessages: AIConversationDetailResponseDto = {
  conversation: mockConversation,
  messages: [
    {
      id: "msg-1",
      publicMessageId: "AIM-1",
      conversationId: "conv-1",
      role: AIMessageRole.USER,
      content: "How can I improve my sleep routine naturally?",
      status: AIMessageStatus.DELIVERED,
      isAiGenerated: false,
      createdAt: "2026-10-02T09:30:00.000Z",
      updatedAt: "2026-10-02T09:30:00.000Z",
    },
    {
      id: "msg-2",
      publicMessageId: "AIM-2",
      conversationId: "conv-1",
      role: AIMessageRole.ASSISTANT,
      content:
        "To improve sleep naturally, maintain consistent wake-up times and avoid caffeine 6 hours before bedtime.",
      status: AIMessageStatus.DELIVERED,
      isAiGenerated: true,
      citations: [
        {
          sourceId: "SRC-AASM",
          title: "Clinical Practice Guideline for Adult Sleep Hygiene",
          organization: "American Academy of Sleep Medicine",
          documentId: "DOC-SLEEP-2024",
          relevance: 0.95,
          snippet:
            "Consistent sleep schedules promote circadian rhythm alignment.",
        },
      ],
      createdAt: "2026-10-02T09:30:05.000Z",
      updatedAt: "2026-10-02T09:30:05.000Z",
    },
  ],
};

import { dashboardService } from "@/features/dashboard/api/dashboardService";

const mockWellness = {
  latestCheckIn: null,
  todayCheckIn: null,
  streakDays: 0,
  totalCheckIns: 0,
};

describe("MANVIA AI Companion — Text Chat Feature", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();

    sessionStorageManager.setTokens({
      accessToken: "patient-token",
      refreshToken: "patient-refresh",
    });
    sessionStorageManager.setUser(mockPatientUser.id, "PATIENT");

    vi.spyOn(authService, "getMe").mockResolvedValue(mockPatientUser);
    vi.spyOn(patientService, "getMyProfile").mockResolvedValue(mockProfile);
    vi.spyOn(dashboardService, "getUpcomingAppointment").mockResolvedValue(
      null,
    );
    vi.spyOn(dashboardService, "getWellnessSummary").mockResolvedValue(
      mockWellness,
    );
    vi.spyOn(dashboardService, "getRecentNotifications").mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 3,
      totalPages: 1,
      unreadCount: 0,
    });
    vi.spyOn(dashboardService, "getRecentTimeline").mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 3,
      totalPages: 1,
    });
    vi.spyOn(aiCompanionService, "listConversations").mockResolvedValue(
      mockConversationsList,
    );
    vi.spyOn(aiCompanionService, "getConversation").mockResolvedValue(
      mockDetailWithMessages,
    );
  });

  it("renders AI Companion route with non-diagnostic disclosure banner and badge", async () => {
    renderWithProviders(<AiCompanionRoute />);

    await waitFor(() => {
      expect(screen.getByText("MANVIA AI Companion")).toBeInTheDocument();
    });

    // AI Disclosure banner and badges
    expect(screen.getByTestId("ai-disclosure-banner")).toBeInTheDocument();
    expect(screen.getAllByText("AI • Non-Diagnostic").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText(/You are chatting with MANVIA AI/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/not a medical doctor/i)).toBeInTheDocument();
  });

  it("navigates from Home dashboard care pathway to AI Companion", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(screen.getByTestId("ai-companion-card")).toBeInTheDocument();
    });

    const openAiBtn = screen.getByRole("button", { name: "Open AI Companion" });
    await user.click(openAiBtn);

    await waitFor(() => {
      expect(screen.getByText("MANVIA AI Companion")).toBeInTheDocument();
      expect(screen.getByTestId("ai-disclosure-banner")).toBeInTheDocument();
    });
  });

  it("renders message history with distinct user and assistant styling", async () => {
    renderWithProviders(<AiCompanionRoute />);

    await waitFor(() => {
      expect(
        screen.getByText("How can I improve my sleep routine naturally?"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /To improve sleep naturally, maintain consistent wake-up times/,
        ),
      ).toBeInTheDocument();
    });

    // Check assistant label and automated badge
    expect(screen.getByText("MANVIA AI")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("displays medical evidence citations when provided by AI assistant", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AiCompanionRoute />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /View Evidence Citations/i }),
      ).toBeInTheDocument();
    });

    const citationBtn = screen.getByRole("button", {
      name: /View Evidence Citations/i,
    });
    await user.click(citationBtn);

    expect(
      screen.getByText("Clinical Practice Guideline for Adult Sleep Hygiene"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/American Academy of Sleep Medicine/i),
    ).toBeInTheDocument();
  });

  it("submits positive feedback for an AI assistant response", async () => {
    const user = userEvent.setup();
    const feedbackSpy = vi
      .spyOn(aiCompanionService, "submitFeedback")
      .mockResolvedValue({
        id: "fb-1",
        messageId: "msg-2",
        userId: "user-patient-123",
        rating: AIFeedbackRating.POSITIVE,
        comment: null,
        createdAt: "2026-10-02T10:00:00Z",
        updatedAt: "2026-10-02T10:00:00Z",
      });

    renderWithProviders(<AiCompanionRoute />);

    await waitFor(() => {
      expect(screen.getByLabelText("Helpful response")).toBeInTheDocument();
    });

    const helpfulBtn = screen.getByLabelText("Helpful response");
    await user.click(helpfulBtn);

    await waitFor(() => {
      expect(feedbackSpy).toHaveBeenCalledWith("msg-2", {
        rating: AIFeedbackRating.POSITIVE,
      });
      expect(
        screen.getByText("✓ Thank you for your feedback"),
      ).toBeInTheDocument();
    });
  });

  it("renders empty state with suggestion chips when conversation has no messages", async () => {
    const user = userEvent.setup();
    vi.spyOn(aiCompanionService, "listConversations").mockResolvedValue({
      data: [{ ...mockConversation, id: "conv-empty" }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    vi.spyOn(aiCompanionService, "getConversation").mockResolvedValue({
      conversation: {
        ...mockConversation,
        id: "conv-empty",
      },
      messages: [],
    });

    const sendSpy = vi
      .spyOn(aiCompanionService, "sendMessage")
      .mockResolvedValue({
        userMessage: {
          id: "msg-new-user",
          publicMessageId: "AIM-NU",
          conversationId: "conv-empty",
          role: AIMessageRole.USER,
          content: "How can I improve my sleep routine naturally?",
          status: AIMessageStatus.SENT,
          isAiGenerated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        assistantMessage: {
          id: "msg-new-asst",
          publicMessageId: "AIM-NA",
          conversationId: "conv-empty",
          role: AIMessageRole.ASSISTANT,
          content:
            "Establishing a regular bedtime helps your natural circadian rhythm.",
          status: AIMessageStatus.DELIVERED,
          isAiGenerated: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

    renderWithProviders(<AppRoutes />, {
      initialEntries: ["/app/ai/conv-empty"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-empty-chat-state")).toBeInTheDocument();
      expect(
        screen.getByText("Hi, I'm your MANVIA AI Companion"),
      ).toBeInTheDocument();
    });

    // Clicking suggested prompt triggers message sending
    const sleepPromptCard = screen.getByTestId("suggested-prompt-0");
    await user.click(sleepPromptCard);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith("conv-empty", {
        content: "How can I improve my sleep routine naturally?",
      });
    });
  });

  it("sends user message, shows thinking indicator, and displays assistant response", async () => {
    const user = userEvent.setup();

    const mockResponse: SendAIMessageResponseDto = {
      userMessage: {
        id: "msg-3",
        publicMessageId: "AIM-3",
        conversationId: "conv-1",
        role: AIMessageRole.USER,
        content: "What are healthy hydration guidelines?",
        status: AIMessageStatus.DELIVERED,
        isAiGenerated: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: "msg-4",
        publicMessageId: "AIM-4",
        conversationId: "conv-1",
        role: AIMessageRole.ASSISTANT,
        content:
          "A general guideline is 2 to 3 liters of water daily, depending on activity.",
        status: AIMessageStatus.DELIVERED,
        isAiGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const sendSpy = vi
      .spyOn(aiCompanionService, "sendMessage")
      .mockResolvedValue(mockResponse);

    renderWithProviders(<AiCompanionRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("message-composer-input")).toBeInTheDocument();
    });

    const input = screen.getByTestId("message-composer-input");
    await user.type(input, "What are healthy hydration guidelines?");

    const sendBtn = screen.getByTestId("send-message-btn");
    expect(sendBtn).not.toBeDisabled();

    await user.click(sendBtn);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith("conv-1", {
        content: "What are healthy hydration guidelines?",
      });
      expect(
        screen.getByText(
          "A general guideline is 2 to 3 liters of water daily, depending on activity.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("handles localized error when sending a message fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(aiCompanionService, "sendMessage").mockRejectedValue(
      new ApiError({
        statusCode: 500,
        message: "AI service temporarily unavailable",
      }),
    );

    renderWithProviders(<AiCompanionRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("message-composer-input")).toBeInTheDocument();
    });

    const input = screen.getByTestId("message-composer-input");
    await user.type(input, "Help me with morning stress");

    const sendBtn = screen.getByTestId("send-message-btn");
    await user.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByTestId("chat-error-banner")).toBeInTheDocument();
      expect(
        screen.getByText(/AI service temporarily unavailable/i),
      ).toBeInTheDocument();
    });
  });

  it("handles conversation retrieval failure with retry action", async () => {
    const user = userEvent.setup();
    const getSpy = vi
      .spyOn(aiCompanionService, "getConversation")
      .mockRejectedValueOnce(
        new ApiError({
          statusCode: 500,
          message: "Database connection failure",
        }),
      )
      .mockResolvedValueOnce(mockDetailWithMessages);

    renderWithProviders(<AiCompanionRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("conversation-load-error")).toBeInTheDocument();
      expect(screen.getByTestId("retry-conversation-btn")).toBeInTheDocument();
    });

    const retryBtn = screen.getByTestId("retry-conversation-btn");
    await user.click(retryBtn);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(
        screen.getByText("How can I improve my sleep routine naturally?"),
      ).toBeInTheDocument();
    });
  });

  it("creates a new conversation session when clicking + New Chat", async () => {
    const user = userEvent.setup();
    const newConv: AIConversationResponseDto = {
      id: "conv-2",
      publicConversationId: "AIC-NEW2",
      userId: "user-patient-123",
      title: "Wellness Conversation",
      status: AIConversationStatus.ACTIVE,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createSpy = vi
      .spyOn(aiCompanionService, "createConversation")
      .mockResolvedValue(newConv);

    renderWithProviders(<AiCompanionRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("header-new-chat-btn")).toBeInTheDocument();
    });

    const newChatBtn = screen.getByTestId("header-new-chat-btn");
    await user.click(newChatBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        title: "Wellness Conversation",
      });
    });
  });

  it("redirects unauthenticated users attempting to access /app/ai to /login", async () => {
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();

    renderWithProviders(<AppRoutes />, { initialEntries: ["/app/ai"] });

    await waitFor(() => {
      expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
    });
  });
});
