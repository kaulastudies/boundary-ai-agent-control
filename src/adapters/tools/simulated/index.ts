import type { ApprovalRequest } from "@/domain/approvals/schemas";
import { approvalRequestSchema } from "@/domain/approvals/schemas";
import type {
  EnforcementDecision,
  ProposedAgentAction,
} from "@/domain/enforcement/schemas";
import {
  enforcementDecisionSchema,
  proposedAgentActionSchema,
} from "@/domain/enforcement/schemas";

export interface ExecutionAuthorization {
  readonly decision: EnforcementDecision;
  readonly approval?: ApprovalRequest;
}

function assertAuthorized(
  actionId: string,
  authorization: ExecutionAuthorization,
): void {
  const decision = enforcementDecisionSchema.parse(authorization.decision);
  if (decision.actionId !== actionId)
    throw new Error("Decision does not match action");
  if (decision.authorizedForExecution) return;

  if (decision.decision === "REQUIRE_APPROVAL" && authorization.approval) {
    const approval = approvalRequestSchema.parse(authorization.approval);
    if (approval.actionId === actionId && approval.status === "APPROVED")
      return;
  }

  throw new Error("Action is not authorized for simulated execution");
}

export type SimulatedToolResult = Readonly<{
  actionId: string;
  tool: "READ_SUPPORT_TICKET" | "ISSUE_REFUND" | "SEND_EMAIL";
  outcome: "SIMULATED_SUCCESS";
  summary: string;
}>;

export function readSupportTicket(
  input: ProposedAgentAction,
  authorization: ExecutionAuthorization,
): SimulatedToolResult {
  const action = proposedAgentActionSchema.parse(input);
  if (action.kind !== "READ_SUPPORT_TICKET")
    throw new Error("Expected ticket-read action");
  assertAuthorized(action.id, authorization);
  return Object.freeze({
    actionId: action.id,
    tool: action.kind,
    outcome: "SIMULATED_SUCCESS",
    summary: `Read synthetic support ticket ${action.ticketId}`,
  });
}

export function issueSimulatedRefund(
  input: ProposedAgentAction,
  authorization: ExecutionAuthorization,
): SimulatedToolResult {
  const action = proposedAgentActionSchema.parse(input);
  if (action.kind !== "ISSUE_REFUND") throw new Error("Expected refund action");
  assertAuthorized(action.id, authorization);
  return Object.freeze({
    actionId: action.id,
    tool: action.kind,
    outcome: "SIMULATED_SUCCESS",
    summary: `Simulated INR ${action.amountInr} refund for ${action.ticketId}`,
  });
}

export function sendSimulatedEmail(
  input: ProposedAgentAction,
  authorization: ExecutionAuthorization,
): SimulatedToolResult {
  const action = proposedAgentActionSchema.parse(input);
  if (action.kind !== "SEND_EMAIL") throw new Error("Expected email action");
  assertAuthorized(action.id, authorization);
  return Object.freeze({
    actionId: action.id,
    tool: action.kind,
    outcome: "SIMULATED_SUCCESS",
    summary: `Simulated email to ${action.recipient}`,
  });
}
