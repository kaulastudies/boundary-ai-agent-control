import { createHash } from "node:crypto";
import { unconfirmedPolicyInterpretationSchema } from "@/domain/interpretation/schemas";

export const DEFAULT_DEMO_POLICY = `Support agents may read synthetic tickets. Before cloud processing, redact phone and payment information. Route full support transcripts privately. Refunds up to ₹5,000 may proceed; larger refunds require human approval. External email requires human approval. Never delete audit history.`;

export function createDemoPolicyInterpretation(policyText: string) {
  const sourcePolicyTextHash = createHash("sha256")
    .update(policyText)
    .digest("hex");
  return unconfirmedPolicyInterpretationSchema.parse({
    status: "UNCONFIRMED",
    interpretation: {
      summary:
        "Synthetic support controls with deterministic privacy, refund, communication, and audit boundaries.",
      assumptions: ["Amounts are Indian rupees.", "All tools are simulated."],
      clarificationQuestions: [],
      proposedRules: [
        {
          actionType: "READ_SUPPORT_TICKET",
          conditions: ["cloud processing contains phone or payment data"],
          outcome: "REDACT_AND_ALLOW",
          redactionCategories: ["PHONE", "PAYMENT"],
          executionZone: "STANDARD",
          approvalThresholdInr: null,
          rationale: "Classified values must not cross the cloud boundary.",
        },
        {
          actionType: "READ_SUPPORT_TICKET",
          conditions: ["support transcript is classified"],
          outcome: "ROUTE_PRIVATELY",
          redactionCategories: ["SUPPORT_TRANSCRIPT"],
          executionZone: "PRIVATE",
          approvalThresholdInr: null,
          rationale: "Full transcripts stay in the private execution zone.",
        },
        {
          actionType: "ISSUE_REFUND",
          conditions: ["amountInr > 5000"],
          outcome: "REQUIRE_APPROVAL",
          redactionCategories: [],
          executionZone: "STANDARD",
          approvalThresholdInr: 5000,
          rationale: "High-value refunds require a human checkpoint.",
        },
        {
          actionType: "SEND_EMAIL",
          conditions: ["recipient is external"],
          outcome: "REQUIRE_APPROVAL",
          redactionCategories: [],
          executionZone: "STANDARD",
          approvalThresholdInr: null,
          rationale: "Outbound communication requires human review.",
        },
        {
          actionType: "DELETE_AUDIT_LOG",
          conditions: ["always"],
          outcome: "BLOCK",
          redactionCategories: [],
          executionZone: "STANDARD",
          approvalThresholdInr: null,
          rationale: "The audit ledger is append-only.",
        },
      ],
      warnings: [
        "This is a committed synthetic demo fixture, not model output.",
      ],
      confidence: 1,
      sourcePolicyTextHash,
    },
  });
}
