/**
 * MANVIA Modal / Dialog Primitive
 * Fully accessible dialog adhering to WAI-ARIA modal patterns with keyboard and focus management.
 */

import React, { useEffect, useId, type ReactNode } from "react";
import { Button } from "../Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}) => {
  const titleId = useId();
  const descId = useId();

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="manvia-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="manvia-modal-content"
      >
        <div className="manvia-modal-header">
          <div>
            <h2 id={titleId} className="heading-3">
              {title}
            </h2>
            {description && (
              <p id={descId} className="body-small">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ minWidth: 32, padding: 0 }}
          >
            ✕
          </Button>
        </div>

        <div className="manvia-modal-body">{children}</div>

        {footer && <div className="manvia-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
