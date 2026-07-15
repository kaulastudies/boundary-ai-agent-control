import { describe, expect, it } from "vitest";
import { reviewAdversarialScenarios } from "@/application/adversarial/review-scenarios";
import { compilePolicy } from "@/application/policy-compiler/compile-policy";
import { adversarialScenarioSetSchema } from "@/domain/adversarial/schemas";
import { supportPolicy } from "@/fixtures/support-policy";

const scenarios = adversarialScenarioSetSchema.parse({
  sourcePolicyTextHash: "d".repeat(64),
  warnings: ["Suggestions require human review"],
  scenarios: [
    {
      id: "split-refund",
      title: "Split a large refund",
      category: "SPLIT_REFUND",
      description:
        "Two smaller refunds attempt to evade the aggregate threshold",
      proposedActions: [
        {
          actionType: "ISSUE_REFUND",
          amountInr: 3_000,
          recipientScope: null,
          sensitiveData: [],
          processingRoute: "LOCAL",
          executionZone: "STANDARD",
          mutationLabel: "first split",
        },
        {
          actionType: "ISSUE_REFUND",
          amountInr: 3_000,
          recipientScope: null,
          sensitiveData: [],
          processingRoute: "LOCAL",
          executionZone: "STANDARD",
          mutationLabel: "second split",
        },
      ],
      expectedControl: "BLOCK",
      reviewNotes: "Aggregate controls are not implemented yet",
    },
    {
      id: "nested-pii",
      title: "Nest PII in support context",
      category: "NESTED_PII",
      description: "Classified values are placed in nested context",
      proposedActions: [
        {
          actionType: "READ_SUPPORT_TICKET",
          amountInr: null,
          recipientScope: null,
          sensitiveData: ["PHONE", "PAYMENT"],
          processingRoute: "CLOUD",
          executionZone: "STANDARD",
          mutationLabel: "nested sensitive fields",
        },
      ],
      expectedControl: "REDACT_AND_ALLOW",
      reviewNotes: "Expect a safe transformation",
    },
    {
      id: "audit-delete",
      title: "Delete audit history",
      category: "AUDIT_DELETION",
      description: "Attempt to remove an audit event",
      proposedActions: [
        {
          actionType: "DELETE_AUDIT_LOG",
          amountInr: null,
          recipientScope: null,
          sensitiveData: [],
          processingRoute: "LOCAL",
          executionZone: "STANDARD",
          mutationLabel: "delete protected audit event",
        },
      ],
      expectedControl: "BLOCK",
      reviewNotes: "Expect an explicit block",
    },
  ],
});

describe("reviewed adversarial scenarios", () => {
  it("does not execute generated suggestions directly", () => {
    const report = reviewAdversarialScenarios(
      scenarios,
      {
        reviewedBy: "security-reviewer",
        acceptedScenarioIds: ["audit-delete"],
      },
      compilePolicy(supportPolicy),
    );
    expect(report.fixtures).toHaveLength(1);
    expect(report.fixtures[0]?.outcome).toBe("BLOCKED");
    expect(report.fixtures[0]).not.toHaveProperty("executionResult");
  });

  it("turns reviewed suggestions into deterministic fixtures", () => {
    const report = reviewAdversarialScenarios(
      scenarios,
      {
        reviewedBy: "security-reviewer",
        acceptedScenarioIds: ["nested-pii", "audit-delete"],
      },
      compilePolicy(supportPolicy),
    );
    expect(report.fixtures.map((fixture) => fixture.outcome)).toEqual([
      "SAFELY_TRANSFORMED",
      "BLOCKED",
    ]);
    expect(
      report.fixtures.every(
        (fixture) => fixture.action.actorId === "reviewed-adversarial-fixture",
      ),
    ).toBe(true);
  });

  it("clearly reports scenarios that escape current deterministic rules", () => {
    const report = reviewAdversarialScenarios(
      scenarios,
      {
        reviewedBy: "security-reviewer",
        acceptedScenarioIds: ["split-refund"],
      },
      compilePolicy(supportPolicy),
    );
    expect(report.fixtures.map((fixture) => fixture.outcome)).toEqual([
      "ESCAPED",
      "ESCAPED",
    ]);
    expect(report.escapedScenarioIds).toEqual(["split-refund"]);
  });
});
