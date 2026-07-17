import "server-only";
import { createOfficialResponsesClient } from "@/adapters/openai/client";
import { PolicyInterpretationAdapter } from "@/adapters/openai/policy-interpretation-adapter";
import { handleInterpretPolicyRequest } from "@/application/http/interpret-policy-request";
import {
  FixedWindowRateLimiter,
  rateLimitedResponse,
  requestRateLimitKey,
} from "@/application/http/fixed-window-rate-limiter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const limiter = new FixedWindowRateLimiter({ limit: 10, windowMs: 60_000 });

export function GET(): Response {
  return Response.json({ available: Boolean(process.env.OPENAI_API_KEY) });
}

export async function POST(request: Request): Promise<Response> {
  const rate = limiter.check(requestRateLimitKey(request));
  if (!rate.allowed) return rateLimitedResponse(rate.retryAfterSeconds);
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error: "Live GPT-5.6 mode is unavailable. Demo mode remains available.",
      },
      { status: 503 },
    );
  }
  return handleInterpretPolicyRequest(request, () => {
    const { client, model } = createOfficialResponsesClient();
    return new PolicyInterpretationAdapter(client, model);
  });
}
