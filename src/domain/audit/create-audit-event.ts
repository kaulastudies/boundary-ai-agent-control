import type { AuditEvent } from "@/domain/audit/schemas";
import { auditEventSchema } from "@/domain/audit/schemas";

export function createAuditEvent(input: AuditEvent): AuditEvent {
  return Object.freeze(auditEventSchema.parse(input));
}
