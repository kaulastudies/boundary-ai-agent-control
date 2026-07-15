import { z } from "zod";
import { OpenAIAdapterError } from "@/adapters/openai/errors";

export const openAIEnvironmentSchema = z
  .object({
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
    OPENAI_MODEL: z.string().min(1).default("gpt-5.6"),
  })
  .passthrough();

export interface OpenAIEnvironment {
  readonly apiKey: string;
  readonly model: string;
}

export function parseOpenAIEnvironment(
  input: Record<string, string | undefined>,
): OpenAIEnvironment {
  const parsed = openAIEnvironmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new OpenAIAdapterError("CONFIGURATION", false);
  }
  return Object.freeze({
    apiKey: parsed.data.OPENAI_API_KEY,
    model: parsed.data.OPENAI_MODEL,
  });
}
