import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/app/providers/ErrorBoundary";

const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Test unhandled runtime explosion");
  }
  return <div>Healthy Child Content</div>;
};

describe("Global ErrorBoundary Foundation", () => {
  it("renders children normally when no exception is thrown", () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Healthy Child Content")).toBeInTheDocument();
  });

  it("catches render errors and renders safe user-facing fallback without exposing raw stack trace", () => {
    // Suppress console.error during expected throw
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected error occurred/i),
    ).toBeInTheDocument();

    // Verify raw internal error message is NOT exposed to standard user UI
    expect(
      screen.queryByText("Test unhandled runtime explosion"),
    ).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("provides a Try Again reset action", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    let shouldThrow = true;
    const { rerender } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={shouldThrow} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Fix condition and click reset
    shouldThrow = false;
    rerender(
      <ErrorBoundary>
        <ProblemChild shouldThrow={shouldThrow} />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(screen.getByText("Healthy Child Content")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
