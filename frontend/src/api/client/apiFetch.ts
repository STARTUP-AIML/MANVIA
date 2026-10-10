/**
 * Unified apiFetch adapter bridging legacy and modern API clients.
 * Uses enterprise ApiClient for correlation IDs, token refresh, and timeouts,
 * while supporting direct fetch for FormData and legacy options.
 */

import { apiClient } from "./apiClient";
import { ApiError } from "../errors/apiError";
import { sessionStorageManager } from "@/auth/sessionStorage";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "/api/v1";

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // If uploading FormData or doing raw binary, dispatch via native fetch
  if (options.body instanceof FormData || options.body instanceof Blob) {
    const token = sessionStorageManager.getAccessToken();
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const baseClean = API_BASE_URL.replace(/\/+$/, "");
    let pathClean = endpoint.replace(/^\/+/, "");
    if (baseClean.endsWith("/api/v1") && (pathClean === "api/v1" || pathClean.startsWith("api/v1/"))) {
      pathClean = pathClean.replace(/^api\/v1\/?/, "");
    }
    const rawUrl = endpoint.startsWith("http")
      ? endpoint
      : pathClean.length > 0 ? `${baseClean}/${pathClean}` : baseClean;

    const url = new URL(
      rawUrl,
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost",
    ).toString();

    let res: Response;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (err: unknown) {
      if (
        err instanceof TypeError ||
        (err instanceof Error &&
          (err.name === "TypeError" ||
            err.message.includes("fetch") ||
            err.message.includes("Failed to fetch") ||
            err.message.includes("NetworkError") ||
            err.message.includes("Load failed") ||
            err.message.includes("network") ||
            err.message.includes("ECONNREFUSED")))
      ) {
        throw ApiError.network(
          "Network request failed. Ensure the server is reachable.",
        );
      }
      throw err;
    }

    if (!res.ok) {
      const text = await res.text();
      const isProxyOrGatewayFailure =
        (res.status === 502 || res.status === 504) &&
        (text.includes("ECONNREFUSED") ||
          text.includes("Proxy error") ||
          text.includes("Gateway") ||
          !text ||
          text.includes("<!DOCTYPE html>"));

      if (isProxyOrGatewayFailure) {
        throw ApiError.network(
          "Network request failed. Ensure the server is reachable.",
        );
      }

      let errorMsg = `Request failed with status ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        errorMsg = parsed.message || parsed.error || errorMsg;
      } catch {
        if (text) errorMsg = text;
      }
      throw new ApiError({
        statusCode: res.status,
        error: `HTTP_${res.status}`,
        message: errorMsg,
      });
    }
    if (res.status === 204) return undefined as unknown as T;
    return (await res.json()) as T;
  }

  // Otherwise, use centralized ApiClient
  const method = (options.method?.toUpperCase() || "GET") as
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE";

  let body = options.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      // keep raw string if not JSON
    }
  }

  // Strip leading /api/v1 or leading slashes because apiClient prepends base URL
  const cleanEndpoint = endpoint
    .replace(/^https?:\/\/[^/]+\/api\/v1\/?/, "")
    .replace(/^\/?api\/v1\/?/, "")
    .replace(/^\//, "");

  return apiClient.request<T>(cleanEndpoint, method, body, {
    headers: options.headers as Record<string, string>,
  });
}

export function getStoredToken(): string | null {
  return sessionStorageManager.getAccessToken();
}

export function getStoredUser<T = unknown>(): T | null {
  return null;
}

export function clearSession(): void {
  sessionStorageManager.clearTokens();
}
