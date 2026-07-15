import "server-only";
import { createOfficialResponsesClient } from "@/adapters/openai/client";
import { PolicyInterpretationAdapter } from "@/adapters/openai/policy-interpretation-adapter";
import { handleInterpretPolicyRequest } from "@/application/http/interpret-policy-request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleInterpretPolicyRequest(request, () => {
    const { client, model } = createOfficialResponsesClient();
    return new PolicyInterpretationAdapter(client, model);
  });
}
