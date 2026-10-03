import { describe, it, expect } from "vitest";
import { createQueryClient } from "@/app/providers/QueryProvider";
import { ApiError } from "@/api/errors/apiError";

describe("QueryClient Foundation Defaults", () => {
  it("initializes with required caching and staleTime defaults", () => {
    const client = createQueryClient();
    const defaultOptions = client.getDefaultOptions();

    expect(defaultOptions.queries?.staleTime).toBe(1000 * 60 * 5); // 5 minutes
    expect(defaultOptions.queries?.gcTime).toBe(1000 * 60 * 10); // 10 minutes
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });

  it("suppresses retries on 4xx client errors (401, 403, 404)", () => {
    const client = createQueryClient();
    const retryFn = client.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;

    expect(typeof retryFn).toBe("function");

    const unauthorizedError = new ApiError({
      statusCode: 401,
      error: "UNAUTHORIZED",
      message: "Unauthorized",
    });
    expect(retryFn(0, unauthorizedError)).toBe(false);

    const forbiddenError = new ApiError({
      statusCode: 403,
      error: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(retryFn(0, forbiddenError)).toBe(false);

    const notFoundError = new ApiError({
      statusCode: 404,
      error: "NOT_FOUND",
      message: "Not found",
    });
    expect(retryFn(0, notFoundError)).toBe(false);
  });

  it("permits retry up to threshold on server 5xx errors", () => {
    const client = createQueryClient();
    const retryFn = client.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;

    const serverError = new ApiError({
      statusCode: 500,
      error: "INTERNAL_SERVER_ERROR",
      message: "Database connection failed",
    });

    expect(retryFn(0, serverError)).toBe(true);
    expect(retryFn(1, serverError)).toBe(true);
    expect(retryFn(2, serverError)).toBe(false);
  });
});
