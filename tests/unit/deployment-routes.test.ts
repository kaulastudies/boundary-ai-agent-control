import { describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";

vi.mock("server-only", () => ({}));

describe("deployment routes", () => {
  it("returns a minimal health response", async () => {
    const response = health();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("marks live mode unavailable without exposing configuration details", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const route = await import("@/app/api/policies/interpret/route");
    const availability = await route.GET();
    expect(await availability.json()).toEqual({ available: false });
    const response = await route.POST(
      new Request("http://example.test/api/policies/interpret", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "test-live-unavailable",
        },
        body: JSON.stringify({
          policyText: "Synthetic policy text long enough for validation.",
        }),
      }),
    );
    const body = JSON.stringify(await response.json());
    expect(response.status).toBe(503);
    expect(body).toContain("unavailable");
    expect(body).not.toMatch(/key|credential|authentication|OPENAI_API_KEY/i);
    if (previous) process.env.OPENAI_API_KEY = previous;
  });

  it("does not reflect sensitive request values in safe demo errors", async () => {
    const route = await import("@/app/api/demo/workspace/route");
    const response = await route.POST(
      new Request("http://example.test/api/demo/workspace", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "test-sensitive-error",
        },
        body: JSON.stringify({
          command: "CONFIRM",
          sessionId: "missing",
          reviewerId: "SYNTHETIC-PHONE-SYNTHETIC-PAYMENT",
        }),
      }),
    );
    const body = await response.text();
    expect(body).not.toContain("SYNTHETIC-PHONE");
    expect(body).not.toContain("SYNTHETIC-PAYMENT");
  });
});
