/* eslint-disable react-refresh/only-export-components */
/**
 * MANVIA Toast Notification Primitive & Context
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useId,
  type ReactNode,
} from "react";
import type { FeedbackVariant } from "@/types/common";

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  variant: FeedbackVariant;
  durationMs?: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (
    message: string,
    options?: {
      title?: string;
      variant?: FeedbackVariant;
      durationMs?: number;
    },
  ) => string;
  dismissToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const baseId = useId();

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      options: {
        title?: string;
        variant?: FeedbackVariant;
        durationMs?: number;
      } = {},
    ) => {
      const id = `${baseId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const durationMs = options.durationMs ?? 4000;
      const variant = options.variant ?? "info";

      const newToast: ToastItem = {
        id,
        title: options.title,
        message,
        variant,
        durationMs,
      };

      setToasts((prev) => [...prev, newToast]);

      if (durationMs > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, durationMs);
      }

      return id;
    },
    [baseId, dismissToast],
  );

  const success = useCallback(
    (message: string, title?: string) =>
      showToast(message, { title, variant: "success" }),
    [showToast],
  );
  const error = useCallback(
    (message: string, title?: string) =>
      showToast(message, { title, variant: "danger" }),
    [showToast],
  );
  const info = useCallback(
    (message: string, title?: string) =>
      showToast(message, { title, variant: "info" }),
    [showToast],
  );
  const warning = useCallback(
    (message: string, title?: string) =>
      showToast(message, { title, variant: "warning" }),
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        success,
        error,
        info,
        warning,
      }}
    >
      {children}
      <div
        className="manvia-toast-container"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="manvia-toast" role="alert">
            <span aria-hidden="true">
              {toast.variant === "success" && "✅"}
              {toast.variant === "danger" && "⚠️"}
              {toast.variant === "warning" && "🔔"}
              {toast.variant === "info" && "ℹ️"}
              {toast.variant === "neutral" && "💬"}
              {toast.variant === "primary" && "🔷"}
            </span>
            <div style={{ flex: 1 }}>
              {toast.title && (
                <div style={{ fontWeight: 600 }}>{toast.title}</div>
              )}
              <div>{toast.message}</div>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                padding: "0 4px",
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
