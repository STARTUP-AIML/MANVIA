import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  LoadingState,
  EmptyState,
  ErrorState,
  RetryState,
  UnauthorizedState,
  ForbiddenState,
  NetworkErrorState,
  SuccessState,
} from "@/components/feedback";

describe("MANVIA Global UX State Primitives", () => {
  it("renders LoadingState with accessible role", () => {
    render(<LoadingState message="Loading clinical records..." />);
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Loading clinical records...").length,
    ).toBeGreaterThan(0);
  });

  it("renders EmptyState with title, description, and action button", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="No consultations yet"
        description="Book your first session with a certified doctor."
        actionLabel="Find a Doctor"
        onAction={onAction}
      />,
    );

    expect(screen.getByText("No consultations yet")).toBeInTheDocument();
    expect(screen.getByText(/Book your first session/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /Find a Doctor/i });
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders ErrorState with alert role and retry callback", () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="Failed to load slots"
        message="Server busy"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Failed to load slots")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders RetryState with retry action", () => {
    const onRetry = vi.fn();
    render(<RetryState title="Payment Sync Failed" onRetry={onRetry} />);

    expect(screen.getByText("Payment Sync Failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry Action/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders UnauthorizedState with login action", () => {
    const onLogin = vi.fn();
    render(<UnauthorizedState onLogin={onLogin} />);

    expect(screen.getByText("Sign In Required")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("renders ForbiddenState with access warning", () => {
    render(
      <ForbiddenState
        title="Restricted Area"
        description="Admin access only"
      />,
    );
    expect(screen.getByText("Restricted Area")).toBeInTheDocument();
    expect(screen.getByText("Admin access only")).toBeInTheDocument();
  });

  it("renders NetworkErrorState with reconnection message", () => {
    render(<NetworkErrorState />);
    expect(screen.getByText("Network Connection Lost")).toBeInTheDocument();
  });

  it("renders SuccessState with completion message", () => {
    render(
      <SuccessState
        title="Appointment Confirmed"
        description="Details sent to your email."
      />,
    );
    expect(screen.getByText("Appointment Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Details sent to your email.")).toBeInTheDocument();
  });
});
