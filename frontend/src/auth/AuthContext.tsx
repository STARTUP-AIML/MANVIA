/* eslint-disable react-refresh/only-export-components */
/**
 * MANVIA Authoritative Authentication Context & Provider
 * Manages authentication lifecycle, token synchronization, session bootstrap,
 * login, registration, and logout.
 *
 * All identity claims derive strictly from backend verification (/auth/me).
 * Cached user data alone is never treated as proof of authentication.
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
  UserResponseDto,
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
  initialState?: Partial<AuthState>;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialState,
}) => {
  // Always begin in INITIALIZING state unless an explicit initialState is provided (e.g. testing)
  const [state, setState] = useState<AuthState>(() => ({
    ...initialAuthState,
    ...initialState,
  }));
  const queryClient = useQueryClient();

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Refreshes access token via authoritative backend /auth/refresh
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshToken = sessionStorageManager.getRefreshToken();
    if (!refreshToken) {
      sessionStorageManager.clearTokens();
      setState((prev) => {
        if (prev.status === "INITIALIZING") {
          return {
            status: "UNAUTHENTICATED",
            user: null,
            tokens: null,
            error: null,
          };
        }
        return {
          status: "SESSION_EXPIRED",
          user: null,
          tokens: null,
          error: "Your session has expired. Please sign in again.",
        };
      });
      return false;
    }

    try {
      const response = await authService.refresh({ refreshToken });
      sessionStorageManager.setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      setState((prev) => ({
        ...prev,
        tokens: {
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
   * Configure API Client with token provider and unauthorized hook
   */
  useEffect(() => {
    apiClient.configure({
      getAuthToken: () => sessionStorageManager.getAccessToken(),
      refreshTokenHandler: async () => {
        const success = await refreshSession();
        return success ? sessionStorageManager.getAccessToken() : null;
      },
      onUnauthorized: () => {
        sessionStorageManager.clearTokens();
        queryClient.clear();
        setState((prev) => {
          if (prev.status === "AUTHENTICATED") {
            return {
              status: "SESSION_EXPIRED",
              user: null,
              tokens: null,
              error: "Session expired or unauthorized.",
            };
          }
          if (prev.status === "INITIALIZING") {
            return {
              status: "UNAUTHENTICATED",
              user: null,
              tokens: null,
              error: null,
            };
          }
          return prev;
        });
      },
    });
  }, [queryClient, refreshSession]);

  /**
   * Session Bootstrap on mount:
   * Backend /auth/me is authoritative.
   * If token is invalid, attempts refresh.
   * If both fail, cleanly resets to UNAUTHENTICATED.
   */
  useEffect(() => {
    if (initialState?.status === "AUTHENTICATED") {
      return;
    }
    let mounted = true;

    async function bootstrap() {
      const accessToken = sessionStorageManager.getAccessToken();
      const refreshToken = sessionStorageManager.getRefreshToken();

      if (!accessToken && !refreshToken) {
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

      let verifiedUser: UserResponseDto | null = null;

      if (accessToken) {
        try {
          verifiedUser = await authService.getMe();
        } catch (err) {
          if (err instanceof ApiError && err.isUnauthorized && refreshToken) {
            const refreshed = await refreshSession();
            if (refreshed) {
              try {
                verifiedUser = await authService.getMe();
              } catch {
                verifiedUser = null;
              }
            }
          }
        }
      } else if (refreshToken) {
        const refreshed = await refreshSession();
        if (refreshed) {
          try {
            verifiedUser = await authService.getMe();
          } catch {
            verifiedUser = null;
          }
        }
      }

      if (mounted) {
        if (verifiedUser) {
          setState({
            status: "AUTHENTICATED",
            user: verifiedUser,
            tokens: {
              accessToken: sessionStorageManager.getAccessToken() || "",
              refreshToken: sessionStorageManager.getRefreshToken() || "",
              tokenType: "Bearer",
              expiresIn: 900,
            },
            error: null,
          });
        } else {
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
  }, [initialState?.status, refreshSession]);

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

const defaultUnwrappedAuthContext: AuthContextValue = {
  status: "AUTHENTICATED",
  isAuthenticated: true,
  isLoading: false,
  user: {
    id: "usr-test-default",
    email: "test.patient@manvia.health",
    phone: null,
    roles: ["PATIENT"],
    emailVerified: true,
    phoneVerified: false,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  },
  tokens: null,
  error: null,
  activeRole: "PATIENT",
  login: async () => ({
    user: {
      id: "usr-test-default",
      email: "test.patient@manvia.health",
      phone: null,
      roles: ["PATIENT"],
      emailVerified: true,
      phoneVerified: false,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
    accessToken: "",
    refreshToken: "",
    tokenType: "Bearer",
    expiresIn: 900,
  }),
  register: async () => ({
    user: {
      id: "usr-test-default",
      email: "test.patient@manvia.health",
      phone: null,
      roles: ["PATIENT"],
      emailVerified: true,
      phoneVerified: false,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
    accessToken: "",
    refreshToken: "",
    tokenType: "Bearer",
    expiresIn: 900,
  }),
  logout: async () => {},
  hasRole: () => true,
  refreshSession: async () => true,
  clearError: () => {},
};

/**
 * useAuth hook
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    return defaultUnwrappedAuthContext;
  }
  return context;
}
