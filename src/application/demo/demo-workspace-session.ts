import type { AdversarialReviewReport } from "@/application/adversarial/review-scenarios";
import { reviewAdversarialScenarios } from "@/application/adversarial/review-scenarios";
import { confirmPolicyInterpretation } from "@/application/confirmation/confirm-policy-interpretation";
import {
  BoundaryControlFlow,
  type ControlFlowResult,
} from "@/application/control-flow/boundary-control-flow";
import type { ApprovalRequest } from "@/domain/approvals/schemas";
import type { AuditEvent } from "@/domain/audit/schemas";
import type { ProposedAgentAction } from "@/domain/enforcement/schemas";
import type { UnconfirmedPolicyInterpretation } from "@/domain/interpretation/schemas";
import { unconfirmedPolicyInterpretationSchema } from "@/domain/interpretation/schemas";
import type { CompiledPolicy } from "@/domain/policy/schemas";
import { createDemoAdversarialScenarios } from "@/fixtures/demo-adversarial-scenarios";
import { createDemoPolicyInterpretation } from "@/fixtures/demo-policy-interpretation";

export type DemoPreset =
  | "SAFE_REFUND"
  | "LARGE_REFUND"
  | "PII_CLOUD"
  | "PRIVATE_TRANSCRIPT"
  | "EXTERNAL_EMAIL"
  | "BLOCKED_DELETE";

export interface WorkspaceSnapshot {
  readonly draft: UnconfirmedPolicyInterpretation | null;
  readonly compiledPolicy: CompiledPolicy | null;
  readonly reviewedBy: string | null;
  readonly lastResult: ControlFlowResult | null;
  readonly approvals: readonly ApprovalRequest[];
  readonly audit: readonly AuditEvent[];
  readonly adversarialReport: AdversarialReviewReport | null;
}

export class DemoWorkspaceSession {
  #draft: UnconfirmedPolicyInterpretation | null = null;
  #flow: BoundaryControlFlow | null = null;
  #reviewedBy: string | null = null;
  #lastResult: ControlFlowResult | null = null;
  #adversarialReport: AdversarialReviewReport | null = null;
  #pendingActions = new Map<string, ProposedAgentAction>();
  #sequence = 0;

  constructor(private readonly now: () => Date = () => new Date()) {}

  interpretDemo(policyText: string): WorkspaceSnapshot {
    this.#draft = createDemoPolicyInterpretation(policyText);
    this.#flow = null;
    this.#lastResult = null;
    this.#adversarialReport = null;
    this.#pendingActions.clear();
    return this.snapshot();
  }

  setLiveDraft(input: unknown): WorkspaceSnapshot {
    this.#draft = unconfirmedPolicyInterpretationSchema.parse(input);
    this.#flow = null;
    this.#lastResult = null;
    this.#adversarialReport = null;
    this.#pendingActions.clear();
    return this.snapshot();
  }

  confirm(reviewerId: string): WorkspaceSnapshot {
    if (!this.#draft)
      throw new Error("Interpret the policy before confirmation");
    const confirmed = confirmPolicyInterpretation(this.#draft, {
      confirmed: true,
      reviewerId,
      version: "1.0.0",
      policyId: "boundary-demo-policy",
      policyName: "BOUNDARY support controls",
    });
    this.#reviewedBy = reviewerId;
    this.#flow = new BoundaryControlFlow(confirmed.authoredPolicy, {
      now: this.now,
      nextId: (kind) => `demo-${kind}-${++this.#sequence}`,
      approvalTtlMs: 60_000,
    });
    return this.snapshot();
  }

  submit(
    preset: DemoPreset,
    amountInr?: number,
    recipient?: string,
  ): WorkspaceSnapshot {
    if (!this.#flow)
      throw new Error("Human confirmation is required before evaluation");
    const action = createPresetAction(
      preset,
      ++this.#sequence,
      amountInr,
      recipient,
    );
    const result = this.#flow.start(
      `demo-correlation-${this.#sequence}`,
      action,
    );
    this.#lastResult = result;
    if (result.status === "PENDING_APPROVAL")
      this.#pendingActions.set(result.approval.id, result.action);
    return this.snapshot();
  }

  resolve(
    approvalId: string,
    resolution: "APPROVED" | "REJECTED",
  ): WorkspaceSnapshot {
    if (!this.#flow) throw new Error("No active confirmed policy");
    this.#flow.resolveApproval(
      approvalId,
      resolution,
      this.#reviewedBy ?? "demo-reviewer",
      "Judge workspace decision",
    );
    return this.snapshot();
  }

  expire(approvalId: string): WorkspaceSnapshot {
    if (!this.#flow) throw new Error("No active confirmed policy");
    this.#flow.approvals.expire(approvalId);
    return this.snapshot();
  }

  continue(approvalId: string): WorkspaceSnapshot {
    if (!this.#flow) throw new Error("No active confirmed policy");
    const action = this.#pendingActions.get(approvalId);
    if (!action) throw new Error("Exact approved action is unavailable");
    this.#lastResult = this.#flow.continueApproved(approvalId, action);
    return this.snapshot();
  }

  runAdversarial(): WorkspaceSnapshot {
    if (!this.#flow || !this.#draft)
      throw new Error("Confirm a policy before adversarial review");
    const scenarios = createDemoAdversarialScenarios(
      this.#draft.interpretation.sourcePolicyTextHash,
    );
    this.#adversarialReport = reviewAdversarialScenarios(
      scenarios,
      {
        reviewedBy: this.#reviewedBy ?? "demo-reviewer",
        acceptedScenarioIds: scenarios.scenarios.map((scenario) => scenario.id),
      },
      this.#flow.policy,
    );
    return this.snapshot();
  }

  snapshot(): WorkspaceSnapshot {
    return Object.freeze({
      draft: this.#draft,
      compiledPolicy: this.#flow?.policy ?? null,
      reviewedBy: this.#reviewedBy,
      lastResult: this.#lastResult,
      approvals: this.#flow?.approvals.list() ?? [],
      audit: this.#flow?.audit.all() ?? [],
      adversarialReport: this.#adversarialReport,
    });
  }
}

function base(id: string) {
  return {
    id,
    actorId: "synthetic-support-agent",
    risk: "RISKY" as const,
    sensitiveData: [] as ("PHONE" | "PAYMENT" | "SUPPORT_TRANSCRIPT")[],
    processingRoute: "LOCAL" as const,
    executionZone: "STANDARD" as const,
    routingHistory: [],
  };
}

function createPresetAction(
  preset: DemoPreset,
  sequence: number,
  amountInr?: number,
  recipient?: string,
): ProposedAgentAction {
  const id = `demo-action-${sequence}`;
  switch (preset) {
    case "SAFE_REFUND":
      return {
        ...base(id),
        kind: "ISSUE_REFUND",
        ticketId: "TICKET-1042",
        amountInr: amountInr ?? 2500,
      };
    case "LARGE_REFUND":
      return {
        ...base(id),
        kind: "ISSUE_REFUND",
        ticketId: "TICKET-1042",
        amountInr: amountInr ?? 7500,
      };
    case "PII_CLOUD":
      return {
        ...base(id),
        kind: "READ_SUPPORT_TICKET",
        ticketId: "TICKET-1042",
        processingRoute: "CLOUD",
        sensitiveData: ["PHONE", "PAYMENT"],
        supportContext: {
          summary: "Customer reports a duplicate charge.",
          phone: "SYNTHETIC-PHONE",
          paymentReference: "SYNTHETIC-PAYMENT",
        },
      };
    case "PRIVATE_TRANSCRIPT":
      return {
        ...base(id),
        kind: "READ_SUPPORT_TICKET",
        ticketId: "TICKET-1042",
        processingRoute: "CLOUD",
        sensitiveData: ["SUPPORT_TRANSCRIPT"],
        supportContext: {
          summary: "Synthetic full transcript requires private handling.",
        },
      };
    case "EXTERNAL_EMAIL":
      return {
        ...base(id),
        kind: "SEND_EMAIL",
        ticketId: "TICKET-1042",
        recipient: recipient ?? "customer@example.test",
        recipientScope: "EXTERNAL",
        body: "Synthetic resolution update.",
      };
    case "BLOCKED_DELETE":
      return {
        ...base(id),
        kind: "DELETE_AUDIT_LOG",
        targetEventId: "demo-audit-1",
      };
  }
}
