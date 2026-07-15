import { authoredPolicySchema } from "@/domain/policy/schemas";

export const supportPolicy = Object.freeze(
  authoredPolicySchema.parse({
    id: "support-case-policy",
    version: "1.0.0",
    name: "Build Week support controls",
    authority: "HUMAN",
    refundApprovalThresholdInr: 5_000,
    redactBeforeCloud: ["PHONE", "PAYMENT"],
    routePrivately: ["SUPPORT_TRANSCRIPT"],
    outboundCommunicationRequiresApproval: true,
    prohibitedActions: ["DELETE_AUDIT_LOG"],
  }),
);
