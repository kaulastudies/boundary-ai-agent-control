import { createHash } from "node:crypto";
import type { ProposedAgentAction } from "@/domain/enforcement/schemas";
import { proposedAgentActionSchema } from "@/domain/enforcement/schemas";

export function fingerprintAction(input: ProposedAgentAction): string {
  const action = proposedAgentActionSchema.parse(input);
  return createHash("sha256").update(JSON.stringify(action)).digest("hex");
}
