# BOUNDARY

BOUNDARY is an OpenAI Build Week project for making agent behavior explicit, enforceable, and auditable. GPT-5.6 may interpret policy text and propose adversarial scenarios, but humans confirm policies and deterministic code remains the sole authority for compilation, approval, and simulated execution.

## Authority boundary

1. GPT-5.6 returns a strict, non-authoritative interpretation draft through the OpenAI Responses API.
2. A human separately confirms the draft and supplies reviewer identity, policy identity, and version.
3. Deterministic code creates the human-authored policy and compiles normalized rules.
4. The deterministic engine evaluates actions, requires approvals, transforms sensitive actions, and blocks unmatched risk.
5. Only side-effect-free simulated tools execute in this demo.

Model output cannot authorize execution, approve a request, claim human authority, write audit events, or invoke a tool.

## Current capabilities

- strict Zod Structured Outputs using `openai.responses.parse(...)` and `zodTextFormat(...)`
- lazy, server-only OpenAI environment and client construction
- default model `gpt-5.6`
- bounded timeout and caller abort support
- safe normalized errors for configuration, timeout, abort, refusal, empty/malformed output, authentication, rate limits, transient failures, and unknown failures
- explicit unconfirmed interpretation and human-confirmation contracts
- reviewed adversarial suggestions converted into deterministic, non-executing fixtures
- escaped-scenario reporting for gaps such as split refunds
- the existing deterministic orchestration, approval, transformation, audit, and simulated-tool core

Tests use a fake Responses client and make zero live OpenAI requests.

## Stack

- Next.js App Router and React
- strict TypeScript and Tailwind CSS
- Zod and Vitest
- official OpenAI JavaScript SDK and Responses API only
- npm as the only package manager

## Setup

Use Node.js 20.9 or newer. The deterministic application and test suite do not require a key. To call the interpretation route manually, copy `.env.example` to an ignored `.env.local` and supply a real key locally without committing it.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

## Commands

```text
npm run dev
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Server route

`POST /api/policies/interpret` accepts:

```json
{ "policyText": "Refunds above INR 5000 require approval." }
```

The route is dynamic, Node.js-only, request-size bounded, server-side, and non-caching. It returns an `UNCONFIRMED` interpretation draft. It never confirms or activates a policy, evaluates an action, creates an approval, or executes a tool. Errors contain safe codes/messages only.

## Repository map

- `src/adapters/openai/` — server environment/client, Responses Structured Outputs, provider ports, timeouts, and safe errors.
- `src/domain/interpretation/` — non-authoritative interpretation schema.
- `src/domain/adversarial/` — adversarial suggestion/review schemas.
- `src/domain/confirmation/` — explicit human-confirmation input.
- `src/application/confirmation/` — human-only conversion into compiled deterministic policy.
- `src/application/adversarial/` — reviewed fixture normalization and enforcement reporting without execution.
- `src/application/http/` — safe interpretation request handler.
- `src/application/control-flow/` — deterministic orchestration and idempotency.
- `src/app/api/policies/interpret/` — the sole Stage 3 route.
- `tests/fakes/` — fake Responses client; no network access.

## Provider and secret restrictions

Use only the official OpenAI SDK and Responses API. Do not add Chat Completions, LLM7, external providers, custom proxies, localhost gateways, or compatible endpoint shims. `OPENAI_API_KEY` is read only in a `server-only` module and is never returned, logged, serialized, or exposed to client components.
