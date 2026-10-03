/**
 * MANVIA useApi Hook
 * Lightweight wrapper exposing the centralized ApiClient instance with lifecycle state.
 */

import { useState, useCallback } from "react";
import { apiClient } from "@/api/client/apiClient";
import { ApiError } from "@/api/errors/apiError";
import type { RequestOptions } from "@/types/api";

export interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
}

export function useApi<T = unknown>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(
    async (
      requestFn: (client: typeof apiClient) => Promise<T>,
      options: {
        onSuccess?: (data: T) => void;
        onError?: (err: ApiError) => void;
      } = {},
    ): Promise<T | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await requestFn(apiClient);
        setState({ data: result, isLoading: false, error: null });
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const apiError =
          err instanceof ApiError
            ? err
            : new ApiError({
                statusCode: 500,
                error: "CLIENT_ERROR",
                message:
                  err instanceof Error
                    ? err.message
                    : "Unknown execution error",
              });

        setState({ data: null, isLoading: false, error: apiError });
        options.onError?.(apiError);
        return null;
      }
    },
    [],
  );

  return {
    ...state,
    execute,
    get: (endpoint: string, opts?: RequestOptions) =>
      execute((c) => c.get<T>(endpoint, opts)),
    post: (endpoint: string, body?: unknown, opts?: RequestOptions) =>
      execute((c) => c.post<T>(endpoint, body, opts)),
    reset: () => setState({ data: null, isLoading: false, error: null }),
  };
}
