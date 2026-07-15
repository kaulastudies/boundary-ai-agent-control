import type { AuditEvent, AuditEventDraft } from "@/domain/audit/schemas";
import { auditEventSchema } from "@/domain/audit/schemas";

export interface AuditLedgerDependencies {
  readonly now: () => Date;
  readonly nextId: () => string;
}

export class InMemoryAuditLedger {
  readonly #events: AuditEvent[] = [];

  constructor(private readonly dependencies: AuditLedgerDependencies) {}

  append(draft: AuditEventDraft): AuditEvent {
    const event = Object.freeze(
      auditEventSchema.parse({
        ...draft,
        id: this.dependencies.nextId(),
        occurredAt: this.dependencies.now().toISOString(),
      }),
    );
    this.#events.push(event);
    return event;
  }

  all(): readonly AuditEvent[] {
    return Object.freeze([...this.#events]);
  }

  byCorrelationId(correlationId: string): readonly AuditEvent[] {
    return Object.freeze(
      this.#events.filter((event) => event.correlationId === correlationId),
    );
  }
}
