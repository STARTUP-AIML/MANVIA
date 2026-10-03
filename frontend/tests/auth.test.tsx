import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "@/test/testUtils";
import { useAuth } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/app/router/ProtectedRoute";
import { authService } from "@/auth/authService";
import { sessionStorageManager } from "@/auth/sessionStorage";
import type { AuthResponseDto, UserResponseDto } from "@/auth/types";

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

const mockAuthResponse: AuthResponseDto = {
  user: mockPatientUser,
  accessToken: "mock-access-token-jwt",
  refreshToken: "mock-refresh-token-opaque",
  tokenType: "Bearer",
  expiresIn: 900,
};

function renderAuthTestComponent(initialRoute = "/") {
  const TestConsumer = () => {
    const { user, status, isAuthenticated, login, logout, register } =
      useAuth();
    return (
      <div>
        <div data-testid="auth-status">{status}</div>
        <div data-testid="is-authenticated">{String(isAuthenticated)}</div>
        <div data-testid="user-email">{user?.email || "none"}</div>
        <button
          onClick={() =>
            login({
              email: "patient@manvia.health",
              password: "Password123!@#",
            })
          }
        >
          Do Login
        </button>
        <button
          onClick={() =>
            register({
              email: "patient@manvia.health",
              password: "Password123!@#",
              role: "PATIENT",
            })
          }
        >
          Do Register
        </button>
        <button onClick={() => logout()}>Do Logout</button>
      </div>
    );
  };

  return renderWithProviders(
    <Routes>
      <Route path="/" element={<TestConsumer />} />
      <Route path="/login" element={<div>Login Page Mock</div>} />
      <Route
        path="/protected-patient"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <div>Protected Patient Content</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/protected-doctor"
        element={
          <ProtectedRoute allowedRoles={["DOCTOR"]}>
            <div>Protected Doctor Content</div>
          </ProtectedRoute>
        }
      />
    </Routes>,
    { initialEntries: [initialRoute] },
  );
}

describe("MANVIA Auth Architecture & Session Management", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("initializes to UNAUTHENTICATED when no tokens are found in storage", async () => {
    renderAuthTestComponent();
    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe(
        "UNAUTHENTICATED",
      );
      expect(screen.getByTestId("is-authenticated").textContent).toBe("false");
      expect(screen.getByTestId("user-email").textContent).toBe("none");
    });
  });

  it("bootstraps session successfully when refresh token and me endpoint succeed", async () => {
    sessionStorageManager.setTokens({
      accessToken: "existing-access-token",
      refreshToken: "existing-refresh-token",
    });

    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockPatientUser);

    renderAuthTestComponent();

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe(
        "AUTHENTICATED",
      );
      expect(screen.getByTestId("is-authenticated").textContent).toBe("true");
      expect(screen.getByTestId("user-email").textContent).toBe(
        "patient@manvia.health",
      );
    });
  });

  it("handles successful login, updates auth state, and persists tokens", async () => {
    vi.spyOn(authService, "login").mockResolvedValueOnce(mockAuthResponse);

    renderAuthTestComponent();

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe(
        "UNAUTHENTICATED",
      );
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("Do Login"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe(
        "AUTHENTICATED",
      );
      expect(screen.getByTestId("is-authenticated").textContent).toBe("true");
      expect(screen.getByTestId("user-email").textContent).toBe(
        "patient@manvia.health",
      );
      expect(sessionStorageManager.getAccessToken()).toBe(
        "mock-access-token-jwt",
      );
      expect(sessionStorageManager.getRefreshToken()).toBe(
        "mock-refresh-token-opaque",
      );
    });
  });

  it("handles successful registration and immediately authenticates session", async () => {
    vi.spyOn(authService, "register").mockResolvedValueOnce(mockAuthResponse);

    renderAuthTestComponent();

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe(
        "UNAUTHENTICATED",
      );
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("Do Register"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe(
        "AUTHENTICATED",
      );
      expect(screen.getByTestId("is-authenticated").textContent).toBe("true");
      expect(sessionStorageManager.getAccessToken()).toBe(
        "mock-access-token-jwt",
      );
    });
  });

  it("handles logout, calls backend logout, and clears all client session tokens", async () => {
    sessionStorageManager.setTokens({
      accessToken: "token-to-clear",
      refreshToken: "refresh-to-clear",
    });
    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockPatientUser);
    const logoutSpy = vi
      .spyOn(authService, "logout")
      .mockResolvedValueOnce({ message: "Logged out" });

    renderAuthTestComponent();

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe(
        "AUTHENTICATED",
      );
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("Do Logout"));

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("auth-status").textContent).toBe(
        "UNAUTHENTICATED",
      );
      expect(screen.getByTestId("is-authenticated").textContent).toBe("false");
      expect(sessionStorageManager.getAccessToken()).toBeNull();
      expect(sessionStorageManager.getRefreshToken()).toBeNull();
    });
  });

  it("redirects unauthenticated users attempting to access protected route to /login", async () => {
    renderAuthTestComponent("/protected-patient");

    await waitFor(() => {
      expect(screen.getByText("Login Page Mock")).toBeInTheDocument();
    });
  });

  it("allows access to protected route when authenticated and role matches", async () => {
    sessionStorageManager.setTokens({
      accessToken: "valid-token",
      refreshToken: "valid-refresh",
    });
    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockPatientUser);

    renderAuthTestComponent("/protected-patient");

    await waitFor(() => {
      expect(screen.getByText("Protected Patient Content")).toBeInTheDocument();
    });
  });

  it("shows ForbiddenState (403) when user lacks required role", async () => {
    sessionStorageManager.setTokens({
      accessToken: "valid-token",
      refreshToken: "valid-refresh",
    });
    // User has PATIENT role, but route requires DOCTOR
    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockPatientUser);

    renderAuthTestComponent("/protected-doctor");

    await waitFor(() => {
      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Your current role does not have authorization to view this section.",
        ),
      ).toBeInTheDocument();
    });
  });
});
