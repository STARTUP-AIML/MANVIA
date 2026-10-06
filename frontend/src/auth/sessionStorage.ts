/**
 * MANVIA Token & Session Storage Manager
 * Safely manages short-lived access tokens and persistent refresh tokens.
 * Access tokens are kept in-memory for minimal XSS attack surface,
 * with sessionStorage sync for page reloads.
 * Refresh tokens are kept in secure client storage for session continuity.
 *
 * NOTE: User identity is NOT stored here as authoritative proof of authentication.
 * The backend /auth/me verification is the sole identity authority.
 */

import type { AuthSessionTokens } from "./types";

const REFRESH_TOKEN_KEY = "manvia_refresh_token";
const ACCESS_TOKEN_KEY = "manvia_access_token";
const LEGACY_TOKEN_KEY = "manvia_auth_token";
const LEGACY_USER_KEY = "manvia_auth_user";

class SessionStorageManager {
  private inMemoryAccessToken: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      // Initialize in-memory token from sessionStorage if present
      try {
        this.inMemoryAccessToken =
          window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
          window.sessionStorage.getItem(LEGACY_TOKEN_KEY);
      } catch {
        this.inMemoryAccessToken = null;
      }
    }
  }

  public getAccessToken(): string | null {
    if (typeof window !== "undefined") {
      try {
        const stored =
          window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
          window.sessionStorage.getItem(LEGACY_TOKEN_KEY);
        if (stored) {
          this.inMemoryAccessToken = stored;
          return stored;
        }
        this.inMemoryAccessToken = null;
        return null;
      } catch {
        // ignore
      }
    }
    return this.inMemoryAccessToken;
  }

  public getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public setTokens(
    tokens: Pick<AuthSessionTokens, "accessToken" | "refreshToken">,
  ): void {
    this.inMemoryAccessToken = tokens.accessToken;

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
        // Clear any legacy keys
        window.sessionStorage.removeItem(LEGACY_TOKEN_KEY);
        window.sessionStorage.removeItem(LEGACY_USER_KEY);
      } catch {
        // Storage might fail if cookies/storage disabled
      }
    }
  }

  public updateAccessToken(accessToken: string): void {
    this.inMemoryAccessToken = accessToken;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      } catch {
        // Ignore
      }
    }
  }

  public clearTokens(): void {
    this.inMemoryAccessToken = null;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        window.sessionStorage.removeItem(LEGACY_TOKEN_KEY);
        window.sessionStorage.removeItem(LEGACY_USER_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      } catch {
        // Ignore
      }
    }
  }

  public hasTokens(): boolean {
    return Boolean(this.getAccessToken() || this.getRefreshToken());
  }

  /**
   * @deprecated Legacy user identity helper. Kept for backwards compatibility.
   * Identity authority is exclusively the verified Bearer JWT.
   */
  public setUser(userId?: string, role?: string): void {
    if (typeof window !== "undefined" && userId) {
      try {
        window.sessionStorage.setItem(
          LEGACY_USER_KEY,
          JSON.stringify({ id: userId, roles: role ? [role] : [] })
        );
      } catch {
        // Ignore
      }
    }
  }
}

export const sessionStorageManager = new SessionStorageManager();
