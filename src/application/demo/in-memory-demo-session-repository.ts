import {
  emptyPersistedDemoSession,
  persistedDemoSessionSchema,
  type PersistedDemoSession,
} from "@/application/demo/demo-workspace-session";
import {
  type DemoSessionRepository,
  SessionCapacityError,
  type SessionRecord,
} from "@/application/demo/session-repository";

export interface InMemoryRepositoryOptions {
  readonly now?: () => number;
  readonly ttlMs?: number;
  readonly maxSessions?: number;
  readonly nextId?: () => string;
}

interface Stored {
  readonly sessionId: string;
  readonly clientToken: string;
  state: PersistedDemoSession;
  lastAccessedAt: number;
}

export class InMemoryDemoSessionRepository implements DemoSessionRepository {
  readonly #sessions = new Map<string, Stored>();
  readonly #sessionIdByClient = new Map<string, string>();
  readonly #now: () => number;
  readonly #ttlMs: number;
  readonly #maxSessions: number;
  readonly #nextId: () => string;

  constructor(options: InMemoryRepositoryOptions = {}) {
    this.#now = options.now ?? Date.now;
    this.#ttlMs = options.ttlMs ?? 30 * 60_000;
    this.#maxSessions = options.maxSessions ?? 64;
    this.#nextId = options.nextId ?? (() => crypto.randomUUID());
  }

  async create(clientToken: string): Promise<SessionRecord> {
    this.cleanup();
    const existingId = this.#sessionIdByClient.get(clientToken);
    const existing = existingId ? this.#sessions.get(existingId) : undefined;
    if (existing) {
      existing.lastAccessedAt = this.#now();
      return {
        sessionId: existing.sessionId,
        state: existing.state,
        reused: true,
      };
    }
    if (this.#sessions.size >= this.#maxSessions)
      throw new SessionCapacityError();
    const stored: Stored = {
      sessionId: `workspace-${this.#nextId()}`,
      clientToken,
      state: emptyPersistedDemoSession(),
      lastAccessedAt: this.#now(),
    };
    this.#sessions.set(stored.sessionId, stored);
    this.#sessionIdByClient.set(clientToken, stored.sessionId);
    return { sessionId: stored.sessionId, state: stored.state, reused: false };
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    this.cleanup();
    const stored = this.#sessions.get(sessionId);
    if (!stored) return null;
    stored.lastAccessedAt = this.#now();
    return { sessionId, state: stored.state };
  }

  async save(sessionId: string, input: PersistedDemoSession): Promise<void> {
    this.cleanup();
    const stored = this.#sessions.get(sessionId);
    if (!stored) throw new Error("Unknown session");
    stored.state = persistedDemoSessionSchema.parse(input);
    stored.lastAccessedAt = this.#now();
  }

  async reset(sessionId: string): Promise<SessionRecord | null> {
    this.cleanup();
    const current = this.#sessions.get(sessionId);
    if (!current) return null;
    this.#delete(current);
    return this.create(current.clientToken);
  }

  cleanup(): number {
    const cutoff = this.#now() - this.#ttlMs;
    let removed = 0;
    for (const stored of this.#sessions.values()) {
      if (stored.lastAccessedAt <= cutoff) {
        this.#delete(stored);
        removed += 1;
      }
    }
    return removed;
  }

  get size(): number {
    return this.#sessions.size;
  }

  #delete(stored: Stored): void {
    this.#sessions.delete(stored.sessionId);
    if (this.#sessionIdByClient.get(stored.clientToken) === stored.sessionId)
      this.#sessionIdByClient.delete(stored.clientToken);
  }
}
