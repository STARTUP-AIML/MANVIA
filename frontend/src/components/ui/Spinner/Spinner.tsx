/**
 * MANVIA Spinner Primitive
 * Accessible loading indicator.
 */

import React from "react";
import type { ComponentSize } from "@/types/common";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: ComponentSize;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  label = "Loading...",
  className = "",
  ...props
}) => {
  return (
    <span
      role="status"
      aria-label={label}
      className={`manvia-spinner manvia-spinner-${size} ${className}`}
      {...props}
    >
      <span
        className="sr-only"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
        }}
      >
        {label}
      </span>
    </span>
  );
};
