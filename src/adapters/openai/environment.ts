import "server-only";
import {
  parseOpenAIEnvironment,
  type OpenAIEnvironment,
} from "@/adapters/openai/environment-schema";

export function loadOpenAIEnvironment(): OpenAIEnvironment {
  return parseOpenAIEnvironment(process.env);
}
