import { describe, expect, it } from "vitest";
import { BoundaryControlFlow } from "@/application/control-flow/boundary-control-flow";
import { routeActionPrivately } from "@/application/control-flow/transform-action";
import { proposedAgentActionSchema } from "@/domain/enforcement/schemas";
import { supportPolicy } from "@/fixtures/support-policy";

function harness() {
  let now = new Date("2026-07-15T12:00:00.000Z");
  const counters = { audit: 0, approval: 0 };
  const control = new BoundaryControlFlow(supportPolicy, {
    now: () => now,
    nextId: (kind) => `${kind}-${++counters[kind]}`,
    approvalTtlMs: 60_000,
  });
  return {
    control,
    setNow: (value: string) => {
      now = new Date(value);
    },
  };
}

function refund(amountInr: number, id = `refund-${amountInr}`) {
  return proposedAgentActionSchema.parse({
    id,
    actorId: "support-agent-1",
    kind: "ISSUE_REFUND",
    risk: "RISKY",
    sensitiveData: [],
    processingRoute: "LOCAL",
    ticketId: "SYNTHETIC-400",
    amountInr,
  });
}

function externalEmail(id = "email-external") {
  return proposedAgentActionSchema.parse({
    id,
    actorId: "support-agent-1",
    kind: "SEND_EMAIL",
    risk: "RISKY",
    sensitiveData: [],
    processingRoute: "LOCAL",
    ticketId: "SYNTHETIC-401",
    recipient: "customer@example.test",
    recipientScope: "EXTERNAL",
    body: "Synthetic support update",
  });
}

function ticketRead(id = "read-ticket") {
  return proposedAgentActionSchema.parse({
    id,
    actorId: "support-agent-1",
    kind: "READ_SUPPORT_TICKET",
    risk: "LOW",
    sensitiveData: [],
    processingRoute: "LOCAL",
    ticketId: "SYNTHETIC-402",
    supportContext: { summary: "Synthetic classified ticket context" },
  });
}

describe("BoundaryControlFlow", () => {
  it("executes an explicitly allowed flow once", () => {
    const { control } = harness();
    const action = refund(2_000);
    const first = control.start("flow-allowed", action);
    const second = control.start("flow-allowed", action);
    expect(first.status).toBe("EXECUTED");
    expect(second).toBe(first);
    expect(
      control.audit
        .byCorrelationId("flow-allowed")
        .filter((event) => event.type === "SIMULATED_EXECUTION"),
    ).toHaveLength(1);
  });

  it("redacts classified values, retains summary, and re-evaluates", () => {
    const { control } = harness();
    const action = proposedAgentActionSchema.parse({
      id: "read-redacted",
      actorId: "support-agent-1",
      kind: "READ_SUPPORT_TICKET",
      risk: "RISKY",
      sensitiveData: [],
      processingRoute: "CLOUD",
      ticketId: "SYNTHETIC-403",
      supportContext: {
        summary: "Synthetic customer requested a refund",
        phone: "+91-00000-00000",
        paymentReference: "SYNTHETIC-PAYMENT-SECRET",
      },
    });
    const result = control.start("flow-redacted", action);
    expect(result.status).toBe("EXECUTED");
    expect(result.action.supportContext).toEqual({
      summary: "Synthetic customer requested a refund",
    });
    expect(action.supportContext?.phone).toBe("+91-00000-00000");
    expect(
      control.audit
        .byCorrelationId("flow-redacted")
        .filter((event) => event.type === "ACTION_EVALUATED"),
    ).toHaveLength(2);
  });

  it("routes privately and re-evaluates before execution", () => {
    const { control } = harness();
    const action = proposedAgentActionSchema.parse({
      id: "read-private",
      actorId: "support-agent-1",
      kind: "READ_SUPPORT_TICKET",
      risk: "RISKY",
      sensitiveData: ["SUPPORT_TRANSCRIPT"],
      processingRoute: "CLOUD",
      ticketId: "SYNTHETIC-404",
      supportContext: { summary: "Synthetic private transcript" },
    });
    const result = control.start("flow-private", action);
    expect(result.status).toBe("EXECUTED");
    expect(result.action).toMatchObject({
      executionZone: "PRIVATE",
      processingRoute: "PRIVATE",
      routingHistory: ["PRIVATE"],
    });
    expect(
      control.audit.byCorrelationId("flow-private").map((event) => event.type),
    ).toContain("ACTION_ROUTED_PRIVATELY");
  });

  it("pauses for approval and resumes the exact action after approval", () => {
    const { control } = harness();
    const action = refund(7_500, "refund-approved");
    const pending = control.start("flow-approved", action);
    expect(pending.status).toBe("PENDING_APPROVAL");
    if (pending.status !== "PENDING_APPROVAL")
      throw new Error("Expected approval");
    control.resolveApproval(
      pending.approval.id,
      "APPROVED",
      "reviewer-1",
      "Approved",
    );
    expect(control.continueApproved(pending.approval.id, action).status).toBe(
      "EXECUTED",
    );
  });

  it("does not continue a rejected approval", () => {
    const { control } = harness();
    const action = refund(7_500, "refund-rejected");
    const pending = control.start("flow-rejected", action);
    if (pending.status !== "PENDING_APPROVAL")
      throw new Error("Expected approval");
    control.resolveApproval(
      pending.approval.id,
      "REJECTED",
      "reviewer-1",
      "Rejected",
    );
    expect(() => control.continueApproved(pending.approval.id, action)).toThrow(
      /rejected/,
    );
  });

  it("expires a pending approval before continuation", () => {
    const { control, setNow } = harness();
    const action = refund(7_500, "refund-expired");
    const pending = control.start("flow-expired", action);
    if (pending.status !== "PENDING_APPROVAL")
      throw new Error("Expected approval");
    setNow("2026-07-15T12:02:00.000Z");
    expect(() => control.continueApproved(pending.approval.id, action)).toThrow(
      /expired/,
    );
    expect(control.approvals.get(pending.approval.id)?.status).toBe("EXPIRED");
  });

  it("never executes a blocked action", () => {
    const { control } = harness();
    const action = proposedAgentActionSchema.parse({
      id: "delete-blocked",
      actorId: "support-agent-1",
      kind: "DELETE_AUDIT_LOG",
      risk: "RISKY",
      sensitiveData: [],
      processingRoute: "LOCAL",
      targetEventId: "audit-protected",
    });
    expect(control.start("flow-blocked", action).status).toBe("BLOCKED");
    expect(
      control.audit
        .byCorrelationId("flow-blocked")
        .some((event) => event.type === "SIMULATED_EXECUTION"),
    ).toBe(false);
  });

  it("rejects an action substituted after approval creation", () => {
    const { control } = harness();
    const action = refund(7_500, "refund-exact");
    const pending = control.start("flow-mismatch", action);
    if (pending.status !== "PENDING_APPROVAL")
      throw new Error("Expected approval");
    control.resolveApproval(
      pending.approval.id,
      "APPROVED",
      "reviewer-1",
      "Approved",
    );
    const substituted = refund(8_000, "refund-exact");
    expect(() =>
      control.continueApproved(pending.approval.id, substituted),
    ).toThrow(/exact action and policy version/);
  });

  it("makes identical approval resolution idempotent and rejects conflicts", () => {
    const { control } = harness();
    const action = refund(7_500, "refund-resolution");
    const pending = control.start("flow-resolution", action);
    if (pending.status !== "PENDING_APPROVAL")
      throw new Error("Expected approval");
    const first = control.resolveApproval(
      pending.approval.id,
      "APPROVED",
      "reviewer-1",
      "Approved",
    );
    const second = control.resolveApproval(
      pending.approval.id,
      "APPROVED",
      "reviewer-1",
      "Approved",
    );
    expect(second).toBe(first);
    expect(() =>
      control.resolveApproval(
        pending.approval.id,
        "REJECTED",
        "reviewer-2",
        "Changed",
      ),
    ).toThrow(/different resolution/);
    expect(
      control.audit
        .byCorrelationId("flow-resolution")
        .filter((event) => event.type === "APPROVAL_RESOLVED"),
    ).toHaveLength(1);
  });

  it("prevents duplicate simulated execution and continuation events", () => {
    const { control } = harness();
    const action = externalEmail("email-idempotent");
    const pending = control.start("flow-idempotent", action);
    if (pending.status !== "PENDING_APPROVAL")
      throw new Error("Expected approval");
    control.resolveApproval(
      pending.approval.id,
      "APPROVED",
      "reviewer-1",
      "Approved",
    );
    const first = control.continueApproved(pending.approval.id, action);
    const second = control.continueApproved(pending.approval.id, action);
    expect(second).toBe(first);
    expect(
      control.audit
        .byCorrelationId("flow-idempotent")
        .filter((event) => event.type === "SIMULATED_EXECUTION"),
    ).toHaveLength(1);
  });

  it("prevents a private-routing loop", () => {
    const routed = proposedAgentActionSchema.parse({
      id: "routing-loop",
      actorId: "support-agent-1",
      kind: "READ_SUPPORT_TICKET",
      risk: "RISKY",
      sensitiveData: ["SUPPORT_TRANSCRIPT"],
      processingRoute: "CLOUD",
      executionZone: "PRIVATE",
      routingHistory: ["PRIVATE"],
      ticketId: "SYNTHETIC-405",
    });
    expect(() => routeActionPrivately(routed)).toThrow(/loop prevented/);
  });

  it("never records original sensitive values in audit events", () => {
    const { control } = harness();
    const action = proposedAgentActionSchema.parse({
      id: "audit-redaction",
      actorId: "support-agent-1",
      kind: "READ_SUPPORT_TICKET",
      risk: "RISKY",
      sensitiveData: [],
      processingRoute: "CLOUD",
      ticketId: "SYNTHETIC-406",
      supportContext: {
        summary: "Safe synthetic summary",
        phone: "SENSITIVE-PHONE-VALUE",
        paymentReference: "SENSITIVE-PAYMENT-VALUE",
      },
    });
    control.start("flow-audit-secret", action);
    const serialized = JSON.stringify(
      control.audit.byCorrelationId("flow-audit-secret"),
    );
    expect(serialized).not.toContain("SENSITIVE-PHONE-VALUE");
    expect(serialized).not.toContain("SENSITIVE-PAYMENT-VALUE");
    expect(serialized).toContain('"categories":["PHONE","PAYMENT"]');
  });

  it("produces a complete ordered golden support timeline", () => {
    const { control } = harness();
    const [, followUp] = control.runSupportWorkflow(
      "flow-golden",
      ticketRead("golden-read"),
      externalEmail("golden-email"),
    );
    if (followUp.status !== "PENDING_APPROVAL")
      throw new Error("Expected approval");
    control.resolveApproval(
      followUp.approval.id,
      "APPROVED",
      "reviewer-1",
      "Approved",
    );
    control.continueApproved(followUp.approval.id, followUp.action);

    const timeline = control.audit.byCorrelationId("flow-golden");
    expect(timeline.map((event) => event.type)).toEqual([
      "POLICY_COMPILED",
      "ACTION_CLASSIFIED",
      "ACTION_EVALUATED",
      "SIMULATED_EXECUTION",
      "ACTION_EVALUATED",
      "APPROVAL_CREATED",
      "APPROVAL_RESOLVED",
      "SIMULATED_EXECUTION",
    ]);
    expect(timeline.every(Object.isFrozen)).toBe(true);
    expect(control.audit.all()).toHaveLength(timeline.length);
  });
});
