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
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {},
) {
  const {
    initialEntries = ["/"],
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <QueryProvider client={queryClient}>
          <AuthProvider>
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
