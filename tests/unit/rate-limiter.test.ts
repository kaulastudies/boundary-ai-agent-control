import { describe, expect, it } from "vitest";
import {
  FixedWindowRateLimiter,
  rateLimitedResponse,
} from "@/application/http/fixed-window-rate-limiter";

describe("public demo throttling", () => {
  it("throttles within a bounded fixed window and recovers", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter({
      limit: 2,
      windowMs: 1_000,
      now: () => now,
    });
    expect(limiter.check("public").allowed).toBe(true);
    expect(limiter.check("public").allowed).toBe(true);
    expect(limiter.check("public")).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    });
    now = 1_001;
    expect(limiter.check("public").allowed).toBe(true);
  });

  it("returns a minimal safe 429 response", async () => {
    const response = rateLimitedResponse(9);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("9");
    const body = await response.text();
    expect(body).toContain("Too many requests");
    expect(body).not.toMatch(
      /policy|OPENAI_API_KEY|SYNTHETIC-PHONE|SYNTHETIC-PAYMENT/i,
    );
  });
});
