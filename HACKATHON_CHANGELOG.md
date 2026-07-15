# Hackathon Changelog

## Stage 2B — Deterministic orchestration and golden path

- Added a framework-independent control-flow service composing compilation, classification, evaluation, transformation, approval, continuation, simulation, and auditing.
- Added an append-only in-memory audit ledger with immutable ordering, correlation queries, and injected IDs/time.
- Added phone/payment removal with category-only auditing and mandatory transformed-action re-evaluation.
- Added private execution-zone routing, transformed-action re-evaluation, and routing-loop prevention.
- Bound approvals to the SHA-256 fingerprint of the exact normalized action and compiled policy version.
- Added expiration, rejection, conflicting-resolution, substituted-action, duplicate-continuation, and duplicate-execution guards.
- Added a synthetic support workflow from ticket read through approved outbound follow-up.
- Added deterministic tests for the complete Stage 2B safety and audit timeline.

## Stage 2A — Deterministic policy engine

- Added strict Zod schemas for policies, rules, actions, decisions, approvals, and audit events.
- Added five deterministic decisions and safety-first precedence with unmatched actions blocked by default.
- Added the synthetic support policy, approval lifecycle, immutable audit events, and guarded simulated tools.

## Stage 1 — Repository foundation

- Scaffolded the Next.js App Router application and strict TypeScript/npm toolchain.
- Added Tailwind CSS, ESLint, Prettier, Zod, Vitest, the static shell, documentation, and security guidance.

## Next

Stage 3 will add a server-only, non-authoritative OpenAI interpretation and adversarial-generation boundary using the official SDK, Responses API, `gpt-5.6`, structured Zod validation, and deterministic regression capture. The deterministic engine will remain the sole execution authority.
