/**
 * MANVIA ErrorState Primitive
 */

import React from "react";
import { Button } from "../ui/Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "An unexpected error occurred while processing your request.",
  onRetry,
  retryLabel = "Try again",
}) => {
  return (
    <div className="manvia-state-container" role="alert">
      <div
        className="manvia-state-icon manvia-state-icon-danger"
        aria-hidden="true"
      >
        ⚠️
      </div>
      <h3 className="heading-3">{title}</h3>
      <p className="body-regular">{message}</p>
      {onRetry && (
        <Button
          variant="primary"
          size="md"
          onClick={onRetry}
          style={{ marginTop: "0.5rem" }}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
