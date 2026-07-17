export interface RateLimiterOptions {
  readonly limit: number;
  readonly windowMs: number;
  readonly now?: () => number;
  readonly maxKeys?: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class FixedWindowRateLimiter {
  readonly #buckets = new Map<string, Bucket>();
  readonly #now: () => number;
  readonly #maxKeys: number;

  constructor(private readonly options: RateLimiterOptions) {
    this.#now = options.now ?? Date.now;
    this.#maxKeys = options.maxKeys ?? 1_000;
  }

  check(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = this.#now();
    this.#cleanup(now);
    const current = this.#buckets.get(key);
    if (!current || now >= current.resetAt) {
      if (this.#buckets.size >= this.#maxKeys) this.#evictOldest();
      this.#buckets.set(key, {
        count: 1,
        resetAt: now + this.options.windowMs,
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (current.count >= this.options.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((current.resetAt - now) / 1_000),
        ),
      };
    }
    current.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  #cleanup(now: number): void {
    for (const [key, bucket] of this.#buckets)
      if (now >= bucket.resetAt) this.#buckets.delete(key);
  }

  #evictOldest(): void {
    const firstKey = this.#buckets.keys().next().value as string | undefined;
    if (firstKey) this.#buckets.delete(firstKey);
  }
}

export function requestRateLimitKey(request: Request): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}

export function rateLimitedResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many requests. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
