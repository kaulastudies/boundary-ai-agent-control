import { describe, expect, it } from "vitest";
import { confirmPolicyInterpretation } from "@/application/confirmation/confirm-policy-interpretation";
import {
  policyInterpretationSchema,
  unconfirmedPolicyInterpretationSchema,
} from "@/domain/interpretation/schemas";

const hash = "c".repeat(64);
const interpretation = policyInterpretationSchema.parse({
  summary: "Synthetic support policy",
  assumptions: [],
  clarificationQuestions: [],
  proposedRules: [
    {
      actionType: "ISSUE_REFUND",
      conditions: ["amountInr > 5000"],
      outcome: "REQUIRE_APPROVAL",
      redactionCategories: [],
      executionZone: "STANDARD",
      approvalThresholdInr: 5_000,
      rationale: "Large refunds need review",
    },
    {
      actionType: "READ_SUPPORT_TICKET",
      conditions: ["cloud route contains phone or payment"],
      outcome: "REDACT_AND_ALLOW",
      redactionCategories: ["PHONE", "PAYMENT"],
      executionZone: "STANDARD",
      approvalThresholdInr: null,
      rationale: "Remove classified fields",
    },
    {
      actionType: "SEND_EMAIL",
      conditions: ["recipient is external"],
      outcome: "REQUIRE_APPROVAL",
      redactionCategories: [],
      executionZone: "STANDARD",
      approvalThresholdInr: null,
      rationale: "Outbound communication needs review",
    },
    {
      actionType: "DELETE_AUDIT_LOG",
      conditions: ["always"],
      outcome: "BLOCK",
      redactionCategories: [],
      executionZone: "STANDARD",
      approvalThresholdInr: null,
      rationale: "Audit history is immutable",
    },
  ],
  warnings: [],
  confidence: 0.95,
  sourcePolicyTextHash: hash,
});
const draft = unconfirmedPolicyInterpretationSchema.parse({
  status: "UNCONFIRMED",
  interpretation,
});

describe("human confirmation boundary", () => {
  it("keeps a model draft inactive without separate confirmation", () => {
    expect(draft.status).toBe("UNCONFIRMED");
    expect(draft).not.toHaveProperty("compiledPolicy");
    expect(draft.interpretation).not.toHaveProperty("authority");
  });

  it("rejects confirmation without the literal human confirmed flag", () => {
    expect(() =>
      confirmPolicyInterpretation(draft, {
        confirmed: false,
        reviewerId: "demo-reviewer",
        version: "1.0.0",
        policyId: "confirmed-policy",
        policyName: "Confirmed support policy",
      } as never),
    ).toThrow();
  });

  it("creates human provenance and compiles only after confirmation", () => {
    const result = confirmPolicyInterpretation(draft, {
      confirmed: true,
      reviewerId: "demo-reviewer",
      version: "1.0.0",
      policyId: "confirmed-policy",
      policyName: "Confirmed support policy",
    });
    expect(result.status).toBe("CONFIRMED");
    expect(result.compiledPolicy).toMatchObject({
      authority: "DETERMINISTIC_ENGINE",
      sourcePolicyTextHash: hash,
      confirmedBy: "demo-reviewer",
      sourcePolicyVersion: "1.0.0",
    });
    expect(
      result.compiledPolicy.rules.some((rule) => rule.decision === "BLOCK"),
    ).toBe(true);
  });
});
