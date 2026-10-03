/**
 * MANVIA Input Primitive
 * Accessible form field with connected label, helper text, and error states.
 */

import { forwardRef, useId, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorText,
      required,
      id: customId,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = customId || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const hasError = Boolean(errorText);

    return (
      <div className="manvia-input-group">
        {label && (
          <label htmlFor={inputId} className="manvia-label">
            {label}
            {required && (
              <span className="manvia-label-required" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="manvia-input-wrapper">
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError ? "true" : undefined}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            className={`manvia-input ${hasError ? "manvia-input-error" : ""} ${className}`}
            {...props}
          />
        </div>
        {hasError ? (
          <span id={errorId} role="alert" className="manvia-error-text">
            {errorText}
          </span>
        ) : helperText ? (
          <span id={helperId} className="manvia-helper-text">
            {helperText}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
