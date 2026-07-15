import { describe, expect, it } from "vitest";
import { InMemoryApprovalStore } from "@/application/approvals/in-memory-approval-store";
import { compilePolicy } from "@/application/policy-compiler/compile-policy";
import {
  readSupportTicket,
  sendSimulatedEmail,
} from "@/adapters/tools/simulated";
import { createAuditEvent } from "@/domain/audit/create-audit-event";
import { evaluateAction } from "@/domain/enforcement/evaluate-action";
import { proposedAgentActionSchema } from "@/domain/enforcement/schemas";
import { supportPolicy } from "@/fixtures/support-policy";

const compiled = compilePolicy(supportPolicy);
const occurredAt = "2026-07-15T12:00:00.000Z";

const readAction = proposedAgentActionSchema.parse({
  id: "read-1",
  actorId: "support-agent-1",
  kind: "READ_SUPPORT_TICKET",
  risk: "LOW",
  sensitiveData: [],
  processingRoute: "LOCAL",
  ticketId: "SYNTHETIC-300",
});

const emailAction = proposedAgentActionSchema.parse({
  id: "email-1",
  actorId: "support-agent-1",
  kind: "SEND_EMAIL",
  risk: "RISKY",
  sensitiveData: [],
  processingRoute: "LOCAL",
  ticketId: "SYNTHETIC-301",
  recipient: "customer@example.test",
  recipientScope: "EXTERNAL",
  body: "Synthetic update",
});

describe("immutable audit events", () => {
  it("validates every Stage 2A audit event type", () => {
    const events = [
      createAuditEvent({
        id: "event-1",
        occurredAt,
        correlationId: "flow-1",
        type: "POLICY_COMPILED",
        policyId: compiled.id,
        sourcePolicyId: compiled.sourcePolicyId,
        ruleCount: compiled.rules.length,
      }),
      createAuditEvent({
        id: "event-2",
        occurredAt,
        correlationId: "flow-1",
        type: "ACTION_EVALUATED",
        actionId: readAction.id,
        policyId: compiled.id,
        decision: "ALLOW",
        matchedRuleId: "support:read-ticket",
      }),
      createAuditEvent({
        id: "event-3",
        occurredAt,
        correlationId: "flow-1",
        type: "APPROVAL_CREATED",
        policyId: compiled.id,
        approvalId: "approval-1",
        actionId: emailAction.id,
      }),
      createAuditEvent({
        id: "event-4",
        occurredAt,
        correlationId: "flow-1",
        type: "APPROVAL_RESOLVED",
        policyId: compiled.id,
        approvalId: "approval-1",
        actionId: emailAction.id,
        status: "APPROVED",
        resolvedBy: "reviewer-1",
      }),
      createAuditEvent({
        id: "event-5",
        occurredAt,
        correlationId: "flow-1",
        type: "SIMULATED_EXECUTION",
        policyId: compiled.id,
        approvalId: null,
        actionId: readAction.id,
        tool: "READ_SUPPORT_TICKET",
        outcome: "SIMULATED_SUCCESS",
      }),
    ];

    expect(events.map((event) => event.type)).toEqual([
      "POLICY_COMPILED",
      "ACTION_EVALUATED",
      "APPROVAL_CREATED",
      "APPROVAL_RESOLVED",
      "SIMULATED_EXECUTION",
    ]);
    expect(events.every(Object.isFrozen)).toBe(true);
  });
});

describe("side-effect-free simulated tools", () => {
  it("returns the same synthetic ticket result for the same authorized input", () => {
    const decision = evaluateAction(compiled, readAction);
    const first = readSupportTicket(readAction, { decision });
    const second = readSupportTicket(readAction, { decision });
    expect(first).toEqual(second);
    expect(first.summary).toContain("SYNTHETIC-300");
  });

  it("does not send simulated external email before approval", () => {
    const decision = evaluateAction(compiled, emailAction);
    expect(() => sendSimulatedEmail(emailAction, { decision })).toThrow(
      /not authorized/,
    );
  });

  it("returns a simulated email result after approval without external effects", () => {
    const decision = evaluateAction(compiled, emailAction);
    const approvals = new InMemoryApprovalStore({
      now: () => new Date(occurredAt),
      nextId: () => "approval-email",
    });
    const pending = approvals.create(
      decision,
      new Date("2026-07-15T13:00:00.000Z"),
      {
        actionFingerprint: "b".repeat(64),
        policyVersion: compiled.sourcePolicyVersion,
      },
    );
    const approved = approvals.approve(
      pending.id,
      "reviewer-1",
      "Approved synthetic email",
    );
    const result = sendSimulatedEmail(emailAction, {
      decision,
      approval: approved,
    });
    expect(result).toMatchObject({
      tool: "SEND_EMAIL",
      outcome: "SIMULATED_SUCCESS",
    });
  });
});
