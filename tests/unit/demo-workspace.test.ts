import { describe, expect, it } from "vitest";
import { DemoWorkspaceSession } from "@/application/demo/demo-workspace-session";
import { createDemoPolicyInterpretation } from "@/fixtures/demo-policy-interpretation";
import { DEFAULT_DEMO_POLICY } from "@/fixtures/demo-policy-text";

function confirmedSession() {
  const session = new DemoWorkspaceSession(
    () => new Date("2026-07-15T12:00:00.000Z"),
  );
  session.interpretDemo(DEFAULT_DEMO_POLICY);
  session.confirm("judge");
  return session;
}

describe("Stage 4 judge workspace", () => {
  it("runs demo interpretation without environment credentials", () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const snapshot = new DemoWorkspaceSession().interpretDemo(
      DEFAULT_DEMO_POLICY,
    );
    expect(snapshot.draft?.status).toBe("UNCONFIRMED");
    expect(snapshot.compiledPolicy).toBeNull();
    if (previous) process.env.OPENAI_API_KEY = previous;
  });

  it("accepts the validated live-route response contract as unconfirmed", () => {
    const session = new DemoWorkspaceSession();
    const snapshot = session.setLiveDraft(
      createDemoPolicyInterpretation(DEFAULT_DEMO_POLICY),
    );
    expect(snapshot.draft?.status).toBe("UNCONFIRMED");
    expect(snapshot.compiledPolicy).toBeNull();
  });

  it("does not compile an unconfirmed proposal", () => {
    const snapshot = new DemoWorkspaceSession().interpretDemo(
      DEFAULT_DEMO_POLICY,
    );
    expect(snapshot.compiledPolicy).toBeNull();
    expect(snapshot.audit).toHaveLength(0);
  });

  it.each([
    ["SAFE_REFUND", "EXECUTED", "ALLOW"],
    ["LARGE_REFUND", "PENDING_APPROVAL", "REQUIRE_APPROVAL"],
    ["EXTERNAL_EMAIL", "PENDING_APPROVAL", "REQUIRE_APPROVAL"],
    ["BLOCKED_DELETE", "BLOCKED", "BLOCK"],
  ] as const)("evaluates %s as %s", (preset, status, decision) => {
    const snapshot = confirmedSession().submit(preset);
    expect(snapshot.lastResult?.status).toBe(status);
    expect(snapshot.lastResult?.decision.decision).toBe(decision);
  });

  it("redacts classified values and omits them from audit", () => {
    const snapshot = confirmedSession().submit("PII_CLOUD");
    expect(snapshot.lastResult?.status).toBe("EXECUTED");
    expect(snapshot.lastResult?.action.supportContext).toEqual({
      summary: "Customer reports a duplicate charge.",
    });
    expect(JSON.stringify(snapshot.audit)).not.toContain("SYNTHETIC-PHONE");
    expect(JSON.stringify(snapshot.audit)).not.toContain("SYNTHETIC-PAYMENT");
    expect(snapshot.audit.map((event) => event.type)).toContain(
      "ACTION_REDACTED",
    );
  });

  it("routes transcripts privately before execution", () => {
    const snapshot = confirmedSession().submit("PRIVATE_TRANSCRIPT");
    expect(snapshot.lastResult?.action.executionZone).toBe("PRIVATE");
    expect(snapshot.audit.map((event) => event.type)).toContain(
      "ACTION_ROUTED_PRIVATELY",
    );
  });

  it("requires approval and continues only the preserved action", () => {
    const session = confirmedSession();
    const pending = session.submit("LARGE_REFUND").approvals[0]!;
    session.resolve(pending.id, "APPROVED");
    const snapshot = session.continue(pending.id);
    expect(snapshot.lastResult?.status).toBe("EXECUTED");
    expect(snapshot.audit.at(-1)?.type).toBe("SIMULATED_EXECUTION");
  });

  it("rejects and expires approvals without execution", () => {
    const rejected = confirmedSession();
    const rejectedId = rejected.submit("LARGE_REFUND").approvals[0]!.id;
    rejected.resolve(rejectedId, "REJECTED");
    expect(() => rejected.continue(rejectedId)).toThrow("rejected");
    const expired = confirmedSession();
    const expiredId = expired.submit("EXTERNAL_EMAIL").approvals[0]!.id;
    expired.expire(expiredId);
    expect(() => expired.continue(expiredId)).toThrow("expired");
  });

  it("runs adversarial fixtures without simulated executions", () => {
    const snapshot = confirmedSession().runAdversarial();
    expect(snapshot.adversarialReport?.fixtures.length).toBeGreaterThan(0);
    expect(
      snapshot.adversarialReport?.fixtures.every(
        (fixture) => !("result" in fixture),
      ),
    ).toBe(true);
    expect(snapshot.audit).toHaveLength(0);
  });

  it("preserves a complete ordered golden-path audit", () => {
    const session = confirmedSession();
    const pending = session.submit("LARGE_REFUND").approvals[0]!;
    session.resolve(pending.id, "APPROVED");
    const types = session.continue(pending.id).audit.map((event) => event.type);
    expect(types).toEqual([
      "POLICY_COMPILED",
      "ACTION_EVALUATED",
      "APPROVAL_CREATED",
      "APPROVAL_RESOLVED",
      "SIMULATED_EXECUTION",
    ]);
  });
});
