/**
 * MANVIA TanStack Query Provider & Configuration
 * Sensible, consistent server-state defaults.
 */

import React, { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/api/errors/apiError";

// eslint-disable-next-line react-refresh/only-export-components
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes fresh data window
        gcTime: 1000 * 60 * 10, // 10 minutes cache retention
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Do not retry on client errors (401, 403, 404, validation errors)
          if (
            error instanceof ApiError &&
            error.statusCode >= 400 &&
            error.statusCode < 500
          ) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const QueryProvider: React.FC<{
  children: ReactNode;
  client?: QueryClient;
}> = ({ children, client }) => {
  // Use useState to ensure QueryClient is not recreated on re-renders
  const [queryClient] = useState(() => client || createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {children as any}
    </QueryClientProvider>
  );
};
