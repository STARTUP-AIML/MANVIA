/**
 * MANVIA Normalized API Error
 * Standardized error class modeling backend GlobalExceptionFilter contracts.
 */

import type { ApiErrorResponse } from "@/types/api";

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly error: string;
  public readonly requestId: string;
  public readonly timestamp: string;
  public readonly details?: unknown;
  public readonly raw?: unknown;

  constructor(
    payload: Partial<ApiErrorResponse> & { message: string },
    raw?: unknown,
  ) {
    super(payload.message);
    this.name = "ApiError";
    this.statusCode = payload.statusCode ?? 500;
    this.error = payload.error ?? "INTERNAL_SERVER_ERROR";
    this.requestId = payload.requestId ?? "unknown-request-id";
    this.timestamp = payload.timestamp ?? new Date().toISOString();
    this.details = payload.details;
    this.raw = raw;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  public get isNetworkError(): boolean {
    return this.statusCode === 0 || this.error === "NETWORK_ERROR";
  }

  public get isTimeout(): boolean {
    return this.statusCode === 408 || this.error === "TIMEOUT";
  }

  public get isUnauthorized(): boolean {
    return this.statusCode === 401 || this.error === "UNAUTHORIZED";
  }

  public get isForbidden(): boolean {
    return this.statusCode === 403 || this.error === "FORBIDDEN";
  }

  public get isNotFound(): boolean {
    return this.statusCode === 404 || this.error === "NOT_FOUND";
  }

  public get isValidationError(): boolean {
    return this.statusCode === 400 || this.error === "VALIDATION_FAILED";
  }

  public get isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  public get isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /**
   * Factory for creating a Network/Offline error.
   */
  public static network(
    message = "Network connection failed. Please check your internet.",
  ): ApiError {
    return new ApiError({
      statusCode: 0,
      error: "NETWORK_ERROR",
      message,
      requestId: `client-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Factory for creating a Request Timeout error.
   */
  public static timeout(
    message = "Request timed out after waiting for server response.",
  ): ApiError {
    return new ApiError({
      statusCode: 408,
      error: "TIMEOUT",
      message,
      requestId: `client-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
  }
}
