import { z } from "zod";

export const humanConfirmationSchema = z
  .object({
    confirmed: z.literal(true),
    reviewerId: z.string().min(1),
    version: z.string().min(1),
    policyId: z.string().min(1),
    policyName: z.string().min(1),
  })
  .strict();

export type HumanConfirmation = Readonly<
  z.infer<typeof humanConfirmationSchema>
>;
