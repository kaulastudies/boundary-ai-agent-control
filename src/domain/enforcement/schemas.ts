import { z } from "zod";
import {
  decisionKindSchema,
  processingRouteSchema,
  sensitiveDataKindSchema,
} from "@/domain/policy/schemas";

export const supportContextSchema = z
  .object({
    summary: z.string().min(1),
    phone: z.string().min(1).optional(),
    paymentReference: z.string().min(1).optional(),
  })
  .strict();

const actionEnvelopeSchema = z.object({
  id: z.string().min(1),
  actorId: z.string().min(1),
  risk: z.enum(["LOW", "RISKY"]),
  sensitiveData: z.array(sensitiveDataKindSchema),
  processingRoute: processingRouteSchema,
  executionZone: z.enum(["STANDARD", "PRIVATE"]).default("STANDARD"),
  routingHistory: z.array(z.enum(["STANDARD", "PRIVATE"])).default([]),
  supportContext: supportContextSchema.optional(),
});

const readSupportTicketActionSchema = actionEnvelopeSchema
  .extend({
    kind: z.literal("READ_SUPPORT_TICKET"),
    ticketId: z.string().min(1),
  })
  .strict();

const issueRefundActionSchema = actionEnvelopeSchema
  .extend({
    kind: z.literal("ISSUE_REFUND"),
    ticketId: z.string().min(1),
    amountInr: z.number().int().positive(),
  })
  .strict();

const sendEmailActionSchema = actionEnvelopeSchema
  .extend({
    kind: z.literal("SEND_EMAIL"),
    ticketId: z.string().min(1),
    recipient: z.string().email(),
    recipientScope: z.enum(["INTERNAL", "EXTERNAL"]),
    body: z.string().min(1),
  })
  .strict();

const deleteAuditLogActionSchema = actionEnvelopeSchema
  .extend({
    kind: z.literal("DELETE_AUDIT_LOG"),
    targetEventId: z.string().min(1),
  })
  .strict();

export const proposedAgentActionSchema = z.discriminatedUnion("kind", [
  readSupportTicketActionSchema,
  issueRefundActionSchema,
  sendEmailActionSchema,
  deleteAuditLogActionSchema,
]);

export const enforcementDecisionSchema = z
  .object({
    actionId: z.string().min(1),
    policyId: z.string().min(1),
    decision: decisionKindSchema,
    reason: z.string().min(1),
    matchedRuleId: z.string().min(1).nullable(),
    redactions: z.array(sensitiveDataKindSchema),
    authorizedForExecution: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    const executable =
      value.decision === "ALLOW" || value.decision === "REDACT_AND_ALLOW";
    if (value.authorizedForExecution !== executable) {
      context.addIssue({
        code: "custom",
        path: ["authorizedForExecution"],
        message: "Only deterministic ALLOW decisions authorize execution",
      });
    }
  });

export type ProposedAgentAction = Readonly<
  z.infer<typeof proposedAgentActionSchema>
>;
type EnforcementDecisionValue = z.infer<typeof enforcementDecisionSchema>;
export type EnforcementDecision = Readonly<
  Omit<EnforcementDecisionValue, "redactions"> & {
    readonly redactions: readonly z.infer<typeof sensitiveDataKindSchema>[];
  }
>;
