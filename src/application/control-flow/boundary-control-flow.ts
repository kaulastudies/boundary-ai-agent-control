import type { ApprovalRequest } from "@/domain/approvals/schemas";
import type {
  EnforcementDecision,
  ProposedAgentAction,
} from "@/domain/enforcement/schemas";
import { proposedAgentActionSchema } from "@/domain/enforcement/schemas";
import type { AuthoredPolicy, CompiledPolicy } from "@/domain/policy/schemas";
import { compilePolicy } from "@/application/policy-compiler/compile-policy";
import { InMemoryApprovalStore } from "@/application/approvals/in-memory-approval-store";
import { InMemoryAuditLedger } from "@/application/audit/in-memory-audit-ledger";
import { evaluateAction } from "@/domain/enforcement/evaluate-action";
import {
  issueSimulatedRefund,
  readSupportTicket,
  sendSimulatedEmail,
  type SimulatedToolResult,
} from "@/adapters/tools/simulated";
import { fingerprintAction } from "@/application/control-flow/action-fingerprint";
import {
  classifySupportContext,
  redactAction,
  routeActionPrivately,
} from "@/application/control-flow/transform-action";

export interface ControlFlowDependencies {
  readonly now: () => Date;
  readonly nextId: (kind: "audit" | "approval") => string;
  readonly approvalTtlMs?: number;
}

export type ControlFlowResult =
  | Readonly<{
      status: "EXECUTED";
      action: ProposedAgentAction;
      decision: EnforcementDecision;
      result: SimulatedToolResult;
    }>
  | Readonly<{
      status: "PENDING_APPROVAL";
      action: ProposedAgentAction;
      decision: EnforcementDecision;
      approval: ApprovalRequest;
    }>
  | Readonly<{
      status: "BLOCKED";
      action: ProposedAgentAction;
      decision: EnforcementDecision;
    }>;

interface PendingFlow {
  readonly correlationId: string;
  readonly flowKey: string;
  readonly action: ProposedAgentAction;
  readonly actionFingerprint: string;
  readonly decision: EnforcementDecision;
  readonly policyId: string;
  readonly policyVersion: string;
}

export class BoundaryControlFlow {
  readonly policy: CompiledPolicy;
  readonly approvals: InMemoryApprovalStore;
  readonly audit: InMemoryAuditLedger;
  readonly #compiledCorrelations = new Set<string>();
  readonly #evaluations = new Map<string, EnforcementDecision>();
  readonly #starts = new Map<string, ControlFlowResult>();
  readonly #pending = new Map<string, PendingFlow>();
  readonly #approvalByFlow = new Map<string, ApprovalRequest>();
  readonly #resolutionSignatures = new Map<string, string>();
  readonly #executions = new Map<string, ControlFlowResult>();

  constructor(
    authoredPolicy: AuthoredPolicy,
    private readonly dependencies: ControlFlowDependencies,
  ) {
    this.policy = compilePolicy(authoredPolicy);
    this.approvals = new InMemoryApprovalStore({
      now: dependencies.now,
      nextId: () => dependencies.nextId("approval"),
    });
    this.audit = new InMemoryAuditLedger({
      now: dependencies.now,
      nextId: () => dependencies.nextId("audit"),
    });
  }

  start(correlationId: string, input: ProposedAgentAction): ControlFlowResult {
    const parsedAction = Object.freeze(proposedAgentActionSchema.parse(input));
    const action = classifySupportContext(parsedAction);
    const flowKey = `${correlationId}:${fingerprintAction(action)}`;
    const existing = this.#starts.get(flowKey);
    if (existing) return existing;

    this.#recordCompilation(correlationId);
    if (action.supportContext) {
      this.audit.append({
        type: "ACTION_CLASSIFIED",
        correlationId,
        actionId: action.id,
        policyId: this.policy.id,
        categories: [...action.sensitiveData],
      });
    }
    const result = this.#process(correlationId, flowKey, action);
    this.#starts.set(flowKey, result);
    return result;
  }

  resolveApproval(
    approvalId: string,
    resolution: "APPROVED" | "REJECTED",
    actorId: string,
    note: string,
  ): ApprovalRequest {
    const pending = this.#pending.get(approvalId);
    if (!pending)
      throw new Error(`Unknown orchestration approval: ${approvalId}`);
    const signature = `${resolution}:${actorId}:${note}`;
    const priorSignature = this.#resolutionSignatures.get(approvalId);
    const current = this.approvals.get(approvalId)!;

    if (priorSignature) {
      if (priorSignature === signature) return current;
      throw new Error(
        `Approval ${approvalId} already has a different resolution`,
      );
    }

    const resolved =
      resolution === "APPROVED"
        ? this.approvals.approve(approvalId, actorId, note)
        : this.approvals.reject(approvalId, actorId, note);
    this.#resolutionSignatures.set(approvalId, signature);
    this.#recordApprovalResolution(pending, resolved);
    return resolved;
  }

  continueApproved(
    approvalId: string,
    proposedAction: ProposedAgentAction,
  ): ControlFlowResult {
    const pending = this.#pending.get(approvalId);
    if (!pending)
      throw new Error(`Unknown orchestration approval: ${approvalId}`);
    const action = proposedAgentActionSchema.parse(proposedAction);
    const fingerprint = fingerprintAction(action);

    if (
      fingerprint !== pending.actionFingerprint ||
      pending.policyId !== this.policy.id ||
      pending.policyVersion !== this.policy.sourcePolicyVersion
    ) {
      throw new Error(
        "Approval does not match the exact action and policy version",
      );
    }

    const executed = this.#executions.get(pending.flowKey);
    if (executed) return executed;

    let approval = this.approvals.get(approvalId)!;
    if (
      approval.status === "PENDING" &&
      this.dependencies.now().getTime() >=
        new Date(approval.expiresAt).getTime()
    ) {
      approval = this.approvals.expire(approvalId);
      this.#resolutionSignatures.set(
        approvalId,
        "EXPIRED:SYSTEM:Approval window expired",
      );
      this.#recordApprovalResolution(pending, approval);
    }
    if (approval.status === "REJECTED")
      throw new Error("Approval was rejected");
    if (approval.status === "EXPIRED") throw new Error("Approval has expired");
    if (approval.status !== "APPROVED")
      throw new Error("Approval is still pending");

    return this.#execute(
      pending.correlationId,
      pending.flowKey,
      pending.action,
      pending.decision,
      approval,
    );
  }

  runSupportWorkflow(
    correlationId: string,
    ticketRead: ProposedAgentAction,
    followUp: ProposedAgentAction,
  ): readonly [ControlFlowResult, ControlFlowResult] {
    const ticketResult = this.start(correlationId, ticketRead);
    if (ticketResult.status !== "EXECUTED") {
      throw new Error(
        "Synthetic ticket read must complete before follow-up evaluation",
      );
    }
    return Object.freeze([ticketResult, this.start(correlationId, followUp)]);
  }

  #process(
    correlationId: string,
    flowKey: string,
    initialAction: ProposedAgentAction,
  ): ControlFlowResult {
    let action = initialAction;

    for (let transformations = 0; transformations <= 2; transformations += 1) {
      const decision = this.#evaluate(correlationId, action);

      if (decision.decision === "BLOCK") {
        return Object.freeze({ status: "BLOCKED", action, decision });
      }

      if (decision.decision === "REDACT_AND_ALLOW") {
        const transformed = redactAction(action, decision.redactions);
        if (transformed.categories.length === 0) {
          throw new Error(
            "Redaction loop prevented: no classified values were removed",
          );
        }
        this.audit.append({
          type: "ACTION_REDACTED",
          correlationId,
          actionId: action.id,
          policyId: this.policy.id,
          categories: [...transformed.categories],
        });
        action = transformed.action;
        continue;
      }

      if (decision.decision === "ROUTE_PRIVATELY") {
        action = routeActionPrivately(action);
        this.audit.append({
          type: "ACTION_ROUTED_PRIVATELY",
          correlationId,
          actionId: action.id,
          policyId: this.policy.id,
          fromZone: "STANDARD",
          toZone: "PRIVATE",
        });
        continue;
      }

      if (decision.decision === "REQUIRE_APPROVAL") {
        return this.#createApproval(correlationId, flowKey, action, decision);
      }

      return this.#execute(correlationId, flowKey, action, decision);
    }

    throw new Error("Transformation limit exceeded");
  }

  #evaluate(
    correlationId: string,
    action: ProposedAgentAction,
  ): EnforcementDecision {
    const key = `${correlationId}:${fingerprintAction(action)}`;
    const existing = this.#evaluations.get(key);
    if (existing) return existing;

    const decision = evaluateAction(this.policy, action);
    this.#evaluations.set(key, decision);
    this.audit.append({
      type: "ACTION_EVALUATED",
      correlationId,
      actionId: action.id,
      policyId: this.policy.id,
      decision: decision.decision,
      matchedRuleId: decision.matchedRuleId,
    });
    return decision;
  }

  #createApproval(
    correlationId: string,
    flowKey: string,
    action: ProposedAgentAction,
    decision: EnforcementDecision,
  ): ControlFlowResult {
    const existing = this.#approvalByFlow.get(flowKey);
    const fingerprint = fingerprintAction(action);
    const approval =
      existing ??
      this.approvals.create(
        decision,
        new Date(
          this.dependencies.now().getTime() +
            (this.dependencies.approvalTtlMs ?? 60 * 60 * 1_000),
        ),
        {
          actionFingerprint: fingerprint,
          policyVersion: this.policy.sourcePolicyVersion,
        },
      );

    if (!existing) {
      this.#approvalByFlow.set(flowKey, approval);
      this.#pending.set(approval.id, {
        correlationId,
        flowKey,
        action,
        actionFingerprint: fingerprint,
        decision,
        policyId: this.policy.id,
        policyVersion: this.policy.sourcePolicyVersion,
      });
      this.audit.append({
        type: "APPROVAL_CREATED",
        correlationId,
        approvalId: approval.id,
        actionId: action.id,
        policyId: this.policy.id,
      });
    }

    return Object.freeze({
      status: "PENDING_APPROVAL",
      action,
      decision,
      approval,
    });
  }

  #execute(
    correlationId: string,
    flowKey: string,
    action: ProposedAgentAction,
    decision: EnforcementDecision,
    approval?: ApprovalRequest,
  ): ControlFlowResult {
    const existing = this.#executions.get(flowKey);
    if (existing) return existing;

    const authorization = { decision, approval };
    let result: SimulatedToolResult;
    switch (action.kind) {
      case "READ_SUPPORT_TICKET":
        result = readSupportTicket(action, authorization);
        break;
      case "ISSUE_REFUND":
        result = issueSimulatedRefund(action, authorization);
        break;
      case "SEND_EMAIL":
        result = sendSimulatedEmail(action, authorization);
        break;
      case "DELETE_AUDIT_LOG":
        throw new Error("Blocked tool cannot be executed");
    }

    const outcome = Object.freeze({
      status: "EXECUTED" as const,
      action,
      decision,
      result,
    });
    this.#executions.set(flowKey, outcome);
    this.audit.append({
      type: "SIMULATED_EXECUTION",
      correlationId,
      actionId: action.id,
      policyId: this.policy.id,
      approvalId: approval?.id ?? null,
      tool: result.tool,
      outcome: result.outcome,
    });
    return outcome;
  }

  #recordCompilation(correlationId: string): void {
    if (this.#compiledCorrelations.has(correlationId)) return;
    this.#compiledCorrelations.add(correlationId);
    this.audit.append({
      type: "POLICY_COMPILED",
      correlationId,
      policyId: this.policy.id,
      sourcePolicyId: this.policy.sourcePolicyId,
      ruleCount: this.policy.rules.length,
    });
  }

  #recordApprovalResolution(
    pending: PendingFlow,
    approval: ApprovalRequest,
  ): void {
    if (approval.status === "PENDING") return;
    this.audit.append({
      type: "APPROVAL_RESOLVED",
      correlationId: pending.correlationId,
      approvalId: approval.id,
      actionId: pending.action.id,
      policyId: pending.policyId,
      status: approval.status,
      resolvedBy: approval.resolvedBy ?? "SYSTEM",
    });
  }
}
