import { describe, expect, it } from "vitest";
import { handleInterpretPolicyRequest } from "@/application/http/interpret-policy-request";
import { OpenAIAdapterError } from "@/adapters/openai/errors";
import { unconfirmedPolicyInterpretationSchema } from "@/domain/interpretation/schemas";

const draft = unconfirmedPolicyInterpretationSchema.parse({
  status: "UNCONFIRMED",
  interpretation: {
    summary: "Synthetic interpretation",
    assumptions: [],
    clarificationQuestions: [],
    proposedRules: [],
    warnings: [],
    confidence: 0.5,
    sourcePolicyTextHash: "e".repeat(64),
  },
});

describe("POST /api/policies/interpret handler", () => {
  it("returns only an unconfirmed draft", async () => {
    let calls = 0;
    const response = await handleInterpretPolicyRequest(
      new Request("http://example.test/api/policies/interpret", {
        method: "POST",
        body: JSON.stringify({ policyText: "Synthetic policy" }),
      }),
      () => ({
        interpret: async () => {
          calls += 1;
          return draft;
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(draft);
    expect(calls).toBe(1);
    expect(JSON.stringify(draft)).not.toContain("compiledPolicy");
  });

  it("rejects oversized requests before interpretation", async () => {
    let calls = 0;
    const response = await handleInterpretPolicyRequest(
      new Request("http://example.test/api/policies/interpret", {
        method: "POST",
        body: JSON.stringify({ policyText: "x".repeat(17_000) }),
      }),
      () => ({
        interpret: async () => {
          calls += 1;
          return draft;
        },
      }),
    );
    expect(response.status).toBe(413);
    expect(calls).toBe(0);
  });

  it("rejects malformed input without interpretation", async () => {
    const response = await handleInterpretPolicyRequest(
      new Request("http://example.test/api/policies/interpret", {
        method: "POST",
        body: JSON.stringify({ policyText: "" }),
      }),
      () => ({ interpret: async () => draft }),
    );
    expect(response.status).toBe(400);
  });

  it("returns safe provider errors without sensitive request content", async () => {
    const sensitive = "SENSITIVE-POLICY-VALUE";
    const response = await handleInterpretPolicyRequest(
      new Request("http://example.test/api/policies/interpret", {
        method: "POST",
        body: JSON.stringify({ policyText: sensitive }),
      }),
      () => ({
        interpret: async () => {
          throw new OpenAIAdapterError("AUTHENTICATION", false);
        },
      }),
    );
    const body = JSON.stringify(await response.json());
    expect(response.status).toBe(503);
    expect(body).not.toContain(sensitive);
    expect(body).not.toContain("OPENAI_API_KEY");
  });
});
