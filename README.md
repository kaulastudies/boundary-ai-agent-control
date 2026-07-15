# BOUNDARY

BOUNDARY is an OpenAI Build Week project for making agent behavior explicit, enforceable, and auditable. Stage 2B completes a framework-independent deterministic golden path beneath the unchanged Next.js application shell.

## Current capabilities

- strict Zod schemas for policies, rules, actions, decisions, approvals, and audit events
- deterministic `ALLOW`, `REDACT_AND_ALLOW`, `ROUTE_PRIVATELY`, `REQUIRE_APPROVAL`, and `BLOCK` decisions
- explicit-block precedence and default-deny behavior
- deterministic support-context classification
- removal of classified phone and payment fields before cloud-bound simulation, followed by re-evaluation
- private-zone transformation and re-evaluation with routing-loop prevention
- exact-action, policy-version-bound approval continuation
- idempotent evaluation, approval creation/resolution, continuation, and simulated execution
- an append-only, queryable in-memory audit ledger with injected IDs and clocks
- a complete synthetic ticket-to-follow-up workflow using side-effect-free tools only

No current module calls OpenAI or any network, database, payment system, or email provider. Model output cannot authorize execution; only deterministic allow decisions or a matching approved human request can pass the simulated execution guard.

## Stack

- Next.js App Router and React
- strict TypeScript
- Tailwind CSS
- Zod for runtime schemas
- Vitest for deterministic tests
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
npm test             # run deterministic tests once
npm run test:watch   # run tests in watch mode
npm run build        # create a production build
npm start            # serve a production build
```

## Repository map

- `src/domain/` — policies, actions, decisions, approvals, and immutable audit-event contracts.
- `src/application/policy-compiler/` — human-authored policy normalization.
- `src/application/approvals/` — exact-action-bound in-memory approval lifecycle.
- `src/application/audit/` — append-only ordered in-memory audit ledger.
- `src/application/control-flow/` — classification, transformations, fingerprints, orchestration, and idempotency.
- `src/adapters/tools/simulated/` — guarded, side-effect-free ticket, refund, and email simulations.
- `src/fixtures/` — synthetic support-case policy data.
- `src/app/` — unchanged Next.js App Router shell.
- `tests/unit/` — deterministic domain and orchestration tests.
- `docs/ARCHITECTURE.md` — module boundaries, state transitions, and dependency rules.

## Provider and security boundary

BOUNDARY will use only OpenAI's supported APIs through the official SDK when model integration is explicitly added. Do not add LLM7, external model providers, custom proxies, localhost model gateways, or OpenAI-compatible endpoint shims. Future model calls belong in server-only adapters and must use the Responses API.
