/**
 * MANVIA Token & Session Storage Manager
 * Safely manages short-lived access tokens and persistent refresh tokens.
 * Access tokens are kept in-memory for minimal XSS attack surface,
 * with optional sessionStorage sync. Refresh tokens are kept in secure client storage.
 */

import type { AuthSessionTokens, UserResponseDto } from "./types";

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
    if (!this.inMemoryAccessToken && typeof window !== "undefined") {
      try {
        this.inMemoryAccessToken =
          window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
          window.sessionStorage.getItem(LEGACY_TOKEN_KEY);
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

  public getStoredUser(): UserResponseDto | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(LEGACY_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          id: parsed.id,
          email: parsed.email || "",
          phone: parsed.phone || null,
          emailVerified: true,
          phoneVerified: false,
          status: "ACTIVE",
          roles: parsed.roles || ["PATIENT"],
          createdAt: new Date().toISOString(),
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  public setTokens(
    tokens: Pick<AuthSessionTokens, "accessToken" | "refreshToken">,
  ): void {
    this.inMemoryAccessToken = tokens.accessToken;

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
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

  private cachedUserContext: { userId: string; activeRole: string } | null =
    null;

  public setUser(userId: string, activeRole: string): void {
    this.cachedUserContext = { userId, activeRole };
  }

  public getUser(): { userId: string; activeRole: string } | null {
    if (!this.cachedUserContext && typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem(LEGACY_USER_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { userId: parsed.id, activeRole: parsed.roles?.[0] || "PATIENT" };
        }
      } catch {
        // ignore
      }
    }
    return this.cachedUserContext;
  }

  public clearTokens(): void {
    this.inMemoryAccessToken = null;
    this.cachedUserContext = null;
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
}

export const sessionStorageManager = new SessionStorageManager();
