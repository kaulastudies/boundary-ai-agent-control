import type {
  StructuredOutputClient,
  StructuredOutputRequest,
  StructuredOutputResponse,
} from "@/adapters/openai/structured-output-client";
import {
  normalizeProviderError,
  OpenAIAdapterError,
} from "@/adapters/openai/errors";

export async function requestStructuredOutput<T>(
  client: StructuredOutputClient,
  request: Omit<StructuredOutputRequest<T>, "signal">,
  options: Readonly<{ signal?: AbortSignal; timeoutMs: number }>,
): Promise<StructuredOutputResponse<T>> {
  if (options.signal?.aborted) throw new OpenAIAdapterError("ABORTED", false);

  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), options.timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    return await client.parse({ ...request, signal });
  } catch (error) {
    if (options.signal?.aborted) throw new OpenAIAdapterError("ABORTED", false);
    if (timeoutController.signal.aborted)
      throw new OpenAIAdapterError("TIMEOUT", true);
    throw normalizeProviderError(error);
  } finally {
    clearTimeout(timer);
  }
}
