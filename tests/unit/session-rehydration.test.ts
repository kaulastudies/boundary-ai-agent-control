import { describe, expect, it } from "vitest";
import { DemoWorkspaceSession } from "@/application/demo/demo-workspace-session";
import { DEFAULT_DEMO_POLICY } from "@/fixtures/demo-policy-text";
import { FakeDemoSessionRepository } from "../fakes/fake-demo-session-repository";

function confirm(session: DemoWorkspaceSession) {
  const interpreted = session.interpretDemo(DEFAULT_DEMO_POLICY);
  session.confirm("judge", interpreted.draft);
}

describe("persisted demo session rehydration", () => {
  it("stores only sanitized state through a fake repository", async () => {
    const repository = new FakeDemoSessionRepository();
    const record = await repository.create("synthetic-client");
    const session = DemoWorkspaceSession.restore(record.state);
    confirm(session);
    session.submit("PII_CLOUD");
    await repository.save(record.sessionId, session.exportState());

    const serialized = JSON.stringify(repository.records.get(record.sessionId));
    expect(serialized).not.toContain("SYNTHETIC-PHONE");
    expect(serialized).not.toContain("SYNTHETIC-PAYMENT");
    expect(serialized).not.toMatch(
      /OPENAI_API_KEY|UPSTASH_REDIS_REST_TOKEN|prompt|stack/i,
    );
    expect(serialized).toContain("ACTION_REDACTED");
  });

  it("rehydrates approval metadata and exact-action continuation", async () => {
    const repository = new FakeDemoSessionRepository();
    const record = await repository.create("approval-client");
    const initial = DemoWorkspaceSession.restore(record.state);
    confirm(initial);
    const approvalId = initial.submit("LARGE_REFUND").approvals[0]!.id;
    await repository.save(record.sessionId, initial.exportState());

    const reviewer = DemoWorkspaceSession.restore(
      (await repository.get(record.sessionId))!.state,
    );
    reviewer.resolve(approvalId, "APPROVED");
    await repository.save(record.sessionId, reviewer.exportState());

    const continuation = DemoWorkspaceSession.restore(
      (await repository.get(record.sessionId))!.state,
    );
    continuation.continue(approvalId);
    await repository.save(record.sessionId, continuation.exportState());

    const restored = DemoWorkspaceSession.restore(
      (await repository.get(record.sessionId))!.state,
    );
    expect(
      restored
        .snapshot()
        .audit.filter((event) => event.type === "SIMULATED_EXECUTION"),
    ).toHaveLength(1);
  });

  it("preserves duplicate-action and replay protection after rehydration", async () => {
    const repository = new FakeDemoSessionRepository();
    const record = await repository.create("replay-client");
    const session = DemoWorkspaceSession.restore(record.state);
    confirm(session);
    const approvalId = session.submit("EXTERNAL_EMAIL").approvals[0]!.id;
    session.resolve(approvalId, "APPROVED");
    session.continue(approvalId);
    session.continue(approvalId);
    await repository.save(record.sessionId, session.exportState());

    const restored = DemoWorkspaceSession.restore(
      (await repository.get(record.sessionId))!.state,
    );
    expect(
      restored
        .snapshot()
        .audit.filter((event) => event.type === "APPROVAL_CREATED"),
    ).toHaveLength(1);
    expect(
      restored
        .snapshot()
        .audit.filter((event) => event.type === "SIMULATED_EXECUTION"),
    ).toHaveLength(1);
  });
});
