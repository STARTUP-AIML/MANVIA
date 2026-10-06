/* eslint-disable react-refresh/only-export-components */
/**
 * MANVIA Test Utilities
 * Provides custom render with all required providers for integration & component tests.
 */

import React, { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { AuthProvider } from "@/auth/AuthContext";
import { I18nProvider } from "@/i18n/i18nContext";
import { ToastProvider } from "@/components/feedback/Toast/ToastContext";
import type { AuthState } from "@/auth/types";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: MemoryRouterProps["initialEntries"];
  queryClient?: QueryClient;
  initialAuthState?: Partial<AuthState>;
}

export function renderWithProviders(
  ui: ReactElement,
  optionsOrRoute: CustomRenderOptions | string = {},
) {
  const options: CustomRenderOptions =
    typeof optionsOrRoute === "string"
      ? { initialEntries: [optionsOrRoute] }
      : optionsOrRoute;

  const {
    initialEntries = ["/"],
    queryClient = createTestQueryClient(),
    initialAuthState,
    ...renderOptions
  } = options;

  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <QueryProvider client={queryClient}>
          <AuthProvider initialState={initialAuthState}>
            <I18nProvider>
              <ToastProvider>{children}</ToastProvider>
            </I18nProvider>
          </AuthProvider>
        </QueryProvider>
      </MemoryRouter>
    );
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

export * from "@testing-library/react";
