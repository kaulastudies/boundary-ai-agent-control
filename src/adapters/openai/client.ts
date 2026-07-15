import "server-only";
import OpenAI from "openai";
import { loadOpenAIEnvironment } from "@/adapters/openai/environment";
import { OfficialResponsesClient } from "@/adapters/openai/official-responses-client";

export function createOfficialResponsesClient(): Readonly<{
  client: OfficialResponsesClient;
  model: string;
}> {
  const environment = loadOpenAIEnvironment();
  const openai = new OpenAI({ apiKey: environment.apiKey });
  return Object.freeze({
    client: new OfficialResponsesClient(openai),
    model: environment.model,
  });
}
