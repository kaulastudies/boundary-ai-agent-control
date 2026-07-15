import type { CompiledPolicy, NormalizedRule } from "@/domain/policy/schemas";
import {
  compiledPolicySchema,
  normalizedRuleSchema,
} from "@/domain/policy/schemas";
import type {
  EnforcementDecision,
  ProposedAgentAction,
} from "@/domain/enforcement/schemas";
import {
  enforcementDecisionSchema,
  proposedAgentActionSchema,
} from "@/domain/enforcement/schemas";

const decisionPrecedence = {
  BLOCK: 5,
  REQUIRE_APPROVAL: 4,
  ROUTE_PRIVATELY: 3,
  REDACT_AND_ALLOW: 2,
  ALLOW: 1,
} as const;

function matchesRule(
  action: ProposedAgentAction,
  rule: NormalizedRule,
): boolean {
  const match = rule.match;

  if (match.actionKinds && !match.actionKinds.includes(action.kind))
    return false;
  if (
    match.sensitiveData &&
    !match.sensitiveData.some((kind) => action.sensitiveData.includes(kind))
  ) {
    return false;
  }
  if (
    match.processingRoutes &&
    !match.processingRoutes.includes(action.processingRoute)
  ) {
    return false;
  }
  if (
    match.recipientScopes &&
    (action.kind !== "SEND_EMAIL" ||
      !match.recipientScopes.includes(action.recipientScope))
  ) {
    return false;
  }
  if (
    match.amountInrAtMost !== undefined &&
    (action.kind !== "ISSUE_REFUND" || action.amountInr > match.amountInrAtMost)
  ) {
    return false;
  }
  if (
    match.amountInrGreaterThan !== undefined &&
    (action.kind !== "ISSUE_REFUND" ||
      action.amountInr <= match.amountInrGreaterThan)
  ) {
    return false;
  }

  return true;
}

export function evaluateAction(
  untrustedPolicy: CompiledPolicy,
  untrustedAction: ProposedAgentAction,
): EnforcementDecision {
  const policy = compiledPolicySchema.parse(untrustedPolicy);
  const action = proposedAgentActionSchema.parse(untrustedAction);
  const matchedRule = policy.rules
    .map((rule) => normalizedRuleSchema.parse(rule))
    .filter((rule) => matchesRule(action, rule))
    .sort(
      (left, right) =>
        decisionPrecedence[right.decision] -
          decisionPrecedence[left.decision] ||
        right.priority - left.priority ||
        left.id.localeCompare(right.id),
    )[0];

  const decision = matchedRule?.decision ?? policy.defaultDecision;
  const result = enforcementDecisionSchema.parse({
    actionId: action.id,
    policyId: policy.id,
    decision,
    reason:
      matchedRule?.description ??
      "No rule matched; deterministic default deny applied",
    matchedRuleId: matchedRule?.id ?? null,
    redactions:
      decision === "REDACT_AND_ALLOW" ? (matchedRule?.redact ?? []) : [],
    authorizedForExecution:
      decision === "ALLOW" || decision === "REDACT_AND_ALLOW",
  });

  return Object.freeze({
    ...result,
    redactions: Object.freeze([...result.redactions]),
  });
}
