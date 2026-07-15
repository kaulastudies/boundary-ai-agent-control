import { z } from "zod";
import {
  actionKindSchema,
  decisionKindSchema,
  processingRouteSchema,
  sensitiveDataKindSchema,
} from "@/domain/policy/schemas";

export const adversarialCategorySchema = z.enum([
  "SPLIT_REFUND",
  "NESTED_PII",
  "DISGUISED_EXTERNAL_EMAIL",
  "POST_APPROVAL_MUTATION",
  "APPROVAL_REPLAY",
  "AUDIT_DELETION",
  "UNEXPECTED_ROUTING_ZONE",
]);

export const adversarialActionDraftSchema = z
  .object({
    actionType: actionKindSchema,
    amountInr: z.number().int().positive().nullable(),
    recipientScope: z.enum(["INTERNAL", "EXTERNAL"]).nullable(),
    sensitiveData: z.array(sensitiveDataKindSchema),
    processingRoute: processingRouteSchema,
    executionZone: z.enum(["STANDARD", "PRIVATE"]),
    mutationLabel: z.string().min(1),
  })
  .strict();

export const adversarialScenarioSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    category: adversarialCategorySchema,
    description: z.string().min(1),
    proposedActions: z.array(adversarialActionDraftSchema).min(1),
    expectedControl: decisionKindSchema,
    reviewNotes: z.string().min(1),
  })
  .strict();

export const adversarialScenarioSetSchema = z
  .object({
    scenarios: z.array(adversarialScenarioSchema),
    warnings: z.array(z.string().min(1)),
    sourcePolicyTextHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const adversarialReviewInputSchema = z
  .object({
    reviewedBy: z.string().min(1),
    acceptedScenarioIds: z.array(z.string().min(1)),
  })
  .strict();

export const adversarialFixtureOutcomeSchema = z.enum([
  "BLOCKED",
  "APPROVAL_REQUIRED",
  "SAFELY_TRANSFORMED",
  "ESCAPED",
]);

export type AdversarialScenarioSet = Readonly<
  z.infer<typeof adversarialScenarioSetSchema>
>;
export type AdversarialReviewInput = Readonly<
  z.infer<typeof adversarialReviewInputSchema>
>;
export type AdversarialFixtureOutcome = z.infer<
  typeof adversarialFixtureOutcomeSchema
>;
