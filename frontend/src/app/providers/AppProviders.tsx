/**
 * MANVIA Root Application Providers Hierarchy
 * Deliberate nesting order:
 * 1. ErrorBoundary (catches all unhandled render failures)
 * 2. QueryProvider (server-state client)
 * 3. AuthProvider (authoritative user session context)
 * 4. I18nProvider (internationalization context)
 * 5. ToastProvider (notification primitive)
 */

import React, { type ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { QueryProvider } from "./QueryProvider";
import { AuthProvider } from "@/auth/AuthContext";
import { I18nProvider } from "@/i18n/i18nContext";
import { ToastProvider } from "@/components/feedback/Toast/ToastContext";

export interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <I18nProvider>
            <ToastProvider>{children}</ToastProvider>
          </I18nProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
};
