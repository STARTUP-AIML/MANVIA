/**
 * MANVIA Authoritative Authentication API Service
 * Interacts directly with backend endpoints:
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/refresh
 * - POST /api/v1/auth/logout
 * - GET  /api/v1/auth/me
 * - POST /api/v1/auth/change-password
 */

import { apiClient } from "@/api/client/apiClient";
import type {
  AuthResponseDto,
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  TokenRefreshResponseDto,
  UserResponseDto,
} from "./types";

export const authService = {
  /**
   * Registers a new account with the backend.
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    return apiClient.post<AuthResponseDto>("auth/register", dto, {
      skipAuth: true,
    });
  },

  /**
   * Authenticates credentials with backend.
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    return apiClient.post<AuthResponseDto>("auth/login", dto, {
      skipAuth: true,
    });
  },

  /**
   * Performs refresh token exchange using opaque refresh token.
   */
  async refresh(dto: RefreshTokenDto): Promise<TokenRefreshResponseDto> {
    return apiClient.post<TokenRefreshResponseDto>("auth/refresh", dto, {
      skipAuth: true,
    });
  },

  /**
   * Revokes the current session on the backend.
   */
  async logout(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("auth/logout");
  },

  /**
   * Fetches the current authenticated user's profile.
   */
  async getMe(): Promise<UserResponseDto> {
    return apiClient.get<UserResponseDto>("auth/me");
  },

  /**
   * Updates user password.
   */
  async changePassword(dto: ChangePasswordDto): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("auth/change-password", dto);
  },
};
