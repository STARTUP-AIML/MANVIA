/**
 * MANVIA NetworkErrorState Primitive
 */

import React from "react";
import { Button } from "../ui/Button";

export interface NetworkErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const NetworkErrorState: React.FC<NetworkErrorStateProps> = ({
  title = "Network Connection Lost",
  description = "Unable to reach the server. Please check your internet connection and try again.",
  onRetry,
  retryLabel = "Retry Connection",
}) => {
  return (
    <div className="manvia-state-container" role="alert">
      <div
        className="manvia-state-icon manvia-state-icon-warning"
        aria-hidden="true"
      >
        📡
      </div>
      <h3 className="heading-3">{title}</h3>
      <p className="body-regular">{description}</p>
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
