/**
 * Centralized API Client for MANVIA Frontend
 * Strictly connects to backend at http://localhost:3000/api/v1 or relative /api/v1 proxy.
 * Implements token & header injection (Authorization Bearer, x-user-id, x-user-role).
 */

import type { User } from '../types/auth.js';

const STORAGE_TOKEN_KEY = 'manvia_auth_token';
const STORAGE_USER_KEY = 'manvia_auth_user';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    sessionStorage.setItem(STORAGE_TOKEN_KEY, token);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  try {
    sessionStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_USER_KEY);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const user = getStoredUser();

  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (user) {
    headers.set('x-user-id', user.id);
    const activeRole = user.roles && user.roles.length > 0 ? user.roles[0] : 'PATIENT';
    headers.set('x-user-role', activeRole);
    headers.set('x-active-role', activeRole);
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let data: unknown;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorObj = data as { message?: string | string[]; error?: string; statusCode?: number };
    const message = Array.isArray(errorObj?.message)
      ? errorObj.message.join(', ')
      : errorObj?.message || errorObj?.error || `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
