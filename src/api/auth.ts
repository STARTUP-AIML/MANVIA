/**
 * Authentication API Service
 * Authoritative endpoints: /api/v1/auth/login, /api/v1/auth/register, /api/v1/auth/me, /api/v1/auth/logout
 */

import { apiFetch, setStoredToken, setStoredUser, clearSession } from './client.js';
import type { AuthResponse, User } from '../types/auth.js';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  phone?: string;
}

export async function loginApi(credentials: LoginPayload): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  if (data.accessToken) {
    setStoredToken(data.accessToken);
  }
  if (data.user) {
    setStoredUser(data.user);
  }

  return data;
}

export async function registerApi(payload: RegisterPayload): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (data.accessToken) {
    setStoredToken(data.accessToken);
  }
  if (data.user) {
    setStoredUser(data.user);
  }

  return data;
}

export async function getCurrentUserApi(): Promise<User> {
  return apiFetch<User>('/auth/me');
}

export async function logoutApi(): Promise<void> {
  try {
    await apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
  } finally {
    clearSession();
  }
}
