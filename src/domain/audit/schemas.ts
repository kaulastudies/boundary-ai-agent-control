import { z } from "zod";
import { approvalStatusSchema } from "@/domain/approvals/schemas";
import { decisionKindSchema } from "@/domain/policy/schemas";

const auditEnvelopeSchema = z.object({
  id: z.string().min(1),
  occurredAt: z.string().datetime(),
  correlationId: z.string().min(1),
});

const policyCompilationEventSchema = auditEnvelopeSchema
  .extend({
    type: z.literal("POLICY_COMPILED"),
    policyId: z.string().min(1),
    sourcePolicyId: z.string().min(1),
    ruleCount: z.number().int().nonnegative(),
  })
  .strict();

const actionEvaluationEventSchema = auditEnvelopeSchema
  .extend({
    type: z.literal("ACTION_EVALUATED"),
    actionId: z.string().min(1),
    policyId: z.string().min(1),
    decision: decisionKindSchema,
    matchedRuleId: z.string().min(1).nullable(),
  })
  .strict();

const approvalCreationEventSchema = auditEnvelopeSchema
  .extend({
    type: z.literal("APPROVAL_CREATED"),
    approvalId: z.string().min(1),
    actionId: z.string().min(1),
  })
  .strict();

const approvalResolutionEventSchema = auditEnvelopeSchema
  .extend({
    type: z.literal("APPROVAL_RESOLVED"),
    approvalId: z.string().min(1),
    actionId: z.string().min(1),
    status: approvalStatusSchema.exclude(["PENDING"]),
    resolvedBy: z.string().min(1),
  })
  .strict();

const simulatedExecutionEventSchema = auditEnvelopeSchema
  .extend({
    type: z.literal("SIMULATED_EXECUTION"),
    actionId: z.string().min(1),
    tool: z.enum(["READ_SUPPORT_TICKET", "ISSUE_REFUND", "SEND_EMAIL"]),
    outcome: z.literal("SIMULATED_SUCCESS"),
  })
  .strict();

export const auditEventSchema = z.discriminatedUnion("type", [
  policyCompilationEventSchema,
  actionEvaluationEventSchema,
  approvalCreationEventSchema,
  approvalResolutionEventSchema,
  simulatedExecutionEventSchema,
]);

export type AuditEvent = Readonly<z.infer<typeof auditEventSchema>>;
