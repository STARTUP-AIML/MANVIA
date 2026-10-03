/**
 * MANVIA LoadingState Primitive
 */

import React from "react";
import { Spinner } from "../ui/Spinner";
import type { ComponentSize } from "@/types/common";

export interface LoadingStateProps {
  message?: string;
  size?: ComponentSize;
  fullPage?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  size = "lg",
  fullPage = false,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="manvia-state-container"
      style={fullPage ? { minHeight: "60vh" } : undefined}
    >
      <Spinner size={size} label={message} />
      <p className="body-regular" style={{ marginTop: "0.5rem" }}>
        {message}
      </p>
    </div>
  );
};
