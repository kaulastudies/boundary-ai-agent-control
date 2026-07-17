import "server-only";
import { Redis } from "@upstash/redis";
import type { DemoSessionRepository } from "@/application/demo/session-repository";
import { SessionRepositoryUnavailableError } from "@/application/demo/session-repository";
import { InMemoryDemoSessionRepository } from "@/application/demo/in-memory-demo-session-repository";
import { UpstashDemoSessionRepository } from "@/adapters/upstash/upstash-demo-session-repository";

class UnavailableRepository implements DemoSessionRepository {
  async create(): Promise<never> {
    throw new SessionRepositoryUnavailableError();
  }
  async get(): Promise<never> {
    throw new SessionRepositoryUnavailableError();
  }
  async save(): Promise<never> {
    throw new SessionRepositoryUnavailableError();
  }
  async reset(): Promise<never> {
    throw new SessionRepositoryUnavailableError();
  }
}

export function createDemoSessionRepository(
  environment: NodeJS.ProcessEnv = process.env,
): DemoSessionRepository {
  const production = environment.NODE_ENV === "production";
  // Prefer the current Upstash SDK variable names. Vercel's legacy KV
  // integration exposes the same REST credentials under KV_REST_API_*.
  // Supporting both avoids copying, printing, or re-storing secrets.
  const url = environment.UPSTASH_REDIS_REST_URL ?? environment.KV_REST_API_URL;
  const token =
    environment.UPSTASH_REDIS_REST_TOKEN ?? environment.KV_REST_API_TOKEN;

  if (url && token) {
    return new UpstashDemoSessionRepository(
      new Redis({
        url,
        token,
        enableTelemetry: false,
        signal: () => AbortSignal.timeout(2_000),
      }),
    );
  }
  if (production) return new UnavailableRepository();
  return new InMemoryDemoSessionRepository();
}
