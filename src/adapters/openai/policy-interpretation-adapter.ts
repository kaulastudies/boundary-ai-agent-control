import { OpenAIAdapterError } from "@/adapters/openai/errors";
import { requestStructuredOutput } from "@/adapters/openai/request-structured-output";
import { hashSourceText } from "@/adapters/openai/source-hash";
import type { StructuredOutputClient } from "@/adapters/openai/structured-output-client";
import {
  policyInterpretationSchema,
  unconfirmedPolicyInterpretationSchema,
  type UnconfirmedPolicyInterpretation,
} from "@/domain/interpretation/schemas";

const interpretationInstructions = `You interpret human policy text into non-authoritative proposed rules.
Return only the requested structured output. Never authorize execution, approve requests, claim an action executed, invoke tools, or claim HUMAN authority.
List assumptions and clarification questions explicitly. Proposed rules are suggestions for human review and deterministic compilation only.`;

export class PolicyInterpretationAdapter {
  constructor(
    private readonly client: StructuredOutputClient,
    private readonly model = "gpt-5.6",
    private readonly timeoutMs = 15_000,
  ) {}

  async interpret(
    policyText: string,
    signal?: AbortSignal,
  ): Promise<UnconfirmedPolicyInterpretation> {
    const sourcePolicyTextHash = hashSourceText(policyText);
    const response = await requestStructuredOutput(
      this.client,
      {
        model: this.model,
        instructions: interpretationInstructions,
        input: `Source policy text hash: ${sourcePolicyTextHash}\n\nInterpret this policy:\n${policyText}`,
        schema: policyInterpretationSchema,
        schemaName: "boundary_policy_interpretation",
      },
      { signal, timeoutMs: this.timeoutMs },
    );

    if (response.refusal) throw new OpenAIAdapterError("REFUSAL", false);
    if (response.outputParsed === null)
      throw new OpenAIAdapterError("EMPTY_OUTPUT", true);
    const parsed = policyInterpretationSchema.safeParse(response.outputParsed);
    if (
      !parsed.success ||
      parsed.data.sourcePolicyTextHash !== sourcePolicyTextHash
    ) {
      throw new OpenAIAdapterError("MALFORMED_OUTPUT", false);
    }

    return Object.freeze(
      unconfirmedPolicyInterpretationSchema.parse({
        status: "UNCONFIRMED",
        interpretation: parsed.data,
      }),
    );
  }
}
