import { describe, expect, it } from "vitest";
import { InMemoryDemoSessionRepository } from "@/application/demo/in-memory-demo-session-repository";
import { SessionCapacityError } from "@/application/demo/session-repository";

describe("bounded in-memory session repository", () => {
  it("expires and cleans sessions after inactivity", async () => {
    let now = 0;
    const repository = new InMemoryDemoSessionRepository({
      now: () => now,
      ttlMs: 1_000,
      nextId: () => "one",
    });
    const created = await repository.create("client-token-one");
    now = 1_001;
    expect(await repository.get(created.sessionId)).toBeNull();
    expect(repository.size).toBe(0);
  });

  it("enforces the maximum active-session bound", async () => {
    let id = 0;
    const repository = new InMemoryDemoSessionRepository({
      maxSessions: 2,
      nextId: () => String(++id),
    });
    await repository.create("client-token-one");
    await repository.create("client-token-two");
    await expect(repository.create("client-token-three")).rejects.toThrow(
      SessionCapacityError,
    );
  });

  it("cleans expired sessions before enforcing capacity", async () => {
    let now = 0;
    let id = 0;
    const repository = new InMemoryDemoSessionRepository({
      now: () => now,
      ttlMs: 100,
      maxSessions: 1,
      nextId: () => String(++id),
    });
    await repository.create("client-token-one");
    now = 101;
    expect((await repository.create("client-token-two")).sessionId).toBe(
      "workspace-2",
    );
    expect(repository.size).toBe(1);
  });

  it("reuses duplicate initialization and resets safely", async () => {
    let id = 0;
    const repository = new InMemoryDemoSessionRepository({
      nextId: () => String(++id),
    });
    const first = await repository.create("stable-client-token");
    const duplicate = await repository.create("stable-client-token");
    expect(duplicate.sessionId).toBe(first.sessionId);
    expect(duplicate.reused).toBe(true);
    const reset = (await repository.reset(first.sessionId))!;
    expect(reset.sessionId).not.toBe(first.sessionId);
    expect(await repository.get(first.sessionId)).toBeNull();
    expect(reset.state.audit).toHaveLength(0);
  });
});
