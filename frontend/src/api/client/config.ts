/**
 * API Client Configuration
 */

import { env } from "@/lib/env";

export interface ApiClientConfig {
  baseUrl: string;
  defaultTimeoutMs: number;
  getAuthToken?: () => string | null | Promise<string | null>;
  getUserContext?: () => { userId: string; activeRole: string } | null;
  onUnauthorized?: () => void;
  refreshTokenHandler?: () => Promise<string | null>;
}

export const defaultApiConfig: ApiClientConfig = {
  baseUrl: env.apiBaseUrl,
  defaultTimeoutMs: 15000,
};
