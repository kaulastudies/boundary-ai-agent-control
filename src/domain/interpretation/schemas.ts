import { z } from "zod";
import {
  actionKindSchema,
  decisionKindSchema,
  sensitiveDataKindSchema,
} from "@/domain/policy/schemas";

export const proposedInterpretationRuleSchema = z
  .object({
    actionType: actionKindSchema,
    conditions: z.array(z.string().min(1)),
    outcome: decisionKindSchema,
    redactionCategories: z.array(sensitiveDataKindSchema),
    executionZone: z.enum(["STANDARD", "PRIVATE"]),
    approvalThresholdInr: z.number().int().nonnegative().nullable(),
    rationale: z.string().min(1),
  })
  .strict();

export const policyInterpretationSchema = z
  .object({
    summary: z.string().min(1),
    assumptions: z.array(z.string().min(1)),
    clarificationQuestions: z.array(z.string().min(1)),
    proposedRules: z.array(proposedInterpretationRuleSchema),
    warnings: z.array(z.string().min(1)),
    confidence: z.number().min(0).max(1),
    sourcePolicyTextHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const unconfirmedPolicyInterpretationSchema = z
  .object({
    status: z.literal("UNCONFIRMED"),
    interpretation: policyInterpretationSchema,
  })
  .strict();

export type PolicyInterpretation = Readonly<
  z.infer<typeof policyInterpretationSchema>
>;
export type UnconfirmedPolicyInterpretation = Readonly<
  z.infer<typeof unconfirmedPolicyInterpretationSchema>
>;
