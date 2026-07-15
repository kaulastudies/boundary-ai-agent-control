import "server-only";
import { z } from "zod";
import { DemoWorkspaceSession } from "@/application/demo/demo-workspace-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sessions = new Map<string, DemoWorkspaceSession>();
let sessionSequence = 0;

const commandSchema = z.discriminatedUnion("command", [
  z.object({ command: z.literal("INIT") }).strict(),
  z
    .object({
      command: z.literal("INTERPRET_DEMO"),
      sessionId: z.string().min(1),
      policyText: z.string().min(20).max(12000),
    })
    .strict(),
  z
    .object({
      command: z.literal("SET_LIVE_DRAFT"),
      sessionId: z.string().min(1),
      draft: z.unknown(),
    })
    .strict(),
  z
    .object({
      command: z.literal("CONFIRM"),
      sessionId: z.string().min(1),
      reviewerId: z.string().min(2).max(80),
    })
    .strict(),
  z
    .object({
      command: z.literal("SUBMIT"),
      sessionId: z.string().min(1),
      preset: z.enum([
        "SAFE_REFUND",
        "LARGE_REFUND",
        "PII_CLOUD",
        "PRIVATE_TRANSCRIPT",
        "EXTERNAL_EMAIL",
        "BLOCKED_DELETE",
      ]),
      amountInr: z.number().int().positive().max(1000000).optional(),
      recipient: z.string().email().max(254).optional(),
    })
    .strict(),
  z
    .object({
      command: z.literal("RESOLVE"),
      sessionId: z.string().min(1),
      approvalId: z.string().min(1),
      resolution: z.enum(["APPROVED", "REJECTED"]),
    })
    .strict(),
  z
    .object({
      command: z.literal("EXPIRE"),
      sessionId: z.string().min(1),
      approvalId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      command: z.literal("CONTINUE"),
      sessionId: z.string().min(1),
      approvalId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      command: z.literal("RUN_ADVERSARIAL"),
      sessionId: z.string().min(1),
    })
    .strict(),
]);

export async function POST(request: Request): Promise<Response> {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 15000)
      return safeError("Request is too large", 413);
    const input = commandSchema.parse(await request.json());
    if (input.command === "INIT") {
      const sessionId = `workspace-${++sessionSequence}`;
      const session = new DemoWorkspaceSession();
      sessions.set(sessionId, session);
      return Response.json({ sessionId, snapshot: session.snapshot() });
    }
    const session = sessions.get(input.sessionId);
    if (!session)
      return safeError("Demo session not found; refresh to start again", 404);
    let snapshot;
    switch (input.command) {
      case "INTERPRET_DEMO":
        snapshot = session.interpretDemo(input.policyText);
        break;
      case "SET_LIVE_DRAFT":
        snapshot = session.setLiveDraft(input.draft);
        break;
      case "CONFIRM":
        snapshot = session.confirm(input.reviewerId);
        break;
      case "SUBMIT":
        snapshot = session.submit(
          input.preset,
          input.amountInr,
          input.recipient,
        );
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
    return Response.json({ sessionId: input.sessionId, snapshot });
  } catch (error) {
    const message =
      error instanceof Error && !/key|secret|prompt|stack/i.test(error.message)
        ? error.message
        : "The request could not be completed safely";
    return safeError(message, 400);
  }
}

function safeError(error: string, status: number) {
  return Response.json({ error }, { status });
}
