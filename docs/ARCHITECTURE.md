# BOUNDARY Architecture

## Stage 3 scope

Stage 3 adds bounded GPT-5.6 interpretation and adversarial analysis without changing deterministic execution authority. The model proposes; a human confirms; deterministic code compiles and enforces. The only new route returns an unconfirmed draft.

## OpenAI boundary

Credential and client construction live in `src/adapters/openai/environment.ts` and `client.ts`, both marked `server-only`. Client creation is lazy, so importing schemas and running tests never requires a key. The official wrapper calls:

```text
openai.responses.parse(...)
zodTextFormat(...)
```

No Chat Completions, JSON-mode fallback, provider registry, proxy, gateway, external model, or model tool invocation exists.

The testable `StructuredOutputClient` port accepts the schema, model, prompts, AbortSignal, and schema name. Production implements it with the official SDK; tests implement it with an in-memory fake. Tests and builds make zero live OpenAI requests.

## Interpretation sequence

1. Validate server environment lazily and default the model to `gpt-5.6`.
2. Hash the source policy text locally with SHA-256.
3. Send policy text to `responses.parse` with a strict Zod text format and bounded signal.
4. Reject refusal, empty output, malformed output, and source-hash mismatch.
5. Return `{ status: "UNCONFIRMED", interpretation }`.
6. Require a separate `confirmed: true` input with reviewer, policy identity, name, and version.
7. Deterministic application code maps reviewed proposed rules into an authored policy stamped with source hash and reviewer.
8. Run the authored policy through the existing deterministic compiler.

The interpretation schema has no fields for execution authorization, approvals, human authority, audit execution claims, or tool invocation. Strict parsing rejects extra fields.

## Adversarial analysis sequence

GPT-5.6 may suggest split refunds, nested PII, disguised email, action mutation, approval replay, audit deletion, and unexpected routing. Suggestions remain inert until a human review input selects scenario IDs. Deterministic normalization then creates synthetic proposed-action fixtures and calls only `evaluateAction`.

Reports classify each fixture as:

- `BLOCKED`
- `APPROVAL_REQUIRED`
- `SAFELY_TRANSFORMED`
- `ESCAPED`

The review service does not import simulated tools, approval continuation, or execution orchestration. Escaped scenarios are explicit regression findings, not executed actions.

## Safe error boundary

Application errors expose only a stable code, safe message, and retryable flag. Supported categories are configuration, timeout, abort, refusal, empty output, malformed output, authentication, rate limit, transient provider failure, and unknown provider failure. Provider messages, prompts, stack traces, credentials, and ticket values are discarded.

## Route boundary

`POST /api/policies/interpret`:

- uses the Node.js runtime and is forced dynamic;
- enforces declared and actual UTF-8 request limits;
- accepts one strict `policyText` field;
- returns no-store responses;
- returns only an unconfirmed draft;
- creates no policy, approval, audit execution event, or tool result; and
- maps all failures to safe HTTP responses.

No approval or execution route exists.

## Existing deterministic authority

Stages 2A/2B remain unchanged in authority: block precedence, default deny, re-evaluated redaction/private routing, exact-action approval binding, idempotent continuation, append-only audit, and side-effect-free simulated tools. OpenAI output cannot bypass these layers.

## Deferred decisions

UI workflow, authentication, durable storage, production approval delivery, live tools, real customer data, payments, and email remain deferred.

## Stage 4 — Judge workspace

Stage 4 adds a server-authoritative in-memory demo session in src/application/demo/, exposed through POST /api/demo/workspace. The client component renders safe snapshots and sends commands; it does not compile policies, approve actions, or invoke tools.

Dependency direction: browser workspace → server demo route → demo application session → confirmation/compiler/control flow/adversarial review → domain schemas/deterministic evaluator → in-memory approvals/append-only audit → side-effect-free simulated tools.

The committed demo interpretation uses the same strict unconfirmed schema as the live adapter. Live interpretation still crosses only POST /api/policies/interpret. Both paths require the same independent human confirmation before deterministic compilation. In-memory sessions are intentionally ephemeral and suitable only for the local hackathon demo.
