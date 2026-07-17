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

  it("uses bounded memory only outside production", async () => {
    const { createDemoSessionRepository } =
      await import("@/adapters/upstash/create-demo-session-repository");
    const repository = createDemoSessionRepository({ NODE_ENV: "test" });
    const record = await repository.create("local-client-token");
    expect(record.sessionId).toMatch(/^workspace-/);
  });
});
