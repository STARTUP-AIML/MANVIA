/**
 * MANVIA SuccessState Primitive
 */

import React, { type ReactNode } from "react";
import { Button } from "../ui/Button";

export interface SuccessStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title = "Success",
  description = "Your operation has completed successfully.",
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="manvia-state-container" role="status">
      <div
        className="manvia-state-icon manvia-state-icon-success"
        aria-hidden="true"
      >
        {icon || "✅"}
      </div>
      <h3 className="heading-3">{title}</h3>
      <p className="body-regular">{description}</p>
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="md"
          onClick={onAction}
          style={{ marginTop: "0.5rem" }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
