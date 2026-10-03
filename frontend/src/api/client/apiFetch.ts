/**
 * Unified apiFetch adapter bridging legacy and modern API clients.
 * Uses enterprise ApiClient for correlation IDs, token refresh, and timeouts,
 * while supporting direct fetch for FormData and legacy options.
 */

import { apiClient } from "./apiClient";
import { sessionStorageManager } from "@/auth/sessionStorage";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000/api/v1";

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // If uploading FormData or doing raw binary, dispatch via native fetch
  if (options.body instanceof FormData || options.body instanceof Blob) {
    const token = sessionStorageManager.getAccessToken();
    const user = sessionStorageManager.getUser();
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (user) {
      headers.set("x-user-id", user.userId);
      headers.set("x-user-role", user.activeRole);
      headers.set("x-active-role", user.activeRole);
    }

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const text = await res.text();
      let errorMsg = `Request failed with status ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        errorMsg = parsed.message || parsed.error || errorMsg;
      } catch {
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
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
  return sessionStorageManager.getUser() as T | null;
}

export function clearSession(): void {
  sessionStorageManager.clearTokens();
}
