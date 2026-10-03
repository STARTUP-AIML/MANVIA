/**
 * MANVIA Button Primitive
 * Predictable states: default, hover, focus, disabled, loading.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Spinner } from "../Spinner";
import type { ComponentSize } from "@/types/common";

export type ButtonVariant =
  "primary" | "secondary" | "outline" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ComponentSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = "",
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isInteractionDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isInteractionDisabled}
        aria-busy={isLoading ? "true" : undefined}
        aria-disabled={isInteractionDisabled ? "true" : undefined}
        className={`manvia-btn manvia-btn-${variant} manvia-btn-${size} ${className}`}
        {...props}
      >
        {isLoading && <Spinner size="sm" />}
        {!isLoading && leftIcon && (
          <span className="manvia-btn-icon-left">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="manvia-btn-icon-right">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
