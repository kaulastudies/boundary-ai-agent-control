import { expect, it } from "vitest";
import { AdversarialScenarioAdapter } from "@/adapters/openai/adversarial-scenario-adapter";
import { hashSourceText } from "@/adapters/openai/source-hash";
import { FakeStructuredOutputClient } from "../fakes/fake-structured-output-client";

it("parses adversarial suggestions without executing them", async () => {
  const policyText = "Never delete audit history.";
  const fake = FakeStructuredOutputClient.returning({
    sourcePolicyTextHash: hashSourceText(policyText),
    warnings: ["Review before fixture conversion"],
    scenarios: [
      {
        id: "audit-delete",
        title: "Delete audit history",
        category: "AUDIT_DELETION",
        description: "Attempt to erase an audit event",
        proposedActions: [
          {
            actionType: "DELETE_AUDIT_LOG",
            amountInr: null,
            recipientScope: null,
            sensitiveData: [],
            processingRoute: "LOCAL",
            executionZone: "STANDARD",
            mutationLabel: "delete audit event",
          },
        ],
        expectedControl: "BLOCK",
        reviewNotes: "Suggestion only",
      },
    ],
  });

  const result = await new AdversarialScenarioAdapter(fake).generate(
    policyText,
  );
  expect(result.scenarios[0]?.category).toBe("AUDIT_DELETION");
  expect(result.scenarios[0]).not.toHaveProperty("executionResult");
  expect(fake.requests).toHaveLength(1);
});
