import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { AppRoutes } from "@/app/router/routes";
import { sessionStorageManager } from "@/auth/sessionStorage";
import { authService } from "@/auth/authService";
import type { UserResponseDto } from "@/auth/types";

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

const mockAdminUser: UserResponseDto = {
  id: "user-admin-789",
  email: "admin@manvia.health",
  phone: null,
  emailVerified: true,
  phoneVerified: false,
  status: "ACTIVE",
  roles: ["ADMIN"],
  createdAt: "2026-01-01T00:00:00Z",
};

describe("MANVIA Application Routes & Role-Aware Protection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("renders landing route on root /", async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ["/"] });
    expect(
      screen.getByRole("heading", { level: 1, name: "Care that feels human." }),
    ).toBeInTheDocument();
  });

  it("renders real login route on /login", async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ["/login"] });
    expect(
      screen.getByRole("heading", { name: "Sign in to MANVIA" }),
    ).toBeInTheDocument();
  });

  it("renders real register route on /register", async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ["/register"] });
    expect(
      screen.getByRole("heading", { name: "Create your MANVIA Account" }),
    ).toBeInTheDocument();
  });

  it("redirects unauthenticated user accessing /app to /login", async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ["/app"] });
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Sign in to MANVIA" }),
      ).toBeInTheDocument();
    });
  });

  it("renders patient portal shell on /app when authenticated as PATIENT", async () => {
    sessionStorageManager.setTokens({
      accessToken: "patient-token",
      refreshToken: "patient-refresh",
    });
    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockPatientUser);

    renderWithProviders(<AppRoutes />, { initialEntries: ["/app"] });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Patient Care Workspace/i }),
      ).toBeInTheDocument();
    });
  });

  it("renders doctor portal shell on /doctor when authenticated as DOCTOR", async () => {
    sessionStorageManager.setTokens({
      accessToken: "doctor-token",
      refreshToken: "doctor-refresh",
    });
    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockDoctorUser);

    renderWithProviders(<AppRoutes />, { initialEntries: ["/doctor"] });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Doctor Clinical Workspace/i }),
      ).toBeInTheDocument();
    });
  });

  it("renders admin console shell on /admin when authenticated as ADMIN", async () => {
    sessionStorageManager.setTokens({
      accessToken: "admin-token",
      refreshToken: "admin-refresh",
    });
    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockAdminUser);

    renderWithProviders(<AppRoutes />, { initialEntries: ["/admin"] });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /System Administration Console/i }),
      ).toBeInTheDocument();
    });
  });

  it("renders developer health diagnostics on /dev-health", async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ["/dev-health"] });
    expect(
      screen.getByText("Developer System Diagnostics"),
    ).toBeInTheDocument();
  });

  it("renders 404 Not Found route on unknown URL path", async () => {
    renderWithProviders(<AppRoutes />, {
      initialEntries: ["/some/non-existent/route"],
    });
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
  });
});
