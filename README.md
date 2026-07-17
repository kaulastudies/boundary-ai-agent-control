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

- `src/adapters/openai/` â€” server environment/client, Responses Structured Outputs, provider ports, timeouts, and safe errors.
- `src/domain/interpretation/` â€” non-authoritative interpretation schema.
- `src/domain/adversarial/` â€” adversarial suggestion/review schemas.
- `src/domain/confirmation/` â€” explicit human-confirmation input.
- `src/application/confirmation/` â€” human-only conversion into compiled deterministic policy.
- `src/application/adversarial/` â€” reviewed fixture normalization and enforcement reporting without execution.
- `src/application/http/` â€” safe interpretation request handler.
- `src/application/control-flow/` â€” deterministic orchestration and idempotency.
- `src/app/api/policies/interpret/` â€” the sole Stage 3 route.
- `tests/fakes/` â€” fake Responses client; no network access.

## Provider and secret restrictions

Use only the official OpenAI SDK and Responses API. Do not add Chat Completions, LLM7, external providers, custom proxies, localhost gateways, or compatible endpoint shims. `OPENAI_API_KEY` is read only in a `server-only` module and is never returned, logged, serialized, or exposed to client components.

## Stage 4 â€” Judge-ready demo workspace

The root page is now a complete BOUNDARY demonstration. It supports a committed synthetic interpretation fixture with no API key, plus an explicit Live GPT-5.6 mode that calls the existing server-only Responses API route. Live failures are shown as failures and never fall back silently.

The browser is a request and presentation surface only. POST /api/demo/workspace owns the server-side demo session and composes human confirmation, deterministic compilation, action evaluation, redaction/private routing, approval continuation, simulated tools, adversarial fixture review, and the append-only audit ledger.

Quick demo:

1. Keep Demo fixture selected and choose Interpret policy.
2. Review the UNCONFIRMED proposal.
3. Enter a reviewer, check the confirmation statement, and compile.
4. Try the redaction/private-routing presets and the blocked audit deletion.
5. Submit a â‚¹7,500 refund, approve it, then continue the exact action.
6. Run adversarial analysis and inspect the ordered audit timeline.

Only synthetic data and simulated tools are used. Tests make zero live OpenAI requests.

## Stage 5 â€” Deployment and submission hardening

BOUNDARY is deployment-ready as a single Next.js Node application. The public demo uses the session-repository boundary: bounded memory for local development and deterministic tests, and Upstash Redis with TTL for production serverless deployment. It preserves idempotent initialization, safe reset, replay protection, bounded request throttling, safe response headers, and a minimal health route.

Demo fixture mode remains the default and requires no environment variables. Live GPT-5.6 is disabled in the UI when the server has no OPENAI_API_KEY. Live failures never fall back to the fixture.

Production endpoints:

- GET /api/health returns only {"status":"ok"}.
- GET /api/policies/interpret returns only live availability.
- POST /api/policies/interpret performs bounded server-only interpretation.
- POST /api/demo/workspace operates the ephemeral deterministic demo session.

See docs/DEPLOYMENT.md, docs/THREAT_MODEL.md, and docs/SUBMISSION_CHECKLIST.md before submission.

## Vercel Hobby deployment

Production demo sessions require the official Upstash Redis SDK and its server-only REST variables. Missing or unavailable Redis returns a safe temporary-unavailable response. Demo fixture interpretation still requires no OpenAI key.

## Production deployment

BOUNDARY is deployed at [https://boundary-ai-agent-control.vercel.app](https://boundary-ai-agent-control.vercel.app) on Vercel Hobby, connected to the GitHub main branch.

Demo fixture mode is the default and requires no OpenAI API key. Live GPT-5.6 mode is optional and remains server-only. The production health endpoint is [https://boundary-ai-agent-control.vercel.app/api/health](https://boundary-ai-agent-control.vercel.app/api/health).

All actions, refunds, emails, approvals, and tools are synthetic or simulated. Demo sessions are ephemeral and may reset after inactivity or deployment replacement.
