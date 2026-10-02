/**
 * MANVIA Badge Primitive
 * Status and tag indicator.
 */

import React, { type HTMLAttributes, type ReactNode } from "react";
import type { FeedbackVariant } from "@/types/common";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: FeedbackVariant;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  className = "",
  ...props
}) => {
  return (
    <span
      className={`manvia-badge manvia-badge-${variant} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
