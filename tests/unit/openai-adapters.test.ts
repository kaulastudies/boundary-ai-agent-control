import { describe, expect, it } from "vitest";
import { PolicyInterpretationAdapter } from "@/adapters/openai/policy-interpretation-adapter";
import { hashSourceText } from "@/adapters/openai/source-hash";
import {
  OpenAIAdapterError,
  normalizeProviderError,
} from "@/adapters/openai/errors";
import { parseOpenAIEnvironment } from "@/adapters/openai/environment-schema";
import { policyInterpretationSchema } from "@/domain/interpretation/schemas";
import { FakeStructuredOutputClient } from "@/../tests/fakes/fake-structured-output-client";

const policyText = "Refunds above INR 5000 need approval.";

function validInterpretation(clarificationQuestions: string[] = []) {
  return {
    summary: "Refund approval policy proposal",
    assumptions: ["Amounts are expressed in INR"],
    clarificationQuestions,
    proposedRules: [
      {
        actionType: "ISSUE_REFUND" as const,
        conditions: ["amountInr > 5000"],
        outcome: "REQUIRE_APPROVAL" as const,
        redactionCategories: [],
        executionZone: "STANDARD" as const,
        approvalThresholdInr: 5_000,
        rationale: "Human approval is required above the threshold",
      },
    ],
    warnings: [],
    confidence: 0.9,
    sourcePolicyTextHash: hashSourceText(policyText),
  };
}

describe("PolicyInterpretationAdapter", () => {
  it("returns a valid unconfirmed interpretation", async () => {
    const fake = FakeStructuredOutputClient.returning(validInterpretation());
    const result = await new PolicyInterpretationAdapter(fake).interpret(
      policyText,
    );
    expect(result.status).toBe("UNCONFIRMED");
    expect(result.interpretation.summary).toContain("Refund");
    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0]?.model).toBe("gpt-5.6");
  });

  it("preserves explicit clarification questions", async () => {
    const fake = FakeStructuredOutputClient.returning(
      validInterpretation(["Does the threshold include tax?"]),
    );
    const result = await new PolicyInterpretationAdapter(fake).interpret(
      policyText,
    );
    expect(result.interpretation.clarificationQuestions).toEqual([
      "Does the threshold include tax?",
    ]);
  });

  it("returns a safe refusal error", async () => {
    const fake = FakeStructuredOutputClient.returning(
      null,
      "provider refusal details",
    );
    await expect(
      new PolicyInterpretationAdapter(fake).interpret(policyText),
    ).rejects.toMatchObject({
      code: "REFUSAL",
      message: "The model declined to produce the requested analysis.",
    });
  });

  it("rejects empty structured output", async () => {
    const fake = FakeStructuredOutputClient.returning(null);
    await expect(
      new PolicyInterpretationAdapter(fake).interpret(policyText),
    ).rejects.toMatchObject({
      code: "EMPTY_OUTPUT",
    });
  });

  it("rejects malformed structured output", async () => {
    const fake = FakeStructuredOutputClient.returning({
      summary: "incomplete",
    });
    await expect(
      new PolicyInterpretationAdapter(fake).interpret(policyText),
    ).rejects.toMatchObject({
      code: "MALFORMED_OUTPUT",
    });
  });

  it("times out a hanging request", async () => {
    const fake = FakeStructuredOutputClient.waitingForAbort();
    await expect(
      new PolicyInterpretationAdapter(fake, "gpt-5.6", 5).interpret(policyText),
    ).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("honors caller abort", async () => {
    const fake = FakeStructuredOutputClient.waitingForAbort();
    const controller = new AbortController();
    const promise = new PolicyInterpretationAdapter(
      fake,
      "gpt-5.6",
      1_000,
    ).interpret(policyText, controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: "ABORTED" });
  });
});

describe("safe OpenAI configuration and provider errors", () => {
  it("rejects invalid model configuration", () => {
    expect(() =>
      parseOpenAIEnvironment({
        OPENAI_API_KEY: "synthetic-test-key",
        OPENAI_MODEL: "",
      }),
    ).toThrowError("The policy interpretation service is not configured.");
  });

  it("rejects a missing API key without exposing environment contents", () => {
    expect(() =>
      parseOpenAIEnvironment({ OPENAI_MODEL: "gpt-5.6" }),
    ).toThrowError("The policy interpretation service is not configured.");
  });

  it.each([
    [401, "AUTHENTICATION", false],
    [429, "RATE_LIMIT", true],
    [503, "TRANSIENT_PROVIDER", true],
    [418, "UNKNOWN_PROVIDER", false],
  ])("normalizes provider status %s", (status, code, retryable) => {
    expect(
      normalizeProviderError({ status, message: "unsafe provider detail" }),
    ).toMatchObject({
      code,
      retryable,
    });
  });

  it("never returns API keys, prompts, or sensitive values in errors", async () => {
    const secret = "sk-build-week-secret";
    const sensitive = "SENSITIVE-TICKET-PHONE";
    const fake = FakeStructuredOutputClient.failing(
      new Error(`${secret} ${sensitive} ${policyText}`),
    );
    let caught: unknown;
    try {
      await new PolicyInterpretationAdapter(fake).interpret(policyText);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(OpenAIAdapterError);
    const safe = JSON.stringify((caught as OpenAIAdapterError).toSafeJSON());
    expect(safe).not.toContain(secret);
    expect(safe).not.toContain(sensitive);
    expect(safe).not.toContain(policyText);
  });

  it("strict schemas reject execution authorization fields", () => {
    expect(() =>
      policyInterpretationSchema.parse({
        ...validInterpretation(),
        executionAuthorization: true,
      }),
    ).toThrow();
  });
});
