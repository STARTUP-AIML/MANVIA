import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { AppRoutes } from "@/app/router/routes";
import { sessionStorageManager } from "@/auth/sessionStorage";
import { authService } from "@/auth/authService";
import { patientService } from "@/features/patient/api/patientService";
import type { UserResponseDto } from "@/auth/types";
import type { PatientProfileResponseDto } from "@/features/patient/types";

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

const mockDoctorUser: UserResponseDto = {
  id: "user-doctor-456",
  email: "doctor@manvia.health",
  phone: "+1987654321",
  emailVerified: true,
  phoneVerified: true,
  status: "ACTIVE",
  roles: ["DOCTOR"],
  createdAt: "2026-01-01T00:00:00Z",
};

const mockProfile: PatientProfileResponseDto = {
  id: "profile-123",
  publicPatientId: "PAT-12345678",
  legalFirstName: "Aarav",
  legalLastName: "Patel",
  dateOfBirth: "1990-01-01",
  biologicalSex: "MALE",
  bloodGroup: "O+",
  emergencyContact: null,
  preferredLanguage: "en",
  timezone: "UTC",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("MANVIA Patient Profile & Account Route Protection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("redirects unauthenticated user accessing /app/profile to /login", async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ["/app/profile"] });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Sign in to MANVIA" }),
      ).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated user accessing /app/settings to /login", async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ["/app/settings"] });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Sign in to MANVIA" }),
      ).toBeInTheDocument();
    });
  });

  it("renders PatientProfileRoute when authenticated as PATIENT", async () => {
    sessionStorageManager.setTokens({
      accessToken: "patient-token",
      refreshToken: "patient-refresh",
    });
    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockPatientUser);
    vi.spyOn(patientService, "getMyProfile").mockResolvedValueOnce(mockProfile);

    renderWithProviders(<AppRoutes />, { initialEntries: ["/app/profile"] });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Patient Profile" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("patient-profile-page")).toBeInTheDocument();
  });

  it("renders PatientSettingsRoute when authenticated as PATIENT", async () => {
    sessionStorageManager.setTokens({
      accessToken: "patient-token",
      refreshToken: "patient-refresh",
    });
    vi.spyOn(authService, "getMe").mockResolvedValue(mockPatientUser);

    renderWithProviders(<AppRoutes />, { initialEntries: ["/app/settings"] });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Account & Settings" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("patient-settings-page")).toBeInTheDocument();
  });

  it("blocks non-patient user from accessing /app/profile", async () => {
    sessionStorageManager.setTokens({
      accessToken: "doctor-token",
      refreshToken: "doctor-refresh",
    });
    vi.spyOn(authService, "getMe").mockResolvedValue(mockDoctorUser);

    renderWithProviders(<AppRoutes />, { initialEntries: ["/app/profile"] });

    // Non-patient is shown Access Restricted
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Access Restricted" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Your current role does not have authorization to view this section.",
        ),
      ).toBeInTheDocument();
    });
  });
});
