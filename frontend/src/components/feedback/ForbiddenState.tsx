/**
 * MANVIA ForbiddenState Primitive
 */

import React from "react";
import { Button } from "../ui/Button";

export interface ForbiddenStateProps {
  title?: string;
  description?: string;
  onBack?: () => void;
  backLabel?: string;
}

export const ForbiddenState: React.FC<ForbiddenStateProps> = ({
  title = "Access Forbidden",
  description = "You do not have the required permissions to view this resource.",
  onBack,
  backLabel = "Return Home",
}) => {
  return (
    <div className="manvia-state-container" role="alert">
      <div
        className="manvia-state-icon manvia-state-icon-danger"
        aria-hidden="true"
      >
        🚫
      </div>
      <h3 className="heading-3">{title}</h3>
      <p className="body-regular">{description}</p>
      {onBack && (
        <Button
          variant="secondary"
          size="md"
          onClick={onBack}
          style={{ marginTop: "0.5rem" }}
        >
          {backLabel}
        </Button>
      )}
    </div>
  );
};
