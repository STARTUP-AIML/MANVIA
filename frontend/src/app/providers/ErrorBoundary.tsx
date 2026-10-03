/**
 * MANVIA Global Error Boundary
 * Prevents UI catastrophic crashes, renders safe fallback without exposing
 * sensitive healthcare stack traces, and provides graceful reload/retry.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Notify optional monitoring hook without exposing sensitive data
    this.props.onError?.(error, errorInfo);

    // In non-production, log for developer debugging
    if (import.meta.env.DEV) {
      console.error(
        "[MANVIA Global Error Boundary caught error]:",
        error,
        errorInfo,
      );
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="manvia-state-container"
          style={{ minHeight: "80vh", justifyContent: "center" }}
        >
          <div
            className="manvia-state-icon manvia-state-icon-danger"
            aria-hidden="true"
          >
            ⚠️
          </div>
          <h1 className="heading-2">Something went wrong</h1>
          <p className="body-regular" style={{ maxWidth: 440 }}>
            An unexpected error occurred. Our team has been notified. You can
            try refreshing the page or navigating back.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <Button variant="secondary" size="md" onClick={this.handleReset}>
              Try Again
            </Button>
            <Button variant="primary" size="md" onClick={this.handleReload}>
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
