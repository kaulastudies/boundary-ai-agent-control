import { OpenAIAdapterError } from "@/adapters/openai/errors";
import { requestStructuredOutput } from "@/adapters/openai/request-structured-output";
import { hashSourceText } from "@/adapters/openai/source-hash";
import type { StructuredOutputClient } from "@/adapters/openai/structured-output-client";
import {
  adversarialScenarioSetSchema,
  type AdversarialScenarioSet,
} from "@/domain/adversarial/schemas";

const adversarialInstructions = `Propose non-executable adversarial scenarios for reviewing a deterministic policy engine.
Consider split refunds, nested PII, disguised external email, post-approval mutation, approval replay, audit deletion, and unexpected routing zones.
Return suggestions only. Never invoke a tool, authorize execution, approve a request, or claim an action executed.`;

export class AdversarialScenarioAdapter {
  constructor(
    private readonly client: StructuredOutputClient,
    private readonly model = "gpt-5.6",
    private readonly timeoutMs = 15_000,
  ) {}

  async generate(
    policyText: string,
    signal?: AbortSignal,
  ): Promise<AdversarialScenarioSet> {
    const sourcePolicyTextHash = hashSourceText(policyText);
    const response = await requestStructuredOutput(
      this.client,
      {
        model: this.model,
        instructions: adversarialInstructions,
        input: `Source policy text hash: ${sourcePolicyTextHash}\n\nAnalyze this policy:\n${policyText}`,
        schema: adversarialScenarioSetSchema,
        schemaName: "boundary_adversarial_scenarios",
      },
      { signal, timeoutMs: this.timeoutMs },
    );

    if (response.refusal) throw new OpenAIAdapterError("REFUSAL", false);
    if (response.outputParsed === null)
      throw new OpenAIAdapterError("EMPTY_OUTPUT", true);
    const parsed = adversarialScenarioSetSchema.safeParse(
      response.outputParsed,
    );
    if (
      !parsed.success ||
      parsed.data.sourcePolicyTextHash !== sourcePolicyTextHash
    ) {
      throw new OpenAIAdapterError("MALFORMED_OUTPUT", false);
    }
    return Object.freeze(parsed.data);
  }
}
