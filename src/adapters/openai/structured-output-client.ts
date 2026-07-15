import type { z } from "zod";

export interface StructuredOutputRequest<T> {
  readonly model: string;
  readonly instructions: string;
  readonly input: string;
  readonly schema: z.ZodType<T>;
  readonly schemaName: string;
  readonly signal: AbortSignal;
}

export interface StructuredOutputResponse<T> {
  readonly outputParsed: T | null;
  readonly refusal: string | null;
}

export interface StructuredOutputClient {
  parse<T>(
    request: StructuredOutputRequest<T>,
  ): Promise<StructuredOutputResponse<T>>;
}
