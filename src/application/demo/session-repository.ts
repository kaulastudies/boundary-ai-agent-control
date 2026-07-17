import type { PersistedDemoSession } from "@/application/demo/demo-workspace-session";

export interface SessionRecord {
  readonly sessionId: string;
  readonly state: PersistedDemoSession;
  readonly reused?: boolean;
}

export interface DemoSessionRepository {
  create(clientToken: string): Promise<SessionRecord>;
  get(sessionId: string): Promise<SessionRecord | null>;
  save(sessionId: string, state: PersistedDemoSession): Promise<void>;
  reset(sessionId: string): Promise<SessionRecord | null>;
}

export class SessionRepositoryUnavailableError extends Error {
  constructor() {
    super("Session repository unavailable");
    this.name = "SessionRepositoryUnavailableError";
  }
}

export class SessionCapacityError extends Error {
  constructor() {
    super("Session capacity reached");
    this.name = "SessionCapacityError";
  }
}
