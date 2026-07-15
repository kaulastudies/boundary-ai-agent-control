# BOUNDARY

BOUNDARY is an OpenAI Build Week project for making agent behavior explicit, enforceable, and auditable. Stage 2A provides a framework-independent, deterministic policy engine beneath the existing Next.js application shell.

## Current capabilities

- strict Zod schemas for authored and compiled policies, normalized rules, proposed actions, enforcement decisions, approvals, and audit events
- deterministic `ALLOW`, `REDACT_AND_ALLOW`, `ROUTE_PRIVATELY`, `REQUIRE_APPROVAL`, and `BLOCK` decisions
- explicit-block precedence and default-deny behavior
- a support policy with a ₹5,000 refund threshold, cloud PII redaction, private transcript routing, external-email approval, and prohibited-action blocking
- in-memory pending, approved, rejected, and expired approval states
- immutable audit events for compilation, evaluation, approval, and simulated execution
- side-effect-free ticket-read, refund, and email simulations

No Stage 2A module calls OpenAI or any network, database, payment system, or email provider. Model output cannot authorize execution; only deterministic `ALLOW` decisions or a matching approved human request can pass the simulated execution guard.

## Stack

- Next.js App Router and React
- strict TypeScript
- Tailwind CSS
- Zod for runtime schemas
- Vitest for unit tests
- the official OpenAI JavaScript SDK, reserved for a future server-only adapter
- npm as the only package manager

Future model-backed policy interpretation and adversarial scenario generation will use the OpenAI Responses API with `gpt-5.6`. No model request exists yet.

## Setup

Use Node.js 20.9 or newer and the npm version declared in `package.json`.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` only in `.env.local` or an approved secret manager. Never commit populated environment files. The current application and policy engine do not require a key.

## Commands

```text
npm run dev          # start the development server
npm run format       # format repository files
npm run format:check # verify formatting
npm run lint         # run ESLint
npm run typecheck    # run strict TypeScript checks
npm test             # run deterministic unit tests once
npm run test:watch   # run unit tests in watch mode
npm run build        # create a production build
npm start            # serve a production build
```

## Repository map

- `src/domain/policy/` — policy, rule, and decision vocabularies.
- `src/domain/enforcement/` — proposed-action schemas and the pure evaluator.
- `src/domain/approvals/` — approval lifecycle schema.
- `src/domain/audit/` — immutable audit-event schemas and construction.
- `src/application/policy-compiler/` — authored-policy normalization.
- `src/application/approvals/` — deterministic in-memory approval lifecycle.
- `src/adapters/tools/simulated/` — guarded, side-effect-free tool simulations.
- `src/fixtures/` — synthetic support-case policy data.
- `src/app/` — unchanged Next.js App Router shell.
- `tests/unit/` — deterministic control-core tests.
- `docs/ARCHITECTURE.md` — module boundaries, precedence, and dependency rules.

## Provider and security boundary

BOUNDARY uses only OpenAI's supported APIs through the official SDK when model integration is added. Do not add LLM7, external model providers, custom proxies, localhost model gateways, or OpenAI-compatible endpoint shims. Future model calls belong in server-only adapters and must use the Responses API.
