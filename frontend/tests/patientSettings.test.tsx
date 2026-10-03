import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { PatientSettingsRoute } from "@/routes/PatientSettingsRoute";
import { authService } from "@/auth/authService";
import { sessionStorageManager } from "@/auth/sessionStorage";
import type { UserResponseDto } from "@/auth/types";

const mockPatientUser: UserResponseDto = {
  id: "user-1234-uuid",
  email: "patient@manvia.health",
  phone: "+14155552671",
  emailVerified: true,
  phoneVerified: false,
  status: "ACTIVE",
  roles: ["PATIENT"],
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("MANVIA Patient Account & Settings Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.setTokens({
      accessToken: "mock.access.token",
      refreshToken: "mock.refresh.token",
    });
    vi.spyOn(authService, "getMe").mockResolvedValue(mockPatientUser);
  });

  it("renders account information with verified status and active roles", async () => {
    renderWithProviders(<PatientSettingsRoute />, {
      initialEntries: ["/app/settings"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("settings-email")).toHaveTextContent(
        "patient@manvia.health",
      );
    });

    expect(screen.getByTestId("badge-email-verified")).toHaveTextContent(
      "Verified",
    );
    expect(screen.getByTestId("settings-phone")).toHaveTextContent(
      "+14155552671",
    );
    expect(screen.getByTestId("badge-phone-verified")).toHaveTextContent(
      "Unverified",
    );
    expect(screen.getByTestId("settings-status")).toHaveTextContent("ACTIVE");
    expect(screen.getByTestId("settings-role")).toHaveTextContent("PATIENT");
  });

  it("navigates to patient profile via view & edit profile button", async () => {
    renderWithProviders(<PatientSettingsRoute />, {
      initialEntries: ["/app/settings"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("goto-profile-button")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /View & Edit Profile/i }),
    ).toHaveAttribute("href", "/app/profile");
  });

  it("validates and handles change password modal flow", async () => {
    const changePasswordSpy = vi
      .spyOn(authService, "changePassword")
      .mockResolvedValueOnce({ message: "Password updated successfully" });

    renderWithProviders(<PatientSettingsRoute />, {
      initialEntries: ["/app/settings"],
    });

    // delay: null disables per-keystroke timing delays in JSDOM to avoid timeout
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(
        screen.getByTestId("open-change-password-button"),
      ).toBeInTheDocument();
    });

    // Open Modal
    await user.click(screen.getByTestId("open-change-password-button"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Change Account Password" }),
    ).toBeInTheDocument();

    // Submit with mismatching passwords
    await user.type(
      screen.getByTestId("input-current-password"),
      "CurrentPass123!",
    );
    await user.type(screen.getByTestId("input-new-password"), "NewPass123!");
    await user.type(
      screen.getByTestId("input-confirm-password"),
      "MismatchPass123!",
    );

    await user.click(screen.getByTestId("submit-change-password-button"));

    expect(screen.getByText("New passwords do not match")).toBeInTheDocument();

    // Fix confirm password
    await user.clear(screen.getByTestId("input-confirm-password"));
    await user.type(
      screen.getByTestId("input-confirm-password"),
      "NewPass123!",
    );

    await user.click(screen.getByTestId("submit-change-password-button"));

    await waitFor(() => {
      expect(changePasswordSpy).toHaveBeenCalledWith({
        currentPassword: "CurrentPass123!",
        newPassword: "NewPass123!",
      });
    });
  });

  it("opens and closes legal and policy modals", async () => {
    renderWithProviders(<PatientSettingsRoute />, {
      initialEntries: ["/app/settings"],
    });

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("link-terms")).toBeInTheDocument();
    });

    // Open Terms
    await user.click(screen.getByTestId("link-terms"));
    expect(
      screen.getByRole("heading", { name: "Terms of Service" }),
    ).toBeInTheDocument();

    // Close Terms
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Terms of Service" }),
      ).not.toBeInTheDocument();
    });

    // Open Privacy
    await user.click(screen.getByTestId("link-privacy"));
    expect(
      screen.getByRole("heading", { name: "Privacy & HIPAA Notice" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));

    // Open Support
    await user.click(screen.getByTestId("link-support"));
    expect(
      screen.getByRole("heading", { name: "Patient Care & Emergency Support" }),
    ).toBeInTheDocument();
  });

  it("handles sign out flow from settings page", async () => {
    const logoutSpy = vi
      .spyOn(authService, "logout")
      .mockResolvedValueOnce({ message: "Logged out successfully" });

    renderWithProviders(<PatientSettingsRoute />, {
      initialEntries: ["/app/settings"],
    });

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("settings-logout-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("settings-logout-button"));

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalled();
    });
  });
});
