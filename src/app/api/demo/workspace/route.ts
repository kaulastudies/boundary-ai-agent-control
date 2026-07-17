import "server-only";
import { z } from "zod";
import { createDemoSessionRepository } from "@/adapters/upstash/create-demo-session-repository";
import { DemoWorkspaceSession } from "@/application/demo/demo-workspace-session";
import {
  SessionCapacityError,
  SessionRepositoryUnavailableError,
} from "@/application/demo/session-repository";
import {
  FixedWindowRateLimiter,
  rateLimitedResponse,
  requestRateLimitKey,
} from "@/application/http/fixed-window-rate-limiter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const repository = createDemoSessionRepository();
const limiter = new FixedWindowRateLimiter({ limit: 60, windowMs: 60_000 });
const sessionId = z.string().min(1).max(100);

const commandSchema = z.discriminatedUnion("command", [
  z
    .object({
      command: z.literal("INIT"),
      clientToken: z.string().min(12).max(100),
    })
    .strict(),
  z.object({ command: z.literal("RESET"), sessionId }).strict(),
  z
    .object({
      command: z.literal("INTERPRET_DEMO"),
      sessionId,
      policyText: z.string().min(20).max(12000),
    })
    .strict(),
  z
    .object({
      command: z.literal("SET_LIVE_DRAFT"),
      sessionId,
      draft: z.unknown(),
    })
    .strict(),
  z
    .object({
      command: z.literal("CONFIRM"),
      sessionId,
      reviewerId: z.string().min(2).max(80),
      draft: z.unknown(),
    })
    .strict(),
  z
    .object({
      command: z.literal("SUBMIT"),
      sessionId,
      preset: z.enum([
        "SAFE_REFUND",
        "LARGE_REFUND",
        "PII_CLOUD",
        "PRIVATE_TRANSCRIPT",
        "EXTERNAL_EMAIL",
        "BLOCKED_DELETE",
      ]),
    })
    .strict(),
  z
    .object({
      command: z.literal("RESOLVE"),
      sessionId,
      approvalId: z.string().min(1).max(100),
      resolution: z.enum(["APPROVED", "REJECTED"]),
    })
    .strict(),
  z
    .object({
      command: z.literal("EXPIRE"),
      sessionId,
      approvalId: z.string().min(1).max(100),
    })
    .strict(),
  z
    .object({
      command: z.literal("CONTINUE"),
      sessionId,
      approvalId: z.string().min(1).max(100),
    })
    .strict(),
  z.object({ command: z.literal("RUN_ADVERSARIAL"), sessionId }).strict(),
]);

export async function POST(request: Request): Promise<Response> {
  const rate = limiter.check(requestRateLimitKey(request));
  if (!rate.allowed) return rateLimitedResponse(rate.retryAfterSeconds);

  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > 15_000) return safeError("Request is too large.", 413);
    const body = await request.text();
    if (body.length > 15_000) return safeError("Request is too large.", 413);
    const input = commandSchema.parse(JSON.parse(body));

    if (input.command === "INIT") {
      const record = await repository.create(input.clientToken);
      const session = DemoWorkspaceSession.restore(record.state);
      return Response.json({
        sessionId: record.sessionId,
        snapshot: session.snapshot(),
      });
    }
    if (input.command === "RESET") {
      const record = await repository.reset(input.sessionId);
      if (!record) return expiredSession();
      return Response.json({
        sessionId: record.sessionId,
        snapshot: DemoWorkspaceSession.restore(record.state).snapshot(),
      });
    }

    const record = await repository.get(input.sessionId);
    if (!record) return expiredSession();
    const session = DemoWorkspaceSession.restore(record.state);

    let snapshot;
    switch (input.command) {
      case "INTERPRET_DEMO":
        snapshot = session.interpretDemo(input.policyText);
        break;
      case "SET_LIVE_DRAFT":
        snapshot = session.setLiveDraft(input.draft);
        break;
      case "CONFIRM":
        snapshot = session.confirm(input.reviewerId, input.draft);
        break;
      case "SUBMIT":
        snapshot = session.submit(input.preset);
        break;
      case "RESOLVE":
        snapshot = session.resolve(input.approvalId, input.resolution);
        break;
      case "EXPIRE":
        snapshot = session.expire(input.approvalId);
        break;
      case "CONTINUE":
        snapshot = session.continue(input.approvalId);
        break;
      case "RUN_ADVERSARIAL":
        snapshot = session.runAdversarial();
        break;
    }
    await repository.save(record.sessionId, session.exportState());
    return Response.json({ sessionId: record.sessionId, snapshot });
  } catch (error) {
    if (error instanceof SessionRepositoryUnavailableError)
      return safeError(
        "Demo sessions are temporarily unavailable. Please try again shortly.",
        503,
      );
    if (error instanceof SessionCapacityError)
      return safeError(
        "The public demo is busy. Please try again shortly.",
        503,
      );
    return safeError("The request could not be completed safely.", 400);
  }
}

function expiredSession(): Response {
  return safeError(
    "Demo session expired or was reset. Start a new session.",
    410,
  );
}

function safeError(error: string, status: number): Response {
  return Response.json({ error }, { status });
}
