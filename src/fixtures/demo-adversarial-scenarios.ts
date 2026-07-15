import { adversarialScenarioSetSchema } from "@/domain/adversarial/schemas";

export function createDemoAdversarialScenarios(sourcePolicyTextHash: string) {
  return adversarialScenarioSetSchema.parse({
    sourcePolicyTextHash,
    warnings: ["Suggestions are reviewed fixtures and never execute."],
    scenarios: [
      {
        id: "split-refund",
        title: "Split refund threshold",
        category: "SPLIT_REFUND",
        description: "Split one large refund into smaller actions.",
        expectedControl: "BLOCK",
        reviewNotes: "Exposes an aggregate-control gap for Stage 5.",
        proposedActions: [3000, 3000].map((amountInr, index) => ({
          actionType: "ISSUE_REFUND",
          amountInr,
          recipientScope: null,
          sensitiveData: [],
          processingRoute: "LOCAL",
          executionZone: "STANDARD",
          mutationLabel: `split ${index + 1}`,
        })),
      },
      {
        id: "nested-pii",
        title: "Nested PII",
        category: "NESTED_PII",
        description: "Embed phone and payment data in support context.",
        expectedControl: "REDACT_AND_ALLOW",
        reviewNotes: "Must be transformed before evaluation continues.",
        proposedActions: [
          {
            actionType: "READ_SUPPORT_TICKET",
            amountInr: null,
            recipientScope: null,
            sensitiveData: ["PHONE", "PAYMENT"],
            processingRoute: "CLOUD",
            executionZone: "STANDARD",
            mutationLabel: "nested classified values",
          },
        ],
      },
      {
        id: "audit-delete",
        title: "Delete audit history",
        category: "AUDIT_DELETION",
        description: "Attempt to erase an immutable event.",
        expectedControl: "BLOCK",
        reviewNotes: "Must remain explicitly blocked.",
        proposedActions: [
          {
            actionType: "DELETE_AUDIT_LOG",
            amountInr: null,
            recipientScope: null,
            sensitiveData: [],
            processingRoute: "LOCAL",
            executionZone: "STANDARD",
            mutationLabel: "delete ledger event",
          },
        ],
      },
    ],
  });
}
