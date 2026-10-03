import { describe, it, expect } from "vitest";
import { env } from "@/lib/env";

describe("MANVIA Safe Environment Model & Security Invariants", () => {
  it("exposes strictly public, client-safe variables", () => {
    expect(env.apiBaseUrl).toBeDefined();
    expect(env.backendUrl).toBeDefined();
    expect(env.appEnv).toBeDefined();
    expect(env.appName).toBe("MANVIA");
  });

  it("guarantees NO backend secrets or credentials are leaked in frontend environment", () => {
    const rawEnv = import.meta.env as Record<string, unknown>;

    // Blacklist of forbidden backend secret patterns
    const forbiddenPatterns = [
      /DATABASE_URL/i,
      /POSTGRES/i,
      /REDIS/i,
      /SECRET/i,
      /PRIVATE_KEY/i,
      /SERVICE_ROLE/i,
      /PAYMENT_SECRET/i,
      /STRIPE_SECRET/i,
      /RAZORPAY_KEY_SECRET/i,
      /GEMINI_API_KEY/i,
      /OPENAI_API_KEY/i,
    ];

    for (const key of Object.keys(rawEnv)) {
      for (const pattern of forbiddenPatterns) {
        expect(key).not.toMatch(pattern);
      }
    }
  });
});
