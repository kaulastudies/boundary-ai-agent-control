import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIUserAbortError,
  AuthenticationError,
  RateLimitError,
} from "openai";

export type OpenAIAdapterErrorCode =
  | "CONFIGURATION"
  | "TIMEOUT"
  | "ABORTED"
  | "REFUSAL"
  | "EMPTY_OUTPUT"
  | "MALFORMED_OUTPUT"
  | "AUTHENTICATION"
  | "RATE_LIMIT"
  | "TRANSIENT_PROVIDER"
  | "UNKNOWN_PROVIDER";

const safeMessages: Record<OpenAIAdapterErrorCode, string> = {
  CONFIGURATION: "The policy interpretation service is not configured.",
  TIMEOUT: "The policy interpretation request timed out.",
  ABORTED: "The policy interpretation request was cancelled.",
  REFUSAL: "The model declined to produce the requested analysis.",
  EMPTY_OUTPUT: "The model returned no structured analysis.",
  MALFORMED_OUTPUT: "The model returned an invalid structured analysis.",
  AUTHENTICATION: "The policy interpretation service could not authenticate.",
  RATE_LIMIT: "The policy interpretation service is temporarily busy.",
  TRANSIENT_PROVIDER:
    "The policy interpretation service is temporarily unavailable.",
  UNKNOWN_PROVIDER: "The policy interpretation service failed safely.",
};

export class OpenAIAdapterError extends Error {
  readonly name = "OpenAIAdapterError";

  constructor(
    readonly code: OpenAIAdapterErrorCode,
    readonly retryable: boolean,
  ) {
    super(safeMessages[code]);
  }

  toSafeJSON(): Readonly<{
    code: OpenAIAdapterErrorCode;
    message: string;
    retryable: boolean;
  }> {
    return Object.freeze({
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    });
  }
}

export function normalizeProviderError(error: unknown): OpenAIAdapterError {
  if (error instanceof OpenAIAdapterError) return error;
  if (error instanceof APIUserAbortError)
    return new OpenAIAdapterError("ABORTED", false);
  if (error instanceof APIConnectionTimeoutError)
    return new OpenAIAdapterError("TIMEOUT", true);
  if (error instanceof AuthenticationError)
    return new OpenAIAdapterError("AUTHENTICATION", false);
  if (error instanceof RateLimitError)
    return new OpenAIAdapterError("RATE_LIMIT", true);
  if (error instanceof APIConnectionError)
    return new OpenAIAdapterError("TRANSIENT_PROVIDER", true);

  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status)
      : undefined;
  if (status === 401 || status === 403)
    return new OpenAIAdapterError("AUTHENTICATION", false);
  if (status === 429) return new OpenAIAdapterError("RATE_LIMIT", true);
  if (status !== undefined && status >= 500) {
    return new OpenAIAdapterError("TRANSIENT_PROVIDER", true);
  }
  return new OpenAIAdapterError("UNKNOWN_PROVIDER", false);
}
