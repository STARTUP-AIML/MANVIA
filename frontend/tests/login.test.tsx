import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { LoginRoute } from "@/routes/LoginRoute";
import { authService } from "@/auth/authService";
import { ApiError } from "@/api/errors/apiError";
import { sessionStorageManager } from "@/auth/sessionStorage";

describe("MANVIA Login View Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("renders login form with accessible labels, inputs, and submit button", () => {
    renderWithProviders(<LoginRoute />, { initialEntries: ["/login"] });

    expect(
      screen.getByRole("heading", { name: "Sign in to MANVIA" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create an account" }),
    ).toHaveAttribute("href", "/register");
  });

  it("shows client-side validation errors when submitting blank inputs", async () => {
    renderWithProviders(<LoginRoute />, { initialEntries: ["/login"] });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("login-submit-button"));

    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("shows client-side validation error when entering an invalid email", async () => {
    renderWithProviders(<LoginRoute />, { initialEntries: ["/login"] });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email address/i), "not-an-email");
    await user.type(screen.getByLabelText(/Password/i), "Password123!");
    await user.click(screen.getByTestId("login-submit-button"));

    expect(
      screen.getByText("Please enter a valid email address"),
    ).toBeInTheDocument();
  });

  it("displays server error alert when authentication fails (401 invalid credentials)", async () => {
    vi.spyOn(authService, "login").mockRejectedValueOnce(
      new ApiError({
        statusCode: 401,
        error: "UNAUTHORIZED",
        message: "Invalid email or password",
      }),
    );

    renderWithProviders(<LoginRoute />, { initialEntries: ["/login"] });

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/Email address/i),
      "patient@manvia.health",
    );
    await user.type(screen.getByLabelText(/Password/i), "WrongPassword123!");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText(/Invalid email or password/i),
      ).toBeInTheDocument();
    });
  });
});
