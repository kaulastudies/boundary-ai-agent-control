# BOUNDARY Architecture

<!-- boundary-doc-nav:start -->

> **BOUNDARY documentation** · [Overview](../README.md) · [Docs index](./README.md) · [Architecture](./ARCHITECTURE.md) · [Demo](./DEMO_SCRIPT.md) · [Judge testing](./JUDGE_TESTING.md) · [Deployment](./DEPLOYMENT.md) · [Threat model](./THREAT_MODEL.md)

<!-- boundary-doc-nav:end -->

---

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

Enterprise authentication, durable compliance storage, production approval delivery, aggregate transaction controls, real tools, real customer data, payments, and email remain deferred.

## Stage 4 — Judge workspace

Stage 4 adds a server-authoritative demo session in src/application/demo/, exposed through POST /api/demo/workspace. The client component renders safe snapshots and sends commands; it does not compile policies, approve actions, or invoke tools.

Dependency direction: browser workspace → server demo route → demo application session → confirmation/compiler/control flow/adversarial review → domain schemas/deterministic evaluator → in-memory approvals/append-only audit → side-effect-free simulated tools.

The committed demo interpretation uses the same strict unconfirmed schema as the live adapter. Live interpretation still crosses only POST /api/policies/interpret. Both paths require the same independent human confirmation before deterministic compilation. The session service is independent of its persistence adapter.

## Stage 5 deployment boundary

The DemoSessionRepository interface separates application orchestration from storage. Production uses the server-only Upstash Redis adapter with secure random IDs and a 30-minute TTL. Local development and tests use the bounded in-memory repository. Stable browser tokens make INIT idempotent, and RESET replaces stored state. Production never falls back to memory when Redis is missing or unavailable.

Fixed-window in-memory limiters bound demo workspace and live interpretation requests. They store only counters and reset times keyed by the forwarded request address; policy text and action payloads are never used as limiter keys. Next.js applies conservative response headers without a Content Security Policy. GET /api/health returns no dependency, configuration, credential, or memory details.

## Current public provider mode

The production deployment intentionally omits `OPENAI_API_KEY` because no funded API quota is attached. `GET /api/policies/interpret` therefore returns `{ "available": false }`, and the browser keeps Live GPT-5.6 disabled. The committed Demo fixture uses the same strict unconfirmed contract and preserves the full human-confirmation and deterministic-enforcement path.

## Vercel Hobby and Upstash session persistence

The demo route now depends on DemoSessionRepository rather than Redis or process state. Persisted state is a strict versioned schema containing the compiled policy, sanitized action snapshots, approval metadata, safe audit events, and a bounded synthetic operation history used to reconstruct idempotency and replay protection. Unconfirmed interpretation drafts remain in the browser response and are supplied only to the confirmation request; they are not persisted.

The Upstash adapter hashes browser initialization tokens, uses cryptographically random session IDs, applies Redis TTL to session and idempotency keys, and refreshes expiry on access. Adapter failures become one safe temporary-unavailable response. The local adapter remains bounded and deterministic.

<!-- boundary-doc-footer:start -->

---

[Documentation index](./README.md) · [Live demo](https://boundary-ai-agent-control.vercel.app) · [Repository](https://github.com/kaulastudies/boundary-ai-agent-control)
<!-- boundary-doc-footer:end -->
