import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { RegisterRoute } from "@/routes/RegisterRoute";
import { authService } from "@/auth/authService";
import { ApiError } from "@/api/errors/apiError";
import { sessionStorageManager } from "@/auth/sessionStorage";

describe("MANVIA Registration View Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("renders registration form according to backend contract", () => {
    renderWithProviders(<RegisterRoute />, { initialEntries: ["/register"] });

    expect(
      screen.getByRole("heading", { name: "Create your MANVIA Account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Account Role/i)).toBeInTheDocument();
    expect(screen.getByTestId("register-submit-button")).toBeInTheDocument();
  });

  it("validates password length and complexity according to backend requirements", async () => {
    renderWithProviders(<RegisterRoute />, { initialEntries: ["/register"] });

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/Email address/i),
      "newuser@manvia.health",
    );
    await user.type(screen.getByLabelText(/Password/i), "short");
    await user.click(screen.getByTestId("register-submit-button"));

    expect(
      screen.getByText("Password must be at least 12 characters"),
    ).toBeInTheDocument();
  });

  it("validates phone number E.164 format when provided", async () => {
    renderWithProviders(<RegisterRoute />, { initialEntries: ["/register"] });

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/Email address/i),
      "newuser@manvia.health",
    );
    await user.type(
      screen.getByLabelText(/Password/i),
      "ComplexPassword123!@#",
    );
    await user.type(screen.getByLabelText(/Phone number/i), "12345"); // missing +
    await user.click(screen.getByTestId("register-submit-button"));

    expect(
      screen.getByText(
        "Phone must be in international format (e.g. +12345678900)",
      ),
    ).toBeInTheDocument();
  });

  it("displays server conflict error (409 user already exists)", async () => {
    vi.spyOn(authService, "register").mockRejectedValueOnce(
      new ApiError({
        statusCode: 409,
        error: "CONFLICT",
        message: "A user with this email address already exists.",
      }),
    );

    renderWithProviders(<RegisterRoute />, { initialEntries: ["/register"] });

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/Email address/i),
      "existing@manvia.health",
    );
    await user.type(
      screen.getByLabelText(/Password/i),
      "ComplexPassword123!@#",
    );
    await user.click(screen.getByTestId("register-submit-button"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText(/A user with this email address already exists/i),
      ).toBeInTheDocument();
    });
  });
});
