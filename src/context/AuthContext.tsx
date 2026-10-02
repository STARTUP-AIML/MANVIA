import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '../types/auth.js';
import {
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearSession,
} from '../api/client.js';
import { getCurrentUserApi, loginApi, logoutApi, type LoginPayload } from '../api/auth.js';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setManualAuth: (user: User, token: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      const storedToken = getStoredToken();
      if (storedToken) {
        try {
          const profile = await getCurrentUserApi();
          setUser(profile);
          setStoredUser(profile);
        } catch {
          // If token verification fails (e.g. server restarted with in-memory or new secret), keep user if active
          const cachedUser = getStoredUser();
          if (cachedUser) {
            setUser(cachedUser);
          } else {
            clearSession();
            setToken(null);
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const response = await loginApi(payload);
      setUser(response.user);
      setToken(response.accessToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutApi();
    } catch {
      // Still clear local state on failure
      clearSession();
    } finally {
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  }, []);

  const setManualAuth = useCallback((newUser: User, newToken: string) => {
    setStoredToken(newToken);
    setStoredUser(newUser);
    setUser(newUser);
    setToken(newToken);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    logout,
    setManualAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
