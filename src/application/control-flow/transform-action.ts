import type { SensitiveDataKind } from "@/domain/policy/schemas";
import type { ProposedAgentAction } from "@/domain/enforcement/schemas";
import { proposedAgentActionSchema } from "@/domain/enforcement/schemas";

export function classifySupportContext(
  input: ProposedAgentAction,
): ProposedAgentAction {
  const action = proposedAgentActionSchema.parse(input);
  const classifications = new Set(action.sensitiveData);
  if (action.supportContext?.phone !== undefined) classifications.add("PHONE");
  if (action.supportContext?.paymentReference !== undefined)
    classifications.add("PAYMENT");
  return Object.freeze(
    proposedAgentActionSchema.parse({
      ...action,
      sensitiveData: [...classifications],
    }),
  );
}
export interface RedactionResult {
  readonly action: ProposedAgentAction;
  readonly categories: readonly SensitiveDataKind[];
}

export function redactAction(
  input: ProposedAgentAction,
  requestedCategories: readonly SensitiveDataKind[],
): RedactionResult {
  const action = proposedAgentActionSchema.parse(input);
  const context = action.supportContext;
  const categories: SensitiveDataKind[] = [];

  if (requestedCategories.includes("PHONE") && context?.phone !== undefined)
    categories.push("PHONE");
  if (
    requestedCategories.includes("PAYMENT") &&
    context?.paymentReference !== undefined
  ) {
    categories.push("PAYMENT");
  }

  const transformedContext = context
    ? {
        summary: context.summary,
        ...(categories.includes("PHONE") ? {} : { phone: context.phone }),
        ...(categories.includes("PAYMENT")
          ? {}
          : { paymentReference: context.paymentReference }),
      }
    : undefined;

  const transformed = proposedAgentActionSchema.parse({
    ...action,
    sensitiveData: action.sensitiveData.filter(
      (kind) => !categories.includes(kind),
    ),
    supportContext: transformedContext,
  });

  return Object.freeze({
    action: Object.freeze(transformed),
    categories: Object.freeze(categories),
  });
}

export function routeActionPrivately(
  input: ProposedAgentAction,
): ProposedAgentAction {
  const action = proposedAgentActionSchema.parse(input);
  if (
    action.executionZone === "PRIVATE" ||
    action.routingHistory.includes("PRIVATE")
  ) {
    throw new Error("Private routing loop prevented");
  }

  return Object.freeze(
    proposedAgentActionSchema.parse({
      ...action,
      executionZone: "PRIVATE",
      processingRoute: "PRIVATE",
      routingHistory: [...action.routingHistory, "PRIVATE"],
    }),
  );
}
