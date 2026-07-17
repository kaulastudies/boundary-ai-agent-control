import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Redis } from "@upstash/redis";
import {
  emptyPersistedDemoSession,
  persistedDemoSessionSchema,
  type PersistedDemoSession,
} from "@/application/demo/demo-workspace-session";
import {
  type DemoSessionRepository,
  SessionRepositoryUnavailableError,
  type SessionRecord,
} from "@/application/demo/session-repository";

interface RedisEnvelope {
  readonly clientHash: string;
  readonly state: PersistedDemoSession;
}

export class UpstashDemoSessionRepository implements DemoSessionRepository {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds = 30 * 60,
  ) {}

  async create(clientToken: string): Promise<SessionRecord> {
    return this.#safe(async () => {
      const clientHash = hash(clientToken);
      const clientKey = this.#clientKey(clientHash);
      const existingId = await this.redis.get<string>(clientKey);
      if (existingId) {
        const existing = await this.#read(existingId);
        if (existing) {
          await this.#refresh(existingId, existing.clientHash);
          return { sessionId: existingId, state: existing.state, reused: true };
        }
      }

      const sessionId = `workspace-${randomUUID()}`;
      const envelope: RedisEnvelope = {
        clientHash,
        state: emptyPersistedDemoSession(),
      };
      await this.redis.set(this.#sessionKey(sessionId), envelope, {
        ex: this.ttlSeconds,
      });
      const claimed = await this.redis.set(clientKey, sessionId, {
        ex: this.ttlSeconds,
        nx: true,
      });
      if (claimed === null) {
        await this.redis.del(this.#sessionKey(sessionId));
        const winnerId = await this.redis.get<string>(clientKey);
        const winner = winnerId ? await this.#read(winnerId) : null;
        if (winnerId && winner)
          return { sessionId: winnerId, state: winner.state, reused: true };
        throw new SessionRepositoryUnavailableError();
      }
      return { sessionId, state: envelope.state, reused: false };
    });
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    return this.#safe(async () => {
      const envelope = await this.#read(sessionId);
      if (!envelope) return null;
      await this.#refresh(sessionId, envelope.clientHash);
      return { sessionId, state: envelope.state };
    });
  }

  async save(sessionId: string, input: PersistedDemoSession): Promise<void> {
    return this.#safe(async () => {
      const envelope = await this.#read(sessionId);
      if (!envelope) throw new SessionRepositoryUnavailableError();
      const state = persistedDemoSessionSchema.parse(input);
      await this.redis.set(
        this.#sessionKey(sessionId),
        { clientHash: envelope.clientHash, state },
        { ex: this.ttlSeconds },
      );
      await this.redis.set(this.#clientKey(envelope.clientHash), sessionId, {
        ex: this.ttlSeconds,
      });
    });
  }

  async reset(sessionId: string): Promise<SessionRecord | null> {
    return this.#safe(async () => {
      const current = await this.#read(sessionId);
      if (!current) return null;
      const newId = `workspace-${randomUUID()}`;
      const state = emptyPersistedDemoSession();
      await this.redis.set(
        this.#sessionKey(newId),
        { clientHash: current.clientHash, state },
        { ex: this.ttlSeconds },
      );
      await this.redis.set(this.#clientKey(current.clientHash), newId, {
        ex: this.ttlSeconds,
      });
      await this.redis.del(this.#sessionKey(sessionId));
      return { sessionId: newId, state };
    });
  }

  async #read(sessionId: string): Promise<RedisEnvelope | null> {
    const value = await this.redis.get<RedisEnvelope>(
      this.#sessionKey(sessionId),
    );
    if (!value) return null;
    return {
      clientHash: value.clientHash,
      state: persistedDemoSessionSchema.parse(value.state),
    };
  }

  async #refresh(sessionId: string, clientHash: string): Promise<void> {
    await Promise.all([
      this.redis.expire(this.#sessionKey(sessionId), this.ttlSeconds),
      this.redis.expire(this.#clientKey(clientHash), this.ttlSeconds),
    ]);
  }

  async #safe<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof SessionRepositoryUnavailableError) throw error;
      throw new SessionRepositoryUnavailableError();
    }
  }

  #sessionKey(id: string): string {
    return `boundary:demo:session:${id}`;
  }
  #clientKey(hashValue: string): string {
    return `boundary:demo:client:${hashValue}`;
  }
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
