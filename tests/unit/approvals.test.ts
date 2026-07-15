import { describe, expect, it } from "vitest";
import { InMemoryApprovalStore } from "@/application/approvals/in-memory-approval-store";
import { compilePolicy } from "@/application/policy-compiler/compile-policy";
import { issueSimulatedRefund } from "@/adapters/tools/simulated";
import { evaluateAction } from "@/domain/enforcement/evaluate-action";
import { proposedAgentActionSchema } from "@/domain/enforcement/schemas";
import { supportPolicy } from "@/fixtures/support-policy";

const now = new Date("2026-07-15T12:00:00.000Z");
const action = proposedAgentActionSchema.parse({
  id: "refund-approval",
  actorId: "support-agent-1",
  kind: "ISSUE_REFUND",
  risk: "RISKY",
  sensitiveData: [],
  processingRoute: "LOCAL",
  ticketId: "SYNTHETIC-200",
  amountInr: 7_500,
});
const compiled = compilePolicy(supportPolicy);
const decision = evaluateAction(compiled, action);
const binding = {
  actionFingerprint: "a".repeat(64),
  policyVersion: compiled.sourcePolicyVersion,
};

function store() {
  return new InMemoryApprovalStore({
    now: () => now,
    nextId: () => "approval-1",
  });
}

function pendingApproval() {
  return store().create(
    decision,
    new Date("2026-07-15T13:00:00.000Z"),
    binding,
  );
}

describe("in-memory approval lifecycle", () => {
  it("creates an immutable pending approval", () => {
    const approval = pendingApproval();
    expect(approval.status).toBe("PENDING");
    expect(Object.isFrozen(approval)).toBe(true);
  });

  it("approves a pending request", () => {
    const approvals = store();
    const pending = approvals.create(
      decision,
      new Date("2026-07-15T13:00:00.000Z"),
      binding,
    );
    expect(
      approvals.approve(pending.id, "reviewer-1", "Within support exception")
        .status,
    ).toBe("APPROVED");
  });

  it("rejects a pending request", () => {
    const approvals = store();
    const pending = approvals.create(
      decision,
      new Date("2026-07-15T13:00:00.000Z"),
      binding,
    );
    expect(
      approvals.reject(pending.id, "reviewer-1", "Insufficient evidence")
        .status,
    ).toBe("REJECTED");
  });

  it("expires a pending request", () => {
    const approvals = store();
    const pending = approvals.create(
      decision,
      new Date("2026-07-15T13:00:00.000Z"),
      binding,
    );
    expect(approvals.expire(pending.id).status).toBe("EXPIRED");
  });

  it("prevents a resolved request from transitioning again", () => {
    const approvals = store();
    const pending = approvals.create(
      decision,
      new Date("2026-07-15T13:00:00.000Z"),
      binding,
    );
    approvals.reject(pending.id, "reviewer-1", "Rejected");
    expect(() =>
      approvals.approve(pending.id, "reviewer-2", "Override"),
    ).toThrow(/already REJECTED/);
  });

  it("permits simulation only after human approval", () => {
    const approvals = store();
    const pending = approvals.create(
      decision,
      new Date("2026-07-15T13:00:00.000Z"),
      binding,
    );
    expect(() =>
      issueSimulatedRefund(action, { decision, approval: pending }),
    ).toThrow(/not authorized/);
    const approved = approvals.approve(pending.id, "reviewer-1", "Approved");
    expect(
      issueSimulatedRefund(action, { decision, approval: approved }).outcome,
    ).toBe("SIMULATED_SUCCESS");
  });
});
