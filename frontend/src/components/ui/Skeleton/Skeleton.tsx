/**
 * MANVIA Skeleton Primitive
 * Shimmer placeholder for loading states.
 */

import React, { type HTMLAttributes } from "react";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rectangular",
  width,
  height,
  className = "",
  style,
  ...props
}) => {
  const variantClass =
    variant === "text"
      ? "manvia-skeleton-text"
      : variant === "circular"
        ? "manvia-skeleton-circle"
        : "";

  const dynamicStyle: React.CSSProperties = {
    ...style,
    width:
      width !== undefined
        ? typeof width === "number"
          ? `${width}px`
          : width
        : undefined,
    height:
      height !== undefined
        ? typeof height === "number"
          ? `${height}px`
          : height
        : undefined,
  };

  return (
    <div
      aria-hidden="true"
      className={`manvia-skeleton ${variantClass} ${className}`}
      style={dynamicStyle}
      {...props}
    />
  );
};
