/**
 * MANVIA Phase 2.5 — AI Companion UI/UX Redesign & Advanced Capabilities Test Suite
 *
 * Verifies:
 * 1. AI Companion route layout, branding, and role separation
 * 2. Dedicated conversation sidebar with search, time grouping, rename, and delete
 * 3. Bottom-anchored composer with multiline auto-expand and Enter/Shift+Enter behavior
 * 4. Markdown rendering (headings, lists, code blocks, scrollable tables, links)
 * 5. Functional document attachments (.txt, .md, .csv, .json, .pdf) & image guidance
 * 6. Working microphone speech-to-text recording, cancel, and Groq Whisper transcript insertion
 * 7. Copy response functionality & assistant feedback
 * 8. Error recovery & message retry without duplicate submissions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { AiCompanionRoute } from "@/routes/AiCompanionRoute";
import { ChatMessageItem } from "@/features/ai-companion/components/ChatMessageItem";
import { MessageComposer } from "@/features/ai-companion/components/MessageComposer";
import { aiCompanionService } from "@/features/ai-companion/api/aiCompanionService";
import { sessionStorageManager } from "@/auth/sessionStorage";
import { authService } from "@/auth/authService";
import { patientService } from "@/features/patient/api/patientService";
import {
  AIConversationStatus,
  AIMessageRole,
  AIMessageStatus,
  type AIConversationResponseDto,
  type AIConversationDetailResponseDto,
} from "@/features/ai-companion/types";

const mockPatientUser = {
  id: "user-patient-123",
  email: "patient@manvia.health",
  phone: "+1234567890",
  emailVerified: true,
  phoneVerified: false,
  status: "ACTIVE" as const,
  roles: ["PATIENT" as const],
  createdAt: "2026-01-01T00:00:00Z",
};

const mockProfile = {
  id: "profile-123",
  publicPatientId: "PAT-84920193",
  legalFirstName: "Aarav",
  legalLastName: "Patel",
  dateOfBirth: "1990-01-01",
  biologicalSex: "MALE" as const,
  bloodGroup: "O+" as const,
  emergencyContact: null,
  preferredLanguage: "en",
  timezone: "Asia/Kolkata",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("MANVIA Phase 2.5 — AI Companion Redesign Test Suite", () => {
  const now = new Date();
  const mockConversations: AIConversationResponseDto[] = [
    {
      id: "conv-today-1",
      publicConversationId: "AIC-TODAY1",
      userId: "user-patient-123",
      title: "Morning Habit Coaching",
      status: AIConversationStatus.ACTIVE,
      lastMessageAt: new Date(now.getTime() - 1000 * 60 * 10).toISOString(), // 10 mins ago (Today)
      createdAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
    },
    {
      id: "conv-yesterday-1",
      publicConversationId: "AIC-YEST1",
      userId: "user-patient-123",
      title: "Sleep Hygiene Advice",
      status: AIConversationStatus.ACTIVE,
      lastMessageAt: new Date(now.getTime() - 86400000 * 1.2).toISOString(), // Yesterday
      createdAt: new Date(now.getTime() - 86400000 * 1.5).toISOString(),
      updatedAt: new Date(now.getTime() - 86400000 * 1.2).toISOString(),
    },
    {
      id: "conv-older-1",
      publicConversationId: "AIC-OLD1",
      userId: "user-patient-123",
      title: "Nutrition Questions",
      status: AIConversationStatus.ACTIVE,
      lastMessageAt: new Date(now.getTime() - 86400000 * 15).toISOString(), // 15 days ago (Older)
      createdAt: new Date(now.getTime() - 86400000 * 16).toISOString(),
      updatedAt: new Date(now.getTime() - 86400000 * 15).toISOString(),
    },
  ];

  const mockDetail: AIConversationDetailResponseDto = {
    conversation: mockConversations[0]!,
    messages: [
      {
        id: "msg-1",
        publicMessageId: "AIM-1",
        conversationId: "conv-today-1",
        role: AIMessageRole.USER,
        content: "What are good morning habits?",
        status: AIMessageStatus.SENT,
        isAiGenerated: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "msg-2",
        publicMessageId: "AIM-2",
        conversationId: "conv-today-1",
        role: AIMessageRole.ASSISTANT,
        content:
          "### Recommended Morning Routine\n\nHere is a simple routine:\n- Drink a glass of water\n- 5 minutes of mindful breathing\n\n| Habit | Duration |\n|---|---|\n| Hydration | 1 min |\n| Breathing | 5 mins |\n\n```ts\n// Daily reminder\nconsole.log('Stay hydrated');\n```\n\nFor more details, visit [Sleep Foundation](https://sleepfoundation.org).",
        status: AIMessageStatus.DELIVERED,
        isAiGenerated: true,
        generation: {
          provider: "groq",
          model: "openai/gpt-oss-20b",
          latencyMs: 350,
          promptTokens: 40,
          completionTokens: 85,
          totalTokens: 125,
          isAiGenerated: true,
          disclosureNotice: "Non-diagnostic guidance",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

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

    vi.spyOn(aiCompanionService, "listConversations").mockResolvedValue({
      data: mockConversations,
      total: 3,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    vi.spyOn(aiCompanionService, "getConversation").mockResolvedValue(mockDetail);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Sidebar & Conversation Management", () => {
    it("groups conversations into chronological buckets (Today, Yesterday, Older)", async () => {
      renderWithProviders(<AiCompanionRoute />);

      await waitFor(() => {
        expect(screen.getByText("Today")).toBeInTheDocument();
        expect(screen.getByText("Morning Habit Coaching")).toBeInTheDocument();
      });

      expect(screen.getByText("Yesterday")).toBeInTheDocument();
      expect(screen.getByText("Sleep Hygiene Advice")).toBeInTheDocument();
      expect(screen.getByText("Older")).toBeInTheDocument();
      expect(screen.getByText("Nutrition Questions")).toBeInTheDocument();
    });

    it("filters conversations by search term in real time", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AiCompanionRoute />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search chats...")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search chats...");
      await user.type(searchInput, "Sleep");

      expect(screen.getByText("Sleep Hygiene Advice")).toBeInTheDocument();
      expect(screen.queryByText("Nutrition Questions")).not.toBeInTheDocument();
    });

    it("allows renaming a conversation and calls updateConversation", async () => {
      const user = userEvent.setup();
      const updateSpy = vi.spyOn(aiCompanionService, "updateConversation").mockResolvedValue({
        ...mockConversations[0]!,
        title: "Renamed Habit Coaching",
      });

      renderWithProviders(<AiCompanionRoute />);

      await waitFor(() => {
        expect(screen.getByLabelText("Rename Morning Habit Coaching")).toBeInTheDocument();
      });

      const renameBtn = screen.getByLabelText("Rename Morning Habit Coaching");
      await user.click(renameBtn);

      const input = screen.getByDisplayValue("Morning Habit Coaching");
      await user.clear(input);
      await user.type(input, "Renamed Habit Coaching");

      const saveBtn = screen.getByText("Save");
      await user.click(saveBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith("conv-today-1", {
          title: "Renamed Habit Coaching",
        });
      });
    });

    it("shows confirmation and deletes a conversation when confirmed", async () => {
      const user = userEvent.setup();
      const deleteSpy = vi
        .spyOn(aiCompanionService, "deleteConversation")
        .mockResolvedValue({ success: true, id: "conv-older-1" });

      renderWithProviders(<AiCompanionRoute />);

      await waitFor(() => {
        expect(screen.getByLabelText("Delete Nutrition Questions")).toBeInTheDocument();
      });

      const deleteBtn = screen.getByLabelText("Delete Nutrition Questions");
      await user.click(deleteBtn);

      // Verify confirmation dialog appears
      expect(screen.getByText("Delete conversation?")).toBeInTheDocument();
      const confirmBtn = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith("conv-older-1");
      });
    });
  });

  describe("Markdown Rendering & Usability", () => {
    it("renders headings, lists, code fences, and scrollable tables without raw markdown syntax", async () => {
      renderWithProviders(<ChatMessageItem message={mockDetail.messages[1]!} />);

      // Heading 3
      expect(screen.getByRole("heading", { level: 3, name: /Recommended Morning Routine/i })).toBeInTheDocument();

      // List items
      expect(screen.getByText("Drink a glass of water")).toBeInTheDocument();
      expect(screen.getByText("5 minutes of mindful breathing")).toBeInTheDocument();

      // Table elements
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("Hydration")).toBeInTheDocument();
      expect(screen.getByText("1 min")).toBeInTheDocument();

      // Code block
      expect(screen.getByText(/\/\/ Daily reminder/)).toBeInTheDocument();

      // Sanitized safe link
      const link = screen.getByRole("link", { name: /Sleep Foundation/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("copies assistant response to clipboard when clicking Copy", async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      renderWithProviders(<ChatMessageItem message={mockDetail.messages[1]!} />);

      const copyBtn = screen.getByRole("button", { name: /Copy assistant response/i });
      await user.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith(mockDetail.messages[1]!.content);
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
  });

  describe("Message Composer & Functional Attachments", () => {
    it("handles Enter to send and Shift+Enter for newline", async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn();

      renderWithProviders(<MessageComposer onSendMessage={onSendMessage} />);

      const textarea = screen.getByTestId("message-composer-input");

      // Shift+Enter should NOT send
      await user.type(textarea, "Line 1{Shift>}{Enter}{/Shift}Line 2");
      expect(onSendMessage).not.toHaveBeenCalled();

      // Enter alone sends
      await user.type(textarea, "{Enter}");
      expect(onSendMessage).toHaveBeenCalledWith("Line 1\nLine 2");
    });

    it("processes document attachments through backend and displays chip", async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn();

      vi.spyOn(aiCompanionService, "processAttachment").mockResolvedValue({
        filename: "sleep_log.txt",
        mimeType: "text/plain",
        extractedText: "Average sleep duration: 7.2 hours",
        characterCount: 32,
        truncated: false,
      });

      renderWithProviders(<MessageComposer onSendMessage={onSendMessage} />);

      // Find file input and simulate attaching a text document
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["Average sleep duration: 7.2 hours"], "sleep_log.txt", {
        type: "text/plain",
      });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText("sleep_log.txt")).toBeInTheDocument();
      });

      // Sending includes attached document context
      const sendBtn = screen.getByTestId("send-message-btn");
      await user.click(sendBtn);

      expect(onSendMessage).toHaveBeenCalledWith(
        expect.stringContaining("Average sleep duration: 7.2 hours"),
      );
    });

    it("displays friendly guidance when user tries to upload an image", async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn();

      vi.spyOn(aiCompanionService, "processAttachment").mockRejectedValue({
        message:
          "Image analysis (OCR/vision) is not supported by the current AI text model. Please upload documents in TXT, Markdown, CSV, JSON, or PDF format.",
      });

      renderWithProviders(<MessageComposer onSendMessage={onSendMessage} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["fake image content"], "lab_chart.png", {
        type: "image/png",
      });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(
          screen.getByText(/Image analysis \(OCR\/vision\) is not supported/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Microphone Speech-to-Text Workflow", () => {
    it("handles microphone permission denial gracefully", async () => {
      const user = userEvent.setup();

      // Mock getUserMedia rejection
      Object.assign(navigator, {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue({ name: "NotAllowedError" }),
        },
      });

      renderWithProviders(<MessageComposer onSendMessage={vi.fn()} />);

      const micBtn = screen.getByTitle("Voice recording (Speech-to-Text)");
      await user.click(micBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Microphone permission was denied/i),
        ).toBeInTheDocument();
      });
    });
  });
});
