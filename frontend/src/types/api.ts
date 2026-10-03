/**
 * MANVIA API Types & Contracts
 * Authoritative alignment with MANVIA backend (Fastify + NestJS GlobalExceptionFilter).
 */

export interface ApiErrorResponse {
  statusCode: number;
  error: string; // E.g. 'VALIDATION_FAILED', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'INTERNAL_SERVER_ERROR'
  message: string;
  details?: unknown;
  requestId: string;
  timestamp: string;
  stack?: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
}

export type HttpMethod =
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}
