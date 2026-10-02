/**
 * MANVIA Frontend Environment Configuration
 * Validates and exposes strictly public client-safe runtime settings.
 */

export interface FrontendEnv {
  apiBaseUrl: string;
  backendUrl: string;
  appEnv: "development" | "staging" | "production" | "test";
  appName: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

function resolveEnv(): FrontendEnv {
  const env = import.meta.env;

  const appEnv = (env.VITE_APP_ENV ||
    env.MODE ||
    "development") as FrontendEnv["appEnv"];
  const apiBaseUrl = env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
  const backendUrl = env.VITE_BACKEND_URL || "http://localhost:3000";
  const appName = env.VITE_APP_NAME || "MANVIA";

  return {
    apiBaseUrl,
    backendUrl,
    appEnv,
    appName,
    isDevelopment: appEnv === "development",
    isProduction: appEnv === "production",
    isTest: appEnv === "test",
  };
}

export const env: FrontendEnv = resolveEnv();
