import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient } from "@/api/client/apiClient";
import { ApiError } from "@/api/errors/apiError";

describe("Centralized ApiClient Foundation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with default configuration", () => {
    const client = new ApiClient({ baseUrl: "http://localhost:3000/api/v1" });
    const config = client.getConfig();

    expect(config.baseUrl).toBe("http://localhost:3000/api/v1");
    expect(config.defaultTimeoutMs).toBe(15000);
  });

  it("allows dynamic configuration updates", () => {
    const client = new ApiClient({ baseUrl: "http://localhost:3000/api/v1" });
    client.configure({
      baseUrl: "https://api.manvia.health/v1",
      defaultTimeoutMs: 20000,
    });

    const config = client.getConfig();
    expect(config.baseUrl).toBe("https://api.manvia.health/v1");
    expect(config.defaultTimeoutMs).toBe(20000);
  });

  it("dispatches GET request with correlation ID and accept headers", async () => {
    const client = new ApiClient({ baseUrl: "http://localhost:3000/api/v1" });

    const mockResponseData = { data: "test-payload" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "x-request-id": "mock-req-123" }),
      text: () => Promise.resolve(JSON.stringify(mockResponseData)),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await client.get("/health");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0]!;
    const [calledUrl, calledOptions] = callArgs;
    expect(calledUrl).toBe("http://localhost:3000/api/v1/health");
    expect(calledOptions.method).toBe("GET");

    const headers = calledOptions.headers as Headers;
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.has("x-request-id")).toBe(true);
    expect(result).toEqual(mockResponseData);
  });

  it("attaches Bearer token when getAuthToken provider is configured", async () => {
    const client = new ApiClient({
      baseUrl: "http://localhost:3000/api/v1",
      getAuthToken: () => "mock-jwt-token-xyz",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve(JSON.stringify({ success: true })),
    });
    vi.stubGlobal("fetch", fetchMock);

    await client.get("/profile");

    const callArgs = fetchMock.mock.calls[0]!;
    const [, calledOptions] = callArgs;
    const headers = calledOptions.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer mock-jwt-token-xyz");
  });

  it("normalizes backend ApiErrorResponse on 400 Bad Request / Validation Failure", async () => {
    const client = new ApiClient({ baseUrl: "http://localhost:3000/api/v1" });

    const backendError = {
      statusCode: 400,
      error: "VALIDATION_FAILED",
      message: "Request validation failed",
      details: ["email must be an email"],
      requestId: "req-val-123",
      timestamp: "2026-10-02T12:00:00.000Z",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      headers: new Headers({ "x-request-id": "req-val-123" }),
      text: () => Promise.resolve(JSON.stringify(backendError)),
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      await client.post("/users", { email: "invalid" });
      expect.fail("Should have thrown ApiError");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(400);
      expect(apiErr.error).toBe("VALIDATION_FAILED");
      expect(apiErr.message).toBe("Request validation failed");
      expect(apiErr.isValidationError).toBe(true);
      expect(apiErr.requestId).toBe("req-val-123");
    }
  });

  it("normalizes 401 Unauthorized and triggers onUnauthorized callback when no refresh handler succeeds", async () => {
    const onUnauthorizedMock = vi.fn();
    const client = new ApiClient({
      baseUrl: "http://localhost:3000/api/v1",
      onUnauthorized: onUnauthorizedMock,
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      headers: new Headers(),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            statusCode: 401,
            error: "UNAUTHORIZED",
            message: "Token expired",
          }),
        ),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(client.get("/protected")).rejects.toThrow("Token expired");
    expect(onUnauthorizedMock).toHaveBeenCalledTimes(1);
  });

  it("attempts token refresh on 401 and retries original request if new token obtained", async () => {
    let callCount = 0;
    let currentToken = "initial-stale-token";

    const client = new ApiClient({
      baseUrl: "http://localhost:3000/api/v1",
      getAuthToken: () => currentToken,
      refreshTokenHandler: async () => {
        currentToken = "refreshed-fresh-token";
        return currentToken;
      },
    });

    const fetchMock = vi.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        // First call fails with 401
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          headers: new Headers(),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                statusCode: 401,
                error: "UNAUTHORIZED",
                message: "Token expired",
              }),
            ),
        });
      }
      // Second retried call succeeds
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () =>
          Promise.resolve(JSON.stringify({ data: "success-after-refresh" })),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await client.get<{ data: string }>("/protected-resource");

    expect(result).toEqual({ data: "success-after-refresh" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
