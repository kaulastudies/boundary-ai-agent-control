import type {
  StructuredOutputClient,
  StructuredOutputRequest,
  StructuredOutputResponse,
} from "@/adapters/openai/structured-output-client";

export type FakeResponseHandler = (
  request: StructuredOutputRequest<unknown>,
) => Promise<StructuredOutputResponse<unknown>>;

export class FakeStructuredOutputClient implements StructuredOutputClient {
  readonly requests: StructuredOutputRequest<unknown>[] = [];

  constructor(private readonly handler: FakeResponseHandler) {}

  async parse<T>(
    request: StructuredOutputRequest<T>,
  ): Promise<StructuredOutputResponse<T>> {
    this.requests.push(request as StructuredOutputRequest<unknown>);
    return (await this.handler(
      request as StructuredOutputRequest<unknown>,
    )) as StructuredOutputResponse<T>;
  }

  static returning(outputParsed: unknown, refusal: string | null = null) {
    return new FakeStructuredOutputClient(async () => ({
      outputParsed,
      refusal,
    }));
  }

  static failing(error: unknown) {
    return new FakeStructuredOutputClient(async () => {
      throw error;
    });
  }

  static waitingForAbort() {
    return new FakeStructuredOutputClient(
      (request) =>
        new Promise((_, reject) => {
          request.signal.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        }),
    );
  }
}
