import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { PatientHomeRoute } from "@/routes/PatientHomeRoute";
import { dashboardService } from "@/features/dashboard/api/dashboardService";
import { patientService } from "@/features/patient/api/patientService";
import { authService } from "@/auth/authService";
import { sessionStorageManager } from "@/auth/sessionStorage";
import type {
  AppointmentResponseDto,
  WellnessSummaryResponseDto,
  PaginatedNotificationsResponseDto,
  PaginatedTimelineResponseDto,
} from "@/features/dashboard/types";
import type { PatientProfileResponseDto } from "@/features/patient/types";
import type { UserResponseDto } from "@/auth/types";
import { ApiError } from "@/api/errors/apiError";

const mockUser: UserResponseDto = {
  id: "user-123",
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

const mockAppointment: AppointmentResponseDto = {
  id: "apt-1",
  publicAppointmentId: "APT-84729104",
  patientId: "profile-123",
  doctorId: "doc-1",
  doctorDisplayName: "Dr. Gregory House, MD",
  consultationOfferId: "offer-1",
  offerTitle: "General Clinical Consultation",
  durationMinutes: 30,
  fee: 75,
  currency: "USD",
  startAt: "2026-10-15T10:00:00.000Z",
  endAt: "2026-10-15T10:30:00.000Z",
  status: "CONFIRMED",
};

const mockWellnessPending: WellnessSummaryResponseDto = {
  latestCheckIn: null,
  todayCheckIn: null,
  streakDays: 4,
  totalCheckIns: 18,
};

const mockWellnessCompleted: WellnessSummaryResponseDto = {
  latestCheckIn: {
    id: "checkin-1",
    publicCheckInId: "CHK-123",
    patientId: "profile-123",
    checkInDate: "2026-10-02",
    moodScore: 4,
    stressScore: 2,
    energyScore: 4,
    sleepQualityScore: 5,
    sleepHours: 8,
    journalReflection: "Feeling rested and energized",
    createdAt: "2026-10-02T08:00:00.000Z",
    updatedAt: "2026-10-02T08:00:00.000Z",
  },
  todayCheckIn: {
    id: "checkin-1",
    publicCheckInId: "CHK-123",
    patientId: "profile-123",
    checkInDate: "2026-10-02",
    moodScore: 4,
    stressScore: 2,
    energyScore: 4,
    sleepQualityScore: 5,
    sleepHours: 8,
    journalReflection: "Feeling rested and energized",
    createdAt: "2026-10-02T08:00:00.000Z",
    updatedAt: "2026-10-02T08:00:00.000Z",
  },
  streakDays: 5,
  totalCheckIns: 19,
};

const mockNotifications: PaginatedNotificationsResponseDto = {
  data: [
    {
      id: "notif-1",
      publicNotificationId: "NOT-12345",
      userId: "user-123",
      type: "APPOINTMENT_CONFIRMED",
      title: "Appointment Confirmed",
      body: "Your consultation with Dr. Gregory House has been confirmed.",
      severity: "INFO",
      isRead: false,
      createdAt: "2026-10-02T07:00:00.000Z",
      updatedAt: "2026-10-02T07:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 3,
  totalPages: 1,
  unreadCount: 1,
};

const mockTimeline: PaginatedTimelineResponseDto = {
  data: [
    {
      id: "evt-1",
      publicEventId: "EVT-10293847",
      patientId: "profile-123",
      eventType: "WELLNESS_CHECK_IN",
      title: "Daily Wellness Check-in Logged",
      summary: "Recorded mood, sleep, and reflection",
      sourceType: "WELLNESS_CHECK_IN",
      eventTimestamp: "2026-10-02T08:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 3,
  totalPages: 1,
};

describe("MANVIA Patient Home / Care Journey Dashboard Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.setTokens({
      accessToken: "mock-patient-access-token",
      refreshToken: "mock-patient-refresh-token",
    });
    vi.spyOn(authService, "getMe").mockResolvedValue(mockUser);
    vi.spyOn(patientService, "getMyProfile").mockResolvedValue(mockProfile);
    vi.spyOn(dashboardService, "getUpcomingAppointment").mockResolvedValue(
      mockAppointment,
    );
    vi.spyOn(dashboardService, "getWellnessSummary").mockResolvedValue(
      mockWellnessPending,
    );
    vi.spyOn(dashboardService, "getRecentNotifications").mockResolvedValue(
      mockNotifications,
    );
    vi.spyOn(dashboardService, "getRecentTimeline").mockResolvedValue(
      mockTimeline,
    );
  });

  it("renders personalized greeting and patient public identifier", async () => {
    renderWithProviders(<PatientHomeRoute />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(screen.getByTestId("greeting-title")).toHaveTextContent(/Aarav/i);
    });

    expect(screen.getByTestId("patient-public-id")).toHaveTextContent(
      "PAT-84920193",
    );
    expect(
      screen.getByTestId("patient-care-workspace-heading"),
    ).toBeInTheDocument();
  });

  it("renders upcoming appointment details with exact backend status", async () => {
    renderWithProviders(<PatientHomeRoute />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(
        screen.getByTestId("upcoming-appointment-card"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("appointment-doctor-name")).toHaveTextContent(
      "Dr. Gregory House, MD",
    );
    expect(screen.getByTestId("appointment-status-badge")).toHaveTextContent(
      "CONFIRMED",
    );
    expect(screen.getByTestId("view-appointment-btn")).toBeInTheDocument();
  });

  it("renders empty state when there are no upcoming appointments", async () => {
    vi.spyOn(dashboardService, "getUpcomingAppointment").mockResolvedValueOnce(
      null,
    );

    renderWithProviders(<PatientHomeRoute />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(
        screen.getByTestId("no-upcoming-appointment-card"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("no-appointment-heading")).toHaveTextContent(
      "No Upcoming Appointments",
    );
    expect(screen.getByTestId("explore-care-button")).toBeInTheDocument();
  });

  it("displays localized retry card when appointment endpoint fails", async () => {
    const appointmentSpy = vi
      .spyOn(dashboardService, "getUpcomingAppointment")
      .mockRejectedValueOnce(
        new ApiError({
          statusCode: 500,
          error: "INTERNAL_SERVER_ERROR",
          message: "Unable to reach appointment service",
        }),
      );

    renderWithProviders(<PatientHomeRoute />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(screen.getByTestId("appointment-error-card")).toBeInTheDocument();
      expect(
        screen.getByText("Unable to reach appointment service"),
      ).toBeInTheDocument();
    });

    // Resolve successfully on retry
    appointmentSpy.mockResolvedValueOnce(mockAppointment);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("appointment-retry-button"));

    await waitFor(() => {
      expect(
        screen.getByTestId("upcoming-appointment-card"),
      ).toBeInTheDocument();
    });
  });

  it("renders wellness summary with pending check-in status and streak", async () => {
    renderWithProviders(<PatientHomeRoute />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(screen.getByTestId("wellness-summary-card")).toBeInTheDocument();
    });

    expect(screen.getByTestId("wellness-status-badge")).toHaveTextContent(
      "Pending Check-in",
    );
    expect(screen.getByTestId("wellness-streak-badge")).toHaveTextContent(
      "4 Day Streak",
    );
    expect(screen.getByTestId("wellness-cta-button")).toHaveTextContent(
      "Start Check-in",
    );
  });

  it("renders wellness summary with completed status when logged for today", async () => {
    vi.spyOn(dashboardService, "getWellnessSummary").mockResolvedValueOnce(
      mockWellnessCompleted,
    );

    renderWithProviders(<PatientHomeRoute />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(screen.getByTestId("wellness-status-badge")).toHaveTextContent(
        "Completed Today",
      );
    });

    expect(screen.getByTestId("wellness-streak-badge")).toHaveTextContent(
      "5 Day Streak",
    );
    expect(screen.getByTestId("wellness-cta-button")).toHaveTextContent(
      "View Wellness Tracker",
    );
  });

  it("clearly distinguishes AI Companion from licensed medical doctor in care pathways", async () => {
    renderWithProviders(<PatientHomeRoute />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(screen.getByTestId("care-journey-section")).toBeInTheDocument();
    });

    // AI Companion: non-diagnostic assistant
    expect(screen.getByTestId("ai-companion-card")).toBeInTheDocument();
    expect(screen.getByTestId("ai-companion-badge")).toHaveTextContent(
      "AI • Non-Diagnostic",
    );
    expect(
      screen.getByRole("button", { name: "Open AI Companion" }),
    ).toBeInTheDocument();

    // Real Doctor: licensed clinician
    expect(screen.getByTestId("real-doctor-card")).toBeInTheDocument();
    expect(screen.getByTestId("real-doctor-badge")).toHaveTextContent(
      "Licensed Clinicians",
    );
    expect(
      screen.getByRole("button", { name: "Consult a Doctor" }),
    ).toBeInTheDocument();

    // Health Records
    expect(screen.getByTestId("health-records-card")).toBeInTheDocument();
  });

  it("renders recent notifications and unread count badge", async () => {
    renderWithProviders(<PatientHomeRoute />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(
        screen.getByTestId("notifications-summary-card"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("unread-count-badge")).toHaveTextContent(
      "1 Unread",
    );
    expect(screen.getByTestId("notification-item-notif-1")).toBeInTheDocument();
  });

  it("renders recent timeline activity feed", async () => {
    renderWithProviders(<PatientHomeRoute />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(screen.getByTestId("recent-timeline-card")).toBeInTheDocument();
    });

    expect(screen.getByTestId("timeline-event-evt-1")).toBeInTheDocument();
    expect(
      screen.getByText("Daily Wellness Check-in Logged"),
    ).toBeInTheDocument();
  });

  it("tolerates partial failure: appointment failure does not break wellness or greeting", async () => {
    vi.spyOn(dashboardService, "getUpcomingAppointment").mockRejectedValueOnce(
      new ApiError({
        statusCode: 500,
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed appointment lookup",
      }),
    );

    renderWithProviders(<PatientHomeRoute />, { initialEntries: ["/app"] });

    // Appointment shows error card
    await waitFor(() => {
      expect(screen.getByTestId("appointment-error-card")).toBeInTheDocument();
    });

    // Unrelated sections still render properly!
    expect(screen.getByTestId("greeting-title")).toBeInTheDocument();
    expect(screen.getByTestId("wellness-summary-card")).toBeInTheDocument();
    expect(screen.getByTestId("care-journey-section")).toBeInTheDocument();
    expect(
      screen.getByTestId("notifications-summary-card"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("recent-timeline-card")).toBeInTheDocument();
  });
});
