import { z } from "zod";
import type { UnconfirmedPolicyInterpretation } from "@/domain/interpretation/schemas";
import { OpenAIAdapterError } from "@/adapters/openai/errors";

const MAX_REQUEST_BYTES = 16 * 1_024;
const interpretRequestSchema = z
  .object({
    policyText: z.string().trim().min(1).max(12_000),
  })
  .strict();

export interface PolicyInterpreter {
  interpret(
    policyText: string,
    signal?: AbortSignal,
  ): Promise<UnconfirmedPolicyInterpretation>;
}

export async function handleInterpretPolicyRequest(
  request: Request,
  createInterpreter: () => PolicyInterpreter,
): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return safeResponse(
      413,
      "REQUEST_TOO_LARGE",
      "Policy text exceeds the request limit.",
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
    return safeResponse(
      413,
      "REQUEST_TOO_LARGE",
      "Policy text exceeds the request limit.",
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return safeResponse(
      400,
      "INVALID_REQUEST",
      "Request body must be valid JSON.",
    );
  }
  const parsed = interpretRequestSchema.safeParse(body);
  if (!parsed.success) {
    return safeResponse(
      400,
      "INVALID_REQUEST",
      "Request must contain valid policy text.",
    );
  }

  try {
    const draft = await createInterpreter().interpret(
      parsed.data.policyText,
      request.signal,
    );
    return Response.json(draft, {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const safeError =
      error instanceof OpenAIAdapterError
        ? error
        : new OpenAIAdapterError("UNKNOWN_PROVIDER", false);
    const status = statusFor(safeError.code);
    return Response.json(
      { error: safeError.toSafeJSON() },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}

function safeResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message, retryable: false } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function statusFor(code: OpenAIAdapterError["code"]): number {
  switch (code) {
    case "ABORTED":
      return 408;
    case "REFUSAL":
      return 422;
    case "RATE_LIMIT":
      return 429;
    case "TIMEOUT":
      return 504;
    case "MALFORMED_OUTPUT":
    case "EMPTY_OUTPUT":
    case "TRANSIENT_PROVIDER":
    case "UNKNOWN_PROVIDER":
      return 502;
    case "CONFIGURATION":
    case "AUTHENTICATION":
      return 503;
  }
}
