import type {
  ApprovalRequest,
  ApprovalStatus,
} from "@/domain/approvals/schemas";
import { approvalRequestSchema } from "@/domain/approvals/schemas";
import type { EnforcementDecision } from "@/domain/enforcement/schemas";
import { enforcementDecisionSchema } from "@/domain/enforcement/schemas";

export interface ApprovalStoreDependencies {
  readonly now: () => Date;
  readonly nextId: () => string;
}

export interface ApprovalBinding {
  readonly actionFingerprint: string;
  readonly policyVersion: string;
}

function immutableApproval(value: unknown): ApprovalRequest {
  return Object.freeze(approvalRequestSchema.parse(value));
}

export class InMemoryApprovalStore {
  readonly #requests = new Map<string, ApprovalRequest>();
  readonly #requestsByBinding = new Map<string, string>();

  constructor(private readonly dependencies: ApprovalStoreDependencies) {}

  create(
    decisionInput: EnforcementDecision,
    expiresAt: Date,
    binding: ApprovalBinding,
  ): ApprovalRequest {
    const decision = enforcementDecisionSchema.parse(decisionInput);
    if (
      decision.decision !== "REQUIRE_APPROVAL" ||
      decision.authorizedForExecution
    ) {
      throw new Error(
        "Only non-authorizing REQUIRE_APPROVAL decisions create approvals",
      );
    }

    const bindingKey = `${decision.policyId}:${decision.actionId}:${binding.actionFingerprint}`;
    const existingId = this.#requestsByBinding.get(bindingKey);
    if (existingId) return this.#requests.get(existingId)!;

    const now = this.dependencies.now();
    if (expiresAt.getTime() <= now.getTime()) {
      throw new Error("Approval expiry must be in the future");
    }

    const approval = immutableApproval({
      id: this.dependencies.nextId(),
      actionId: decision.actionId,
      actionFingerprint: binding.actionFingerprint,
      policyId: decision.policyId,
      policyVersion: binding.policyVersion,
      reason: decision.reason,
      status: "PENDING",
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: null,
    });
    this.#requests.set(approval.id, approval);
    this.#requestsByBinding.set(bindingKey, approval.id);
    return approval;
  }

  get(id: string): ApprovalRequest | undefined {
    return this.#requests.get(id);
  }

  list(): readonly ApprovalRequest[] {
    return Object.freeze([...this.#requests.values()]);
  }

  approve(id: string, actorId: string, note: string): ApprovalRequest {
    return this.resolve(id, "APPROVED", actorId, note);
  }

  reject(id: string, actorId: string, note: string): ApprovalRequest {
    return this.resolve(id, "REJECTED", actorId, note);
  }

  expire(id: string): ApprovalRequest {
    return this.resolve(id, "EXPIRED", "SYSTEM", "Approval window expired");
  }

  private resolve(
    id: string,
    status: Exclude<ApprovalStatus, "PENDING">,
    actorId: string,
    note: string,
  ): ApprovalRequest {
    const current = this.#requests.get(id);
    if (!current) throw new Error(`Unknown approval: ${id}`);
    if (current.status !== "PENDING") {
      throw new Error(`Approval ${id} is already ${current.status}`);
    }

    const resolved = immutableApproval({
      ...current,
      status,
      resolvedAt: this.dependencies.now().toISOString(),
      resolvedBy: actorId,
      resolutionNote: note,
    });
    this.#requests.set(id, resolved);
    return resolved;
  }
}
