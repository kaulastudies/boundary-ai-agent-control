import type {
  AuthoredPolicy,
  CompiledPolicy,
  SensitiveDataKind,
} from "@/domain/policy/schemas";
import { authoredPolicySchema, type ActionKind } from "@/domain/policy/schemas";
import {
  humanConfirmationSchema,
  type HumanConfirmation,
} from "@/domain/confirmation/schemas";
import {
  unconfirmedPolicyInterpretationSchema,
  type UnconfirmedPolicyInterpretation,
} from "@/domain/interpretation/schemas";
import { compilePolicy } from "@/application/policy-compiler/compile-policy";

export interface ConfirmedPolicyResult {
  readonly status: "CONFIRMED";
  readonly reviewedBy: string;
  readonly sourcePolicyTextHash: string;
  readonly authoredPolicy: AuthoredPolicy;
  readonly compiledPolicy: CompiledPolicy;
}

export function confirmPolicyInterpretation(
  draftInput: UnconfirmedPolicyInterpretation,
  confirmationInput: HumanConfirmation,
): ConfirmedPolicyResult {
  const draft = unconfirmedPolicyInterpretationSchema.parse(draftInput);
  const confirmation = humanConfirmationSchema.parse(confirmationInput);
  const rules = draft.interpretation.proposedRules;
  const refundThresholds = rules
    .filter(
      (rule) =>
        rule.actionType === "ISSUE_REFUND" &&
        rule.outcome === "REQUIRE_APPROVAL" &&
        rule.approvalThresholdInr !== null,
    )
    .map((rule) => rule.approvalThresholdInr as number);
  const redactBeforeCloud = unique(
    rules
      .filter((rule) => rule.outcome === "REDACT_AND_ALLOW")
      .flatMap((rule) => rule.redactionCategories),
  );
  const routePrivately = unique(
    rules
      .filter(
        (rule) =>
          rule.outcome === "ROUTE_PRIVATELY" ||
          rule.executionZone === "PRIVATE",
      )
      .flatMap((rule) => rule.redactionCategories),
  );
  const prohibitedActions = unique(
    rules
      .filter((rule) => rule.outcome === "BLOCK")
      .map((rule) => rule.actionType),
  );

  const authoredPolicy = authoredPolicySchema.parse({
    id: confirmation.policyId,
    version: confirmation.version,
    name: confirmation.policyName,
    authority: "HUMAN",
    sourcePolicyTextHash: draft.interpretation.sourcePolicyTextHash,
    confirmedBy: confirmation.reviewerId,
    refundApprovalThresholdInr:
      refundThresholds.length > 0 ? Math.min(...refundThresholds) : 0,
    redactBeforeCloud,
    routePrivately,
    outboundCommunicationRequiresApproval: rules.some(
      (rule) =>
        rule.actionType === "SEND_EMAIL" && rule.outcome === "REQUIRE_APPROVAL",
    ),
    prohibitedActions,
  });

  return Object.freeze({
    status: "CONFIRMED",
    reviewedBy: confirmation.reviewerId,
    sourcePolicyTextHash: draft.interpretation.sourcePolicyTextHash,
    authoredPolicy,
    compiledPolicy: compilePolicy(authoredPolicy),
  });
}

function unique<T extends ActionKind | SensitiveDataKind>(
  values: readonly T[],
): T[] {
  return [...new Set(values)];
}
