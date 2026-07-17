import { describe, expect, it, vi } from "vitest";
import { SessionRepositoryUnavailableError } from "@/application/demo/session-repository";

vi.mock("server-only", () => ({}));

describe("production session repository selection", () => {
  it("fails closed when production Redis configuration is absent", async () => {
    const { createDemoSessionRepository } =
      await import("@/adapters/upstash/create-demo-session-repository");
    const repository = createDemoSessionRepository({ NODE_ENV: "production" });
    await expect(repository.create("production-client-token")).rejects.toThrow(
      SessionRepositoryUnavailableError,
    );
  });

  it("accepts Vercel KV aliases for production Redis", async () => {
    const { createDemoSessionRepository } =
      await import("@/adapters/upstash/create-demo-session-repository");
    const { UpstashDemoSessionRepository } =
      await import("@/adapters/upstash/upstash-demo-session-repository");

    const repository = createDemoSessionRepository({
      NODE_ENV: "production",
      KV_REST_API_URL: "https://synthetic-redis.example",
      KV_REST_API_TOKEN: "synthetic-token",
    });

    expect(repository).toBeInstanceOf(UpstashDemoSessionRepository);
  });

  it("uses bounded memory only outside production", async () => {
    const { createDemoSessionRepository } =
      await import("@/adapters/upstash/create-demo-session-repository");
    const repository = createDemoSessionRepository({ NODE_ENV: "test" });
    const record = await repository.create("local-client-token");
    expect(record.sessionId).toMatch(/^workspace-/);
  });
});
