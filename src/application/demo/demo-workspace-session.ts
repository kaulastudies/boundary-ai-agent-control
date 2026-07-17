import { z } from "zod";
import type { AdversarialReviewReport } from "@/application/adversarial/review-scenarios";
import { reviewAdversarialScenarios } from "@/application/adversarial/review-scenarios";
import { confirmPolicyInterpretation } from "@/application/confirmation/confirm-policy-interpretation";
import {
  BoundaryControlFlow,
  type ControlFlowResult,
} from "@/application/control-flow/boundary-control-flow";
import {
  approvalRequestSchema,
  type ApprovalRequest,
} from "@/domain/approvals/schemas";
import { auditEventSchema, type AuditEvent } from "@/domain/audit/schemas";
import {
  proposedAgentActionSchema,
  type ProposedAgentAction,
} from "@/domain/enforcement/schemas";
import type { UnconfirmedPolicyInterpretation } from "@/domain/interpretation/schemas";
import { unconfirmedPolicyInterpretationSchema } from "@/domain/interpretation/schemas";
import {
  compiledPolicySchema,
  type CompiledPolicy,
} from "@/domain/policy/schemas";
import { createDemoAdversarialScenarios } from "@/fixtures/demo-adversarial-scenarios";
import { createDemoPolicyInterpretation } from "@/fixtures/demo-policy-interpretation";

export type DemoPreset =
  | "SAFE_REFUND"
  | "LARGE_REFUND"
  | "PII_CLOUD"
  | "PRIVATE_TRANSCRIPT"
  | "EXTERNAL_EMAIL"
  | "BLOCKED_DELETE";

const operationSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("SUBMIT"),
      at: z.string().datetime(),
      preset: z.enum([
        "SAFE_REFUND",
        "LARGE_REFUND",
        "PII_CLOUD",
        "PRIVATE_TRANSCRIPT",
        "EXTERNAL_EMAIL",
        "BLOCKED_DELETE",
      ]),
    })
    .strict(),
  z
    .object({
      type: z.literal("RESOLVE"),
      at: z.string().datetime(),
      approvalId: z.string().min(1),
      resolution: z.enum(["APPROVED", "REJECTED"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("EXPIRE"),
      at: z.string().datetime(),
      approvalId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("CONTINUE"),
      at: z.string().datetime(),
      approvalId: z.string().min(1),
    })
    .strict(),
  z
    .object({ type: z.literal("RUN_ADVERSARIAL"), at: z.string().datetime() })
    .strict(),
]);

export const persistedDemoSessionSchema = z
  .object({
    version: z.literal(1),
    compiledPolicy: compiledPolicySchema.nullable(),
    reviewedBy: z.string().min(1).nullable(),
    operations: z.array(operationSchema).max(200),
    safeActions: z.array(proposedAgentActionSchema).max(100),
    approvals: z.array(approvalRequestSchema).max(100),
    audit: z.array(auditEventSchema).max(500),
  })
  .strict();

export type PersistedDemoSession = Readonly<
  z.infer<typeof persistedDemoSessionSchema>
>;
type DemoOperation = z.infer<typeof operationSchema>;

export interface WorkspaceSnapshot {
  readonly draft: UnconfirmedPolicyInterpretation | null;
  readonly compiledPolicy: CompiledPolicy | null;
  readonly reviewedBy: string | null;
  readonly lastResult: ControlFlowResult | null;
  readonly approvals: readonly ApprovalRequest[];
  readonly audit: readonly AuditEvent[];
  readonly adversarialReport: AdversarialReviewReport | null;
}

export function emptyPersistedDemoSession(): PersistedDemoSession {
  return Object.freeze({
    version: 1,
    compiledPolicy: null,
    reviewedBy: null,
    operations: [],
    safeActions: [],
    approvals: [],
    audit: [],
  });
}

export class DemoWorkspaceSession {
  #draft: UnconfirmedPolicyInterpretation | null = null;
  #flow: BoundaryControlFlow | null = null;
  #reviewedBy: string | null = null;
  #lastResult: ControlFlowResult | null = null;
  #adversarialReport: AdversarialReviewReport | null = null;
  #pendingActions = new Map<string, ProposedAgentAction>();
  #operations: DemoOperation[] = [];
  #safeActions: ProposedAgentAction[] = [];
  #sequence = 0;
  #clockOverride: Date | null = null;
  #restoring = false;

  constructor(private readonly clock: () => Date = () => new Date()) {}

  static restore(
    input: PersistedDemoSession,
    clock: () => Date = () => new Date(),
  ): DemoWorkspaceSession {
    const state = persistedDemoSessionSchema.parse(input);
    const session = new DemoWorkspaceSession(clock);
    if (!state.compiledPolicy) return session;
    session.#reviewedBy = state.reviewedBy;
    session.#createFlow(state.compiledPolicy);
    session.#restoring = true;
    try {
      for (const operation of state.operations) {
        session.#clockOverride = new Date(operation.at);
        switch (operation.type) {
          case "SUBMIT":
            session.submit(operation.preset);
            break;
          case "RESOLVE":
            session.resolve(operation.approvalId, operation.resolution);
            break;
          case "EXPIRE":
            session.expire(operation.approvalId);
            break;
          case "CONTINUE":
            session.continue(operation.approvalId);
            break;
          case "RUN_ADVERSARIAL":
            session.runAdversarial();
            break;
        }
      }
    } finally {
      session.#clockOverride = null;
      session.#restoring = false;
    }
    session.#operations = [...state.operations];
    return session;
  }

  interpretDemo(policyText: string): WorkspaceSnapshot {
    this.#draft = createDemoPolicyInterpretation(policyText);
    this.#clearActivePolicy();
    return this.snapshot();
  }

  setLiveDraft(input: unknown): WorkspaceSnapshot {
    this.#draft = unconfirmedPolicyInterpretationSchema.parse(input);
    this.#clearActivePolicy();
    return this.snapshot();
  }

  confirm(reviewerId: string, draftInput?: unknown): WorkspaceSnapshot {
    if (draftInput !== undefined)
      this.#draft = unconfirmedPolicyInterpretationSchema.parse(draftInput);
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
    this.#operations = [];
    this.#safeActions = [];
    this.#sequence = 0;
    this.#createFlow(confirmed.compiledPolicy);
    return this.snapshot();
  }

  submit(preset: DemoPreset): WorkspaceSnapshot {
    if (!this.#flow)
      throw new Error("Human confirmation is required before evaluation");
    const at = this.#now().toISOString();
    const action = createPresetAction(preset, ++this.#sequence);
    const result = this.#flow.start(
      `demo-correlation-${this.#sequence}`,
      action,
    );
    this.#lastResult = result;
    this.#safeActions.push(result.action);
    if (result.status === "PENDING_APPROVAL")
      this.#pendingActions.set(result.approval.id, result.action);
    this.#record({ type: "SUBMIT", at, preset });
    return this.snapshot();
  }

  resolve(
    approvalId: string,
    resolution: "APPROVED" | "REJECTED",
  ): WorkspaceSnapshot {
    if (!this.#flow) throw new Error("No active confirmed policy");
    const at = this.#now().toISOString();
    this.#flow.resolveApproval(
      approvalId,
      resolution,
      this.#reviewedBy ?? "demo-reviewer",
      "Judge workspace decision",
    );
    this.#record({ type: "RESOLVE", at, approvalId, resolution });
    return this.snapshot();
  }

  expire(approvalId: string): WorkspaceSnapshot {
    if (!this.#flow) throw new Error("No active confirmed policy");
    const at = this.#now().toISOString();
    this.#flow.approvals.expire(approvalId);
    this.#record({ type: "EXPIRE", at, approvalId });
    return this.snapshot();
  }

  continue(approvalId: string): WorkspaceSnapshot {
    if (!this.#flow) throw new Error("No active confirmed policy");
    const action = this.#pendingActions.get(approvalId);
    if (!action) throw new Error("Exact approved action is unavailable");
    const at = this.#now().toISOString();
    this.#lastResult = this.#flow.continueApproved(approvalId, action);
    this.#record({ type: "CONTINUE", at, approvalId });
    return this.snapshot();
  }

  runAdversarial(): WorkspaceSnapshot {
    if (!this.#flow)
      throw new Error("Confirm a policy before adversarial review");
    const hash = this.#flow.policy.sourcePolicyTextHash;
    if (!hash) throw new Error("Confirmed policy source hash is unavailable");
    const scenarios = createDemoAdversarialScenarios(hash);
    this.#adversarialReport = reviewAdversarialScenarios(
      scenarios,
      {
        reviewedBy: this.#reviewedBy ?? "demo-reviewer",
        acceptedScenarioIds: scenarios.scenarios.map((scenario) => scenario.id),
      },
      this.#flow.policy,
    );
    this.#record({ type: "RUN_ADVERSARIAL", at: this.#now().toISOString() });
    return this.snapshot();
  }

  exportState(): PersistedDemoSession {
    return persistedDemoSessionSchema.parse({
      version: 1,
      compiledPolicy: this.#flow?.policy ?? null,
      reviewedBy: this.#reviewedBy,
      operations: this.#operations,
      safeActions: this.#safeActions,
      approvals: this.#flow?.approvals.list() ?? [],
      audit: this.#flow?.audit.all() ?? [],
    });
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

  #createFlow(policy: CompiledPolicy): void {
    this.#flow = new BoundaryControlFlow(policy, {
      now: () => this.#now(),
      nextId: (kind) => `demo-${kind}-${++this.#sequence}`,
      approvalTtlMs: 60_000,
    });
  }

  #clearActivePolicy(): void {
    this.#flow = null;
    this.#reviewedBy = null;
    this.#lastResult = null;
    this.#adversarialReport = null;
    this.#pendingActions.clear();
    this.#operations = [];
    this.#safeActions = [];
    this.#sequence = 0;
  }

  #record(operation: DemoOperation): void {
    if (!this.#restoring) this.#operations.push(operation);
  }

  #now(): Date {
    return this.#clockOverride ?? this.clock();
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
): ProposedAgentAction {
  const id = `demo-action-${sequence}`;
  switch (preset) {
    case "SAFE_REFUND":
      return {
        ...base(id),
        kind: "ISSUE_REFUND",
        ticketId: "TICKET-1042",
        amountInr: 2500,
      };
    case "LARGE_REFUND":
      return {
        ...base(id),
        kind: "ISSUE_REFUND",
        ticketId: "TICKET-1042",
        amountInr: 7500,
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
        recipient: "customer@example.test",
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
