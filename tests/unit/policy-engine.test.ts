import { describe, expect, it } from "vitest";
import { compilePolicy } from "@/application/policy-compiler/compile-policy";
import { evaluateAction } from "@/domain/enforcement/evaluate-action";
import {
  enforcementDecisionSchema,
  proposedAgentActionSchema,
} from "@/domain/enforcement/schemas";
import { supportPolicy } from "@/fixtures/support-policy";

const compiledPolicy = compilePolicy(supportPolicy);
const base = {
  actorId: "support-agent-1",
  risk: "RISKY" as const,
  sensitiveData: [] as const,
  processingRoute: "LOCAL" as const,
};

function refund(amountInr: number) {
  return proposedAgentActionSchema.parse({
    ...base,
    id: `refund-${amountInr}`,
    kind: "ISSUE_REFUND",
    ticketId: "SYNTHETIC-100",
    amountInr,
  });
}

describe("policy compilation", () => {
  it("compiles only human-authored policy into deterministic rules", () => {
    expect(compiledPolicy.authority).toBe("DETERMINISTIC_ENGINE");
    expect(compiledPolicy.defaultDecision).toBe("BLOCK");
    expect(compiledPolicy.rules[0]?.priority).toBe(1_000);
  });
});

describe("deterministic enforcement", () => {
  it("allows a refund at the configured threshold", () => {
    const decision = evaluateAction(compiledPolicy, refund(5_000));
    expect(decision.decision).toBe("ALLOW");
    expect(decision.authorizedForExecution).toBe(true);
  });

  it("requires approval above the refund threshold", () => {
    const decision = evaluateAction(compiledPolicy, refund(5_001));
    expect(decision.decision).toBe("REQUIRE_APPROVAL");
    expect(decision.authorizedForExecution).toBe(false);
  });

  it("blocks a prohibited action", () => {
    const action = proposedAgentActionSchema.parse({
      ...base,
      id: "delete-1",
      kind: "DELETE_AUDIT_LOG",
      targetEventId: "audit-1",
    });
    expect(evaluateAction(compiledPolicy, action).decision).toBe("BLOCK");
  });

  it("redacts phone and payment data before cloud processing", () => {
    const action = proposedAgentActionSchema.parse({
      ...base,
      id: "read-pii",
      kind: "READ_SUPPORT_TICKET",
      ticketId: "SYNTHETIC-101",
      sensitiveData: ["PHONE", "PAYMENT"],
      processingRoute: "CLOUD",
    });
    const decision = evaluateAction(compiledPolicy, action);
    expect(decision.decision).toBe("REDACT_AND_ALLOW");
    expect(decision.redactions).toEqual(["PHONE", "PAYMENT"]);
  });

  it("routes sensitive support transcripts privately", () => {
    const action = proposedAgentActionSchema.parse({
      ...base,
      id: "read-private",
      kind: "READ_SUPPORT_TICKET",
      ticketId: "SYNTHETIC-102",
      sensitiveData: ["SUPPORT_TRANSCRIPT"],
      processingRoute: "CLOUD",
    });
    expect(evaluateAction(compiledPolicy, action).decision).toBe(
      "ROUTE_PRIVATELY",
    );
  });

  it("requires approval for external email", () => {
    const action = proposedAgentActionSchema.parse({
      ...base,
      id: "email-external",
      kind: "SEND_EMAIL",
      ticketId: "SYNTHETIC-103",
      recipient: "customer@example.test",
      recipientScope: "EXTERNAL",
      body: "Synthetic support update",
    });
    expect(evaluateAction(compiledPolicy, action).decision).toBe(
      "REQUIRE_APPROVAL",
    );
  });

  it("gives explicit block rules precedence over redaction", () => {
    const action = proposedAgentActionSchema.parse({
      ...base,
      id: "delete-with-pii",
      kind: "DELETE_AUDIT_LOG",
      targetEventId: "audit-2",
      sensitiveData: ["PHONE"],
      processingRoute: "CLOUD",
    });
    const decision = evaluateAction(compiledPolicy, action);
    expect(decision.decision).toBe("BLOCK");
    expect(decision.matchedRuleId).toBe("block:delete_audit_log");
  });

  it("rejects malformed action input", () => {
    expect(() =>
      proposedAgentActionSchema.parse({ kind: "ISSUE_REFUND", amountInr: -1 }),
    ).toThrow();
  });

  it("defaults unmatched risky actions to block", () => {
    const action = proposedAgentActionSchema.parse({
      ...base,
      id: "email-internal",
      kind: "SEND_EMAIL",
      ticketId: "SYNTHETIC-104",
      recipient: "team@example.test",
      recipientScope: "INTERNAL",
      body: "Synthetic internal update",
    });
    const decision = evaluateAction(compiledPolicy, action);
    expect(decision.decision).toBe("BLOCK");
    expect(decision.matchedRuleId).toBeNull();
  });

  it("rejects any attempt to mark approval decisions as execution-authorizing", () => {
    expect(() =>
      enforcementDecisionSchema.parse({
        actionId: "action-1",
        policyId: compiledPolicy.id,
        decision: "REQUIRE_APPROVAL",
        reason: "Untrusted model suggestion",
        matchedRuleId: "model-output",
        redactions: [],
        authorizedForExecution: true,
      }),
    ).toThrow(/Only deterministic ALLOW/);
  });
});
