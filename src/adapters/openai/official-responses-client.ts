import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type {
  StructuredOutputClient,
  StructuredOutputRequest,
  StructuredOutputResponse,
} from "@/adapters/openai/structured-output-client";

export class OfficialResponsesClient implements StructuredOutputClient {
  constructor(private readonly client: OpenAI) {}

  async parse<T>(
    request: StructuredOutputRequest<T>,
  ): Promise<StructuredOutputResponse<T>> {
    const response = await this.client.responses.parse(
      {
        model: request.model,
        instructions: request.instructions,
        input: request.input,
        text: {
          format: zodTextFormat(request.schema, request.schemaName),
        },
      },
      { signal: request.signal },
    );

    let refusal: string | null = null;
    for (const item of response.output) {
      if (item.type !== "message") continue;
      for (const content of item.content) {
        if (content.type === "refusal") refusal = content.refusal;
      }
    }

    return Object.freeze({
      outputParsed: (response.output_parsed as T | null) ?? null,
      refusal,
    });
  }
}
