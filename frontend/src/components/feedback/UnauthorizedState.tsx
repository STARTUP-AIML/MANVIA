/**
 * MANVIA UnauthorizedState Primitive
 */

import React from "react";
import { Button } from "../ui/Button";

export interface UnauthorizedStateProps {
  title?: string;
  description?: string;
  onLogin?: () => void;
  loginLabel?: string;
}

export const UnauthorizedState: React.FC<UnauthorizedStateProps> = ({
  title = "Sign In Required",
  description = "You must be signed in to access this healthcare workspace.",
  onLogin,
  loginLabel = "Sign In",
}) => {
  return (
    <div className="manvia-state-container" role="alert">
      <div
        className="manvia-state-icon manvia-state-icon-info"
        aria-hidden="true"
      >
        🔒
      </div>
      <h3 className="heading-3">{title}</h3>
      <p className="body-regular">{description}</p>
      {onLogin && (
        <Button
          variant="primary"
          size="md"
          onClick={onLogin}
          style={{ marginTop: "0.5rem" }}
        >
          {loginLabel}
        </Button>
      )}
    </div>
  );
};
