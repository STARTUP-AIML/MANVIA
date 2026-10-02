/**
 * MANVIA RetryState Primitive
 */

import React from "react";
import { Button } from "../ui/Button";

export interface RetryStateProps {
  title?: string;
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export const RetryState: React.FC<RetryStateProps> = ({
  title = "Action Failed",
  message = "The requested operation could not be completed. You can try again.",
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div className="manvia-state-container" role="alert">
      <div
        className="manvia-state-icon manvia-state-icon-warning"
        aria-hidden="true"
      >
        🔄
      </div>
      <h3 className="heading-3">{title}</h3>
      <p className="body-regular">{message}</p>
      <Button
        variant="primary"
        size="md"
        onClick={onRetry}
        isLoading={isRetrying}
        style={{ marginTop: "0.5rem" }}
      >
        Retry Action
      </Button>
    </div>
  );
};
