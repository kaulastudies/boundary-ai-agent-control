# Hackathon Changelog

## Stage 2A — Deterministic policy engine

- Added strict Zod schemas for policies, rules, actions, decisions, approvals, and audit events.
- Added five deterministic decisions: `ALLOW`, `REDACT_AND_ALLOW`, `ROUTE_PRIVATELY`, `REQUIRE_APPROVAL`, and `BLOCK`.
- Added safety-first precedence with explicit block rules first and unmatched actions blocked by default.
- Added the synthetic support policy: ₹5,000 refund threshold, cloud PII redaction, private transcript routing, external-email approval, and prohibited-action blocking.
- Added an in-memory approval lifecycle with immutable pending, approved, rejected, and expired snapshots.
- Added immutable audit-event construction for compilation, evaluation, approvals, and simulated execution.
- Added guarded, side-effect-free ticket, refund, and email simulations.
- Added comprehensive deterministic unit coverage with no network, database, provider, payment, or email dependency.

## Stage 1 — Repository foundation

- Scaffolded a Next.js App Router application directly at the repository root.
- Enabled strict TypeScript, Tailwind CSS, ESLint, Prettier, and Vitest.
- Added Zod and the official OpenAI JavaScript SDK as foundation dependencies.
- Added a polished, static BOUNDARY application shell with no model calls or policy engine behavior.
- Documented architecture boundaries, collaboration practices, environment variables, and verification commands.
- Added a smoke test for the test runner.

## Next

Stage 2B will compose the control modules into one deterministic application service and golden-path scenario with an in-memory audit ledger, concrete redaction/private-routing transformations, approval continuation, and end-to-end tests. OpenAI and UI integration remain deferred.
