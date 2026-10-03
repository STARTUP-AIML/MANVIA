/**
 * Common shared frontend types across shells, feedback states, and design components.
 */

export type AppRole = "patient" | "doctor" | "admin" | "guest";

export interface UserSession {
  userId: string;
  email: string;
  role: AppRole;
  displayName?: string;
}

export type ThemeMode = "light" | "dark" | "system";

export type ComponentSize = "sm" | "md" | "lg";

export type FeedbackVariant =
  "neutral" | "primary" | "success" | "warning" | "danger" | "info";
