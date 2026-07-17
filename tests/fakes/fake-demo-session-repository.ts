import {
  emptyPersistedDemoSession,
  persistedDemoSessionSchema,
  type PersistedDemoSession,
} from "@/application/demo/demo-workspace-session";
import type {
  DemoSessionRepository,
  SessionRecord,
} from "@/application/demo/session-repository";

export class FakeDemoSessionRepository implements DemoSessionRepository {
  readonly records = new Map<string, PersistedDemoSession>();
  readonly clients = new Map<string, string>();
  createCalls = 0;
  #sequence = 0;

  async create(clientToken: string): Promise<SessionRecord> {
    this.createCalls += 1;
    const existing = this.clients.get(clientToken);
    if (existing)
      return {
        sessionId: existing,
        state: structuredClone(this.records.get(existing)!),
        reused: true,
      };
    const sessionId = `fake-session-${++this.#sequence}`;
    const state = emptyPersistedDemoSession();
    this.clients.set(clientToken, sessionId);
    this.records.set(sessionId, state);
    return { sessionId, state: structuredClone(state), reused: false };
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    const state = this.records.get(sessionId);
    return state ? { sessionId, state: structuredClone(state) } : null;
  }

  async save(sessionId: string, state: PersistedDemoSession): Promise<void> {
    if (!this.records.has(sessionId)) throw new Error("Unknown fake session");
    this.records.set(
      sessionId,
      structuredClone(persistedDemoSessionSchema.parse(state)),
    );
  }

  async reset(sessionId: string): Promise<SessionRecord | null> {
    if (!this.records.has(sessionId)) return null;
    const client = [...this.clients].find(
      (entry) => entry[1] === sessionId,
    )?.[0];
    if (!client) return null;
    this.records.delete(sessionId);
    this.clients.delete(client);
    return this.create(client);
  }
}
