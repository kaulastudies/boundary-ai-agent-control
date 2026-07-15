import { z } from "zod";

export const approvalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);

export const approvalRequestSchema = z
  .object({
    id: z.string().min(1),
    actionId: z.string().min(1),
    policyId: z.string().min(1),
    reason: z.string().min(1),
    status: approvalStatusSchema,
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    resolvedAt: z.string().datetime().nullable(),
    resolvedBy: z.string().min(1).nullable(),
    resolutionNote: z.string().min(1).nullable(),
  })
  .strict();

export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type ApprovalRequest = Readonly<z.infer<typeof approvalRequestSchema>>;
