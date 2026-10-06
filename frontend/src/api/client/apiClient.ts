/**
 * MANVIA Centralized API Client
 * Enterprise-grade HTTP client with error normalization, timeout handling,
 * correlation header injection, token refresh handling, and auth integration.
 */

import { ApiError } from "../errors/apiError";
import { type ApiClientConfig, defaultApiConfig } from "./config";
import type { HttpMethod, RequestOptions } from "@/types/api";

export class ApiClient {
  private config: ApiClientConfig;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(customConfig: Partial<ApiClientConfig> = {}) {
    this.config = { ...defaultApiConfig, ...customConfig };
  }

  /**
   * Updates dynamic client configuration (e.g. auth callbacks, base URL).
   */
  public configure(updates: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Returns current configuration snapshot.
   */
  public getConfig(): Readonly<ApiClientConfig> {
    return { ...this.config };
  }

  /**
   * Generates a client correlation ID.
   */
  private generateRequestId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Normalizes unknown response errors into a typed ApiError instance.
   */
  private async normalizeError(
    response: Response,
    rawText?: string,
  ): Promise<ApiError> {
    const requestId =
      response.headers.get("x-request-id") ||
      response.headers.get("x-correlation-id") ||
      "unknown-request-id";

    let errorData: Record<string, unknown> | null = null;
    if (rawText) {
      try {
        errorData = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        errorData = { message: rawText };
      }
    }

    const statusCode = response.status;
    const message =
      (typeof errorData?.message === "string" ? errorData.message : null) ||
      (Array.isArray(errorData?.message)
        ? errorData.message.join(", ")
        : null) ||
      response.statusText ||
      "An unexpected error occurred";

    const error =
      typeof errorData?.error === "string"
        ? errorData.error
        : `HTTP_${statusCode}`;
    const timestamp =
      typeof errorData?.timestamp === "string"
        ? errorData.timestamp
        : new Date().toISOString();
    const details =
      errorData?.details ??
      (Array.isArray(errorData?.message) ? errorData.message : undefined);

    const apiError = new ApiError(
      {
        statusCode,
        error,
        message,
        details,
        requestId,
        timestamp,
      },
      errorData,
    );

    return apiError;
  }

  /**
   * Core request dispatch pipeline.
   */
  public async request<T = unknown>(
    endpoint: string,
    method: HttpMethod = "GET",
    body?: unknown,
    options: RequestOptions = {},
    isRetry = false,
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? this.config.defaultTimeoutMs;
    const controller = new AbortController();

    // Link caller's signal if supplied
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort());
    }

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // Build URL with query params
    const rawUrl =
      endpoint.startsWith("http://") || endpoint.startsWith("https://")
        ? endpoint
        : `${this.config.baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

    const url = new URL(
      rawUrl,
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost",
    );
    if (options.params) {
      Object.entries(options.params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }

    // Headers construction
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (!headers.has("x-request-id")) {
      headers.set("x-request-id", this.generateRequestId());
    }

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const isBlob = typeof Blob !== "undefined" && body instanceof Blob;

    if (body !== undefined && !isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // Attach Bearer token if provider configured and not explicitly skipped
    if (!options.skipAuth && this.config.getAuthToken) {
      const token = await this.config.getAuthToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    try {
      const response = await fetch(url.toString(), {
        ...options,
        method,
        headers,
        body:
          body !== undefined
            ? isFormData || isBlob || typeof body === "string"
              ? (body as BodyInit)
              : JSON.stringify(body)
            : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 204 No Content
      if (response.status === 204) {
        return null as unknown as T;
      }

      const responseText = await response.text();

      if (!response.ok) {
        const apiError = await this.normalizeError(response, responseText);

        const isAuthEndpoint =
          endpoint.includes("auth/login") ||
          endpoint.includes("auth/register") ||
          endpoint.includes("auth/refresh");

        // Check for 401 Unauthorized and attempt token refresh if not already retrying
        if (
          apiError.isUnauthorized &&
          !isRetry &&
          !options.skipAuth &&
          !isAuthEndpoint &&
          this.config.refreshTokenHandler
        ) {
          try {
            // Deduplicate concurrent refresh calls
            if (!this.refreshPromise) {
              this.refreshPromise = this.config
                .refreshTokenHandler()
                .finally(() => {
                  this.refreshPromise = null;
                });
            }

            const newToken = await this.refreshPromise;
            if (newToken) {
              // Retry original request once with new token
              return await this.request<T>(
                endpoint,
                method,
                body,
                options,
                true,
              );
            }
          } catch {
            // Refresh failed
          }
        }

        // If still 401 (e.g. after refresh failed or retry returned 401), notify listener
        if (
          apiError.isUnauthorized &&
          !options.skipAuth &&
          !isAuthEndpoint &&
          this.config.onUnauthorized
        ) {
          this.config.onUnauthorized();
        }

        throw apiError;
      }

      if (!responseText) {
        return null as unknown as T;
      }

      try {
        return JSON.parse(responseText) as T;
      } catch {
        return responseText as unknown as T;
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        throw err;
      }

      if (err instanceof DOMException && err.name === "AbortError") {
        throw ApiError.timeout(
          `Request exceeded ${timeoutMs}ms timeout threshold.`,
        );
      }

      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw ApiError.network(
          "Network request failed. Ensure the server is reachable.",
        );
      }

      throw new ApiError({
        statusCode: 500,
        error: "REQUEST_FAILED",
        message: err instanceof Error ? err.message : "Unknown network failure",
      });
    }
  }

  /* HTTP Method Helpers */
  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, "GET", undefined, options);
  }

  public post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, "POST", body, options);
  }

  public put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, "PUT", body, options);
  }

  public patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, "PATCH", body, options);
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, "DELETE", undefined, options);
  }
}

/**
 * Singleton API Client Instance
 */
export const apiClient = new ApiClient();
