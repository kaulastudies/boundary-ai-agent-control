import { z } from "zod";

export const actionKindSchema = z.enum([
  "READ_SUPPORT_TICKET",
  "ISSUE_REFUND",
  "SEND_EMAIL",
  "DELETE_AUDIT_LOG",
]);

export const sensitiveDataKindSchema = z.enum([
  "PHONE",
  "PAYMENT",
  "SUPPORT_TRANSCRIPT",
]);

export const processingRouteSchema = z.enum(["LOCAL", "CLOUD", "PRIVATE"]);
export const recipientScopeSchema = z.enum(["INTERNAL", "EXTERNAL"]);

export const decisionKindSchema = z.enum([
  "ALLOW",
  "REDACT_AND_ALLOW",
  "ROUTE_PRIVATELY",
  "REQUIRE_APPROVAL",
  "BLOCK",
]);

export const authoredPolicySchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    name: z.string().min(1),
    authority: z.literal("HUMAN"),
    sourcePolicyTextHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    confirmedBy: z.string().min(1).optional(),
    refundApprovalThresholdInr: z.number().int().nonnegative(),
    redactBeforeCloud: z.array(sensitiveDataKindSchema),
    routePrivately: z.array(sensitiveDataKindSchema),
    outboundCommunicationRequiresApproval: z.boolean(),
    prohibitedActions: z.array(actionKindSchema),
  })
  .strict();

export const ruleMatchSchema = z
  .object({
    actionKinds: z.array(actionKindSchema).min(1).optional(),
    sensitiveData: z.array(sensitiveDataKindSchema).min(1).optional(),
    processingRoutes: z.array(processingRouteSchema).min(1).optional(),
    recipientScopes: z.array(recipientScopeSchema).min(1).optional(),
    amountInrAtMost: z.number().int().nonnegative().optional(),
    amountInrGreaterThan: z.number().int().nonnegative().optional(),
  })
  .strict();

export const normalizedRuleSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    priority: z.number().int().nonnegative(),
    decision: decisionKindSchema,
    match: ruleMatchSchema,
    redact: z.array(sensitiveDataKindSchema).optional(),
  })
  .strict();

export const compiledPolicySchema = z
  .object({
    id: z.string().min(1),
    sourcePolicyId: z.string().min(1),
    sourcePolicyVersion: z.string().min(1),
    authority: z.literal("DETERMINISTIC_ENGINE"),
    sourcePolicyTextHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    confirmedBy: z.string().min(1).nullable(),
    rules: z.array(normalizedRuleSchema),
    defaultDecision: z.literal("BLOCK"),
  })
  .strict();

export type ActionKind = z.infer<typeof actionKindSchema>;
export type SensitiveDataKind = z.infer<typeof sensitiveDataKindSchema>;
export type AuthoredPolicy = Readonly<z.infer<typeof authoredPolicySchema>>;
export type NormalizedRule = Readonly<z.infer<typeof normalizedRuleSchema>>;
type CompiledPolicyValue = z.infer<typeof compiledPolicySchema>;
export type CompiledPolicy = Readonly<
  Omit<CompiledPolicyValue, "rules"> & {
    readonly rules: readonly NormalizedRule[];
  }
>;
export type DecisionKind = z.infer<typeof decisionKindSchema>;
