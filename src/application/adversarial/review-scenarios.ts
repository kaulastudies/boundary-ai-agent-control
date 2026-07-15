import type {
  AdversarialFixtureOutcome,
  AdversarialReviewInput,
  AdversarialScenarioSet,
} from "@/domain/adversarial/schemas";
import {
  adversarialReviewInputSchema,
  adversarialScenarioSetSchema,
} from "@/domain/adversarial/schemas";
import type {
  EnforcementDecision,
  ProposedAgentAction,
} from "@/domain/enforcement/schemas";
import { proposedAgentActionSchema } from "@/domain/enforcement/schemas";
import type { CompiledPolicy } from "@/domain/policy/schemas";
import { evaluateAction } from "@/domain/enforcement/evaluate-action";

export interface ReviewedAdversarialFixture {
  readonly scenarioId: string;
  readonly action: ProposedAgentAction;
  readonly decision: EnforcementDecision;
  readonly outcome: AdversarialFixtureOutcome;
}

export interface AdversarialReviewReport {
  readonly reviewedBy: string;
  readonly fixtures: readonly ReviewedAdversarialFixture[];
  readonly escapedScenarioIds: readonly string[];
}

export function reviewAdversarialScenarios(
  scenarioInput: AdversarialScenarioSet,
  reviewInput: AdversarialReviewInput,
  policy: CompiledPolicy,
): AdversarialReviewReport {
  const scenarioSet = adversarialScenarioSetSchema.parse(scenarioInput);
  const review = adversarialReviewInputSchema.parse(reviewInput);
  const accepted = new Set(review.acceptedScenarioIds);
  const fixtures: ReviewedAdversarialFixture[] = [];

  for (const scenario of scenarioSet.scenarios) {
    if (!accepted.has(scenario.id)) continue;
    scenario.proposedActions.forEach((draft, index) => {
      const action = normalizeAction(scenario.id, index, draft);
      const decision = evaluateAction(policy, action);
      fixtures.push(
        Object.freeze({
          scenarioId: scenario.id,
          action,
          decision,
          outcome: classifyOutcome(decision),
        }),
      );
    });
  }

  const escapedScenarioIds = unique(
    fixtures
      .filter((fixture) => fixture.outcome === "ESCAPED")
      .map((fixture) => fixture.scenarioId),
  );
  return Object.freeze({
    reviewedBy: review.reviewedBy,
    fixtures: Object.freeze(fixtures),
    escapedScenarioIds: Object.freeze(escapedScenarioIds),
  });
}

function normalizeAction(
  scenarioId: string,
  index: number,
  draft: AdversarialScenarioSet["scenarios"][number]["proposedActions"][number],
): ProposedAgentAction {
  const common = {
    id: `adversarial:${scenarioId}:${index}`,
    actorId: "reviewed-adversarial-fixture",
    risk: "RISKY" as const,
    sensitiveData: draft.sensitiveData,
    processingRoute: draft.processingRoute,
    executionZone: draft.executionZone,
    routingHistory: [],
    supportContext:
      draft.sensitiveData.length > 0
        ? {
            summary: `Synthetic adversarial fixture: ${draft.mutationLabel}`,
            ...(draft.sensitiveData.includes("PHONE")
              ? { phone: "SYNTHETIC-PHONE" }
              : {}),
            ...(draft.sensitiveData.includes("PAYMENT")
              ? { paymentReference: "SYNTHETIC-PAYMENT" }
              : {}),
          }
        : undefined,
  };

  switch (draft.actionType) {
    case "READ_SUPPORT_TICKET":
      return proposedAgentActionSchema.parse({
        ...common,
        kind: draft.actionType,
        ticketId: `SYNTHETIC-${scenarioId}`,
      });
    case "ISSUE_REFUND":
      return proposedAgentActionSchema.parse({
        ...common,
        kind: draft.actionType,
        ticketId: `SYNTHETIC-${scenarioId}`,
        amountInr: draft.amountInr ?? 1,
      });
    case "SEND_EMAIL":
      return proposedAgentActionSchema.parse({
        ...common,
        kind: draft.actionType,
        ticketId: `SYNTHETIC-${scenarioId}`,
        recipient: "synthetic-recipient@example.test",
        recipientScope: draft.recipientScope ?? "EXTERNAL",
        body: "Synthetic adversarial email fixture",
      });
    case "DELETE_AUDIT_LOG":
      return proposedAgentActionSchema.parse({
        ...common,
        kind: draft.actionType,
        targetEventId: "SYNTHETIC-AUDIT-EVENT",
      });
  }
}

function classifyOutcome(
  decision: EnforcementDecision,
): AdversarialFixtureOutcome {
  switch (decision.decision) {
    case "BLOCK":
      return "BLOCKED";
    case "REQUIRE_APPROVAL":
      return "APPROVAL_REQUIRED";
    case "REDACT_AND_ALLOW":
    case "ROUTE_PRIVATELY":
      return "SAFELY_TRANSFORMED";
    case "ALLOW":
      return "ESCAPED";
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
