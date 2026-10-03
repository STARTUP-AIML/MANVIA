/* eslint-disable react-refresh/only-export-components */
/**
 * MANVIA Authoritative Authentication Context & Provider
 * Manages authentication lifecycle, token synchronization, session bootstrap,
 * login, registration, and logout.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client/apiClient";
import { ApiError } from "@/api/errors/apiError";
import { sessionStorageManager } from "./sessionStorage";
import { authService } from "./authService";
import type {
  AuthContextValue,
  AuthResponseDto,
  AuthState,
  LoginDto,
  RegisterDto,
  Role,
} from "./types";

const initialAuthState: AuthState = {
  status: "INITIALIZING",
  user: null,
  tokens: null,
  error: null,
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const storedUser = sessionStorageManager.getStoredUser();
    const token = sessionStorageManager.getAccessToken();
    if (storedUser && token) {
      return {
        status: "AUTHENTICATED",
        user: storedUser,
        tokens: {
          accessToken: token,
          refreshToken: sessionStorageManager.getRefreshToken() || "",
          tokenType: "Bearer",
          expiresIn: 900,
        },
        error: null,
      };
    }
    return initialAuthState;
  });
  const queryClient = useQueryClient();

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Refreshes access token via refreshTokenHandler
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshToken = sessionStorageManager.getRefreshToken();
    if (!refreshToken) {
      sessionStorageManager.clearTokens();
      setState({
        status: "UNAUTHENTICATED",
        user: null,
        tokens: null,
        error: null,
      });
      return false;
    }

    try {
      const response = await authService.refresh({ refreshToken });
      sessionStorageManager.setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      // Update access token in state
      setState((prev) => ({
        ...prev,
        tokens: prev.tokens
          ? {
              ...prev.tokens,
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
              expiresIn: response.expiresIn,
            }
          : {
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
              tokenType: response.tokenType || "Bearer",
              expiresIn: response.expiresIn,
            },
      }));
      return true;
    } catch {
      sessionStorageManager.clearTokens();
      queryClient.clear();
      setState({
        status: "SESSION_EXPIRED",
        user: null,
        tokens: null,
        error: "Your session has expired. Please sign in again.",
      });
      return false;
    }
  }, [queryClient]);

  /**
   * Configure API Client with auth hooks and user context
   */
  useEffect(() => {
    if (state.user) {
      sessionStorageManager.setUser(
        state.user.id,
        state.user.roles[0] || "PATIENT",
      );
    }
    apiClient.configure({
      getAuthToken: () => sessionStorageManager.getAccessToken(),
      getUserContext: () => sessionStorageManager.getUser(),
      refreshTokenHandler: async () => {
        const success = await refreshSession();
        return success ? sessionStorageManager.getAccessToken() : null;
      },
      onUnauthorized: () => {
        sessionStorageManager.clearTokens();
        queryClient.clear();
        setState((prev) => {
          if (
            prev.status === "AUTHENTICATED" ||
            prev.status === "INITIALIZING"
          ) {
            return {
              status: "SESSION_EXPIRED",
              user: null,
              tokens: null,
              error: "Session expired or unauthorized.",
            };
          }
          return prev;
        });
      },
    });
  }, [queryClient, refreshSession, state.user]);

  /**
   * Session Bootstrap on mount
   */
  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const refreshToken = sessionStorageManager.getRefreshToken();
      const accessToken = sessionStorageManager.getAccessToken();
      const storedUser = sessionStorageManager.getStoredUser();

      if (!refreshToken && !accessToken && !storedUser) {
        if (mounted) {
          setState({
            status: "UNAUTHENTICATED",
            user: null,
            tokens: null,
            error: null,
          });
        }
        return;
      }

      if (storedUser && accessToken) {
        if (mounted) {
          setState({
            status: "AUTHENTICATED",
            user: storedUser,
            tokens: {
              accessToken,
              refreshToken: refreshToken || "",
              tokenType: "Bearer",
              expiresIn: 900,
            },
            error: null,
          });
        }
        try {
          const user = await authService.getMe();
          if (mounted && user) {
            setState((prev) => ({ ...prev, user }));
          }
        } catch {
          // Keep storedUser
        }
        return;
      }

      try {
        // If we have no accessToken or need to verify session, fetch me
        let user;
        try {
          user = await authService.getMe();
        } catch (err) {
          if (err instanceof ApiError && err.isUnauthorized && refreshToken) {
            // Attempt refresh once
            const refreshed = await refreshSession();
            if (refreshed) {
              user = await authService.getMe();
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }

        if (mounted && user) {
          setState({
            status: "AUTHENTICATED",
            user,
            tokens: {
              accessToken: sessionStorageManager.getAccessToken() || "",
              refreshToken: sessionStorageManager.getRefreshToken() || "",
              tokenType: "Bearer",
              expiresIn: 900,
            },
            error: null,
          });
        }
      } catch {
        if (mounted) {
          sessionStorageManager.clearTokens();
          setState({
            status: "UNAUTHENTICATED",
            user: null,
            tokens: null,
            error: null,
          });
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [refreshSession]);

  /**
   * Login handler
   */
  const login = useCallback(async (dto: LoginDto): Promise<AuthResponseDto> => {
    setState((prev) => ({ ...prev, status: "AUTHENTICATING", error: null }));
    try {
      const response = await authService.login(dto);
      sessionStorageManager.setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      setState({
        status: "AUTHENTICATED",
        user: response.user,
        tokens: {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          tokenType: response.tokenType,
          expiresIn: response.expiresIn,
        },
        error: null,
      });

      return response;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to sign in. Please verify your credentials.";
      setState((prev) => ({
        ...prev,
        status: "UNAUTHENTICATED",
        error: message,
      }));
      throw err;
    }
  }, []);

  /**
   * Register handler
   */
  const register = useCallback(
    async (dto: RegisterDto): Promise<AuthResponseDto> => {
      setState((prev) => ({ ...prev, status: "AUTHENTICATING", error: null }));
      try {
        const response = await authService.register(dto);
        sessionStorageManager.setTokens({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });

        setState({
          status: "AUTHENTICATED",
          user: response.user,
          tokens: {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            tokenType: response.tokenType,
            expiresIn: response.expiresIn,
          },
          error: null,
        });

        return response;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to create account. Please try again.";
        setState((prev) => ({
          ...prev,
          status: "UNAUTHENTICATED",
          error: message,
        }));
        throw err;
      }
    },
    [],
  );

  /**
   * Logout handler
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      if (sessionStorageManager.getAccessToken()) {
        await authService.logout().catch(() => {
          // Ignore network failure on backend logout
        });
      }
    } finally {
      sessionStorageManager.clearTokens();
      queryClient.clear();
      setState({
        status: "UNAUTHENTICATED",
        user: null,
        tokens: null,
        error: null,
      });
    }
  }, [queryClient]);

  /**
   * Role check helper
   */
  const hasRole = useCallback(
    (roles: Role | Role[]): boolean => {
      if (!state.user) return false;
      const targetRoles = Array.isArray(roles) ? roles : [roles];
      return targetRoles.some((r) => state.user?.roles.includes(r));
    },
    [state.user],
  );

  const activeRole = useMemo<Role | null>(() => {
    if (!state.user || state.user.roles.length === 0) return null;
    return state.user.roles[0] ?? null;
  }, [state.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: state.status === "AUTHENTICATED" && Boolean(state.user),
      isLoading:
        state.status === "INITIALIZING" || state.status === "AUTHENTICATING",
      activeRole,
      login,
      register,
      logout,
      hasRole,
      refreshSession,
      clearError,
    }),
    [
      state,
      activeRole,
      login,
      register,
      logout,
      hasRole,
      refreshSession,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth hook
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
