/**
 * MANVIA Frontend — Phase 2: AI Core Reliability, Wellness Foundation & Patient Journey Integration
 * Automated Verification Suite:
 * 1. AI Companion retry functionality on send failure
 * 2. Prevention of duplicate submissions while AI message is in-flight
 * 3. AI Companion journey navigation links to Wellness (/app/wellness) and Care (/app/doctors)
 * 4. Wellness Page rendering with non-diagnostic disclaimer and check-in modal trigger
 * 5. Patient Home journey integration (Care Pathways, Wellness Summary, Timeline feed)
 * 6. Protected route boundaries for AI and Wellness
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { AppRoutes } from "@/app/router/routes";
import { AiCompanionRoute } from "@/routes/AiCompanionRoute";
import { WellnessPage } from "@/features/wellness/WellnessPage";
import { aiCompanionService } from "@/features/ai-companion/api/aiCompanionService";
import { sessionStorageManager } from "@/auth/sessionStorage";
import { authService } from "@/auth/authService";
import { patientService } from "@/features/patient/api/patientService";
import { dashboardService } from "@/features/dashboard/api/dashboardService";
import {
  AIConversationStatus,
  AIMessageRole,
  AIMessageStatus,
  type AIConversationDetailResponseDto,
  type AIConversationResponseDto,
  type PaginatedAIConversationsResponseDto,
  type SendAIMessageResponseDto,
} from "@/features/ai-companion/types";
import type { UserResponseDto } from "@/auth/types";
import type { PatientProfileResponseDto } from "@/features/patient/types";
import { ApiError } from "@/api/errors/apiError";

const mockPatientUser: UserResponseDto = {
  id: "user-patient-p2",
  email: "patient.phase2@manvia.health",
  phone: "+1234567890",
  emailVerified: true,
  phoneVerified: false,
  status: "ACTIVE",
  roles: ["PATIENT"],
  createdAt: "2026-01-01T00:00:00Z",
};

const mockProfile: PatientProfileResponseDto = {
  id: "profile-p2",
  publicPatientId: "PAT-PHASE2-01",
  legalFirstName: "Maya",
  legalLastName: "Sharma",
  dateOfBirth: "1992-05-15",
  biologicalSex: "FEMALE",
  bloodGroup: "A+",
  emergencyContact: null,
  preferredLanguage: "en",
  timezone: "UTC",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockConversation: AIConversationResponseDto = {
  id: "conv-p2-1",
  publicConversationId: "AIC-PHASE2-99",
  userId: "user-patient-p2",
  title: "Daily Wellness Guidance",
  status: AIConversationStatus.ACTIVE,
  lastMessageAt: "2026-10-09T10:00:00.000Z",
  archivedAt: null,
  createdAt: "2026-10-09T09:30:00.000Z",
  updatedAt: "2026-10-09T10:00:00.000Z",
};

const mockConversationsList: PaginatedAIConversationsResponseDto = {
  data: [mockConversation],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockDetail: AIConversationDetailResponseDto = {
  conversation: mockConversation,
  messages: [
    {
      id: "msg-p2-1",
      publicMessageId: "AIM-P2-01",
      conversationId: "conv-p2-1",
      role: AIMessageRole.USER,
      content: "Can you recommend a gentle evening routine for sleep?",
      status: AIMessageStatus.DELIVERED,
      isAiGenerated: false,
      createdAt: "2026-10-09T09:30:00.000Z",
      updatedAt: "2026-10-09T09:30:00.000Z",
    },
    {
      id: "msg-p2-2",
      publicMessageId: "AIM-P2-02",
      conversationId: "conv-p2-1",
      role: AIMessageRole.ASSISTANT,
      content:
        "A restful routine includes dimming lights 1 hour before bed, gentle stretching, and avoiding screens.",
      status: AIMessageStatus.DELIVERED,
      isAiGenerated: true,
      createdAt: "2026-10-09T09:30:05.000Z",
      updatedAt: "2026-10-09T09:30:05.000Z",
    },
  ],
};

function setupAuthenticatedPatient() {
  const dummyToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
    JSON.stringify({
      sub: mockPatientUser.id,
      roles: ["PATIENT"],
      activeRole: "PATIENT",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  )}.dummy-sig`;

  sessionStorageManager.setTokens({
    accessToken: dummyToken,
    refreshToken: "dummy-refresh-token",
  });
  sessionStorageManager.setUser(mockPatientUser.id, "PATIENT");
  vi.spyOn(authService, "getMe").mockResolvedValue(mockPatientUser);
  vi.spyOn(patientService, "getMyProfile").mockResolvedValue(mockProfile);

  vi.spyOn(dashboardService, "getUpcomingAppointment").mockResolvedValue(null);
  vi.spyOn(dashboardService, "getWellnessSummary").mockResolvedValue({
    latestCheckIn: null,
    todayCheckIn: null,
    streakDays: 3,
    totalCheckIns: 12,
  });
  vi.spyOn(dashboardService, "getRecentNotifications").mockResolvedValue({
    data: [],
    total: 0,
    page: 1,
    limit: 3,
    totalPages: 0,
    unreadCount: 0,
  });
  vi.spyOn(dashboardService, "getRecentTimeline").mockResolvedValue({
    data: [],
    total: 0,
    page: 1,
    limit: 3,
    totalPages: 0,
  });
}

describe("MANVIA Phase 2 — AI Core Reliability, Wellness & Patient Journey Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();

    // Default AI companion mocks
    vi.spyOn(aiCompanionService, "listConversations").mockResolvedValue(mockConversationsList);
    vi.spyOn(aiCompanionService, "getConversation").mockResolvedValue(mockDetail);
  });

  it("provides journey navigation links from AI Companion to Wellness and Care/Doctors", async () => {
    setupAuthenticatedPatient();

    renderWithProviders(<AiCompanionRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-companion-view")).toBeInTheDocument();
    });

    const wellnessLink = screen.getByTestId("ai-journey-wellness-link");
    expect(wellnessLink).toBeInTheDocument();
    expect(wellnessLink).toHaveAttribute("href", "/app/wellness");

    const careLink = screen.getByTestId("ai-journey-care-link");
    expect(careLink).toBeInTheDocument();
    expect(careLink).toHaveAttribute("href", "/app/doctors");
  });

  it("handles message send failure with recoverable state and Retry Message action", async () => {
    setupAuthenticatedPatient();
    const user = userEvent.setup();

    // First attempt fails with transient provider timeout
    const sendMock = vi
      .spyOn(aiCompanionService, "sendMessage")
      .mockRejectedValueOnce(new ApiError("AI service request timed out after 15s. Please try again.", 504))
      .mockResolvedValueOnce({
        userMessage: {
          id: "msg-p2-new",
          publicMessageId: "AIM-P2-NEW",
          conversationId: "conv-p2-1",
          role: AIMessageRole.USER,
          content: "What are good hydration habits?",
          status: AIMessageStatus.SENT,
          isAiGenerated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        assistantMessage: {
          id: "msg-p2-resp",
          publicMessageId: "AIM-P2-RESP",
          conversationId: "conv-p2-1",
          role: AIMessageRole.ASSISTANT,
          content: "Stay hydrated by drinking water consistently across your workday.",
          status: AIMessageStatus.DELIVERED,
          isAiGenerated: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        medicalContextUsed: false,
        citations: [],
      });

    renderWithProviders(<AiCompanionRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-companion-view")).toBeInTheDocument();
    });

    const textarea = screen.getByTestId("message-composer-input");
    await user.type(textarea, "What are good hydration habits?");
    await user.click(screen.getByTestId("send-message-btn"));

    // Verify error banner appears with message and retry button
    await waitFor(() => {
      expect(screen.getByTestId("chat-error-banner")).toBeInTheDocument();
      expect(screen.getByText(/AI service request timed out/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByTestId("retry-send-message-btn");
    expect(retryBtn).toBeInTheDocument();

    // Click retry
    await user.click(retryBtn);

    // Verify second call succeeded and error banner was dismissed
    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledTimes(2);
      expect(screen.queryByTestId("chat-error-banner")).not.toBeInTheDocument();
    });
  });

  it("prevents duplicate submissions while message is in-flight", async () => {
    setupAuthenticatedPatient();
    const user = userEvent.setup();

    // Simulate delayed response
    let resolveSend: (val: SendAIMessageResponseDto) => void;
    const sendPromise = new Promise<SendAIMessageResponseDto>((resolve) => {
      resolveSend = resolve;
    });

    vi.spyOn(aiCompanionService, "sendMessage").mockImplementation(() => sendPromise);

    renderWithProviders(<AiCompanionRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-companion-view")).toBeInTheDocument();
    });

    const textarea = screen.getByTestId("message-composer-input");
    await user.type(textarea, "Tell me about stress relief.");
    const sendButton = screen.getByTestId("send-message-btn");
    await user.click(sendButton);

    // While sending, input and button should be disabled
    expect(sendButton).toBeDisabled();
    expect(textarea).toBeDisabled();

    // Resolve in-flight request
    resolveSend!({
      userMessage: {
        id: "msg-3",
        publicMessageId: "AIM-3",
        conversationId: "conv-p2-1",
        role: AIMessageRole.USER,
        content: "Tell me about stress relief.",
        status: AIMessageStatus.SENT,
        isAiGenerated: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: "msg-4",
        publicMessageId: "AIM-4",
        conversationId: "conv-p2-1",
        role: AIMessageRole.ASSISTANT,
        content: "Try taking 3 deep diaphragmatic breaths to reset your nervous system.",
        status: AIMessageStatus.DELIVERED,
        isAiGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      medicalContextUsed: false,
      citations: [],
    });

    await waitFor(() => {
      expect(textarea).not.toBeDisabled();
    });
  });

  it("renders Wellness Page with non-diagnostic notice and check-in modal trigger", async () => {
    setupAuthenticatedPatient();

    renderWithProviders(<WellnessPage />);

    expect(screen.getByTestId("wellness-page")).toBeInTheDocument();
    expect(screen.getByText(/Safety & Non-Diagnostic Notice/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Daily Check-in/i })).toBeInTheDocument();
  });

  it("displays unified care pathways on Patient Home connecting AI, Doctors, and Records", async () => {
    setupAuthenticatedPatient();

    renderWithProviders(<AppRoutes />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(screen.getByTestId("patient-home-dashboard")).toBeInTheDocument();
    });

    // Check all 3 care pathway cards
    expect(screen.getByTestId("ai-companion-card")).toBeInTheDocument();
    expect(screen.getByTestId("real-doctor-card")).toBeInTheDocument();
    expect(screen.getByTestId("health-records-card")).toBeInTheDocument();

    // Verify CTAs point to authoritative routes
    const aiCta = screen.getByTestId("ai-companion-cta");
    expect(aiCta.closest("a")).toHaveAttribute("href", "/app/ai");

    const doctorCta = screen.getByTestId("real-doctor-cta");
    expect(doctorCta.closest("a")).toHaveAttribute("href", "/app/doctors");

    // Verify Daily Wellness section is visible and points to /app/wellness
    await waitFor(() => {
      expect(screen.getByTestId("wellness-summary-card")).toBeInTheDocument();
    });
    const wellnessCta = screen.getByTestId("wellness-cta-button");
    expect(wellnessCta.closest("a")).toHaveAttribute("href", "/app/wellness");
  });

  it("requires authentication for AI Companion and redirects unauthenticated visitors to login", async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ["/app/ai"] });

    await waitFor(() => {
      expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
    });
  });

  it("requires authentication for Wellness Page and redirects unauthenticated visitors to login", async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ["/app/wellness"] });

    await waitFor(() => {
      expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
    });
  });
});
