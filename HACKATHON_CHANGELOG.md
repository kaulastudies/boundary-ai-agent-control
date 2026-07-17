# Hackathon Changelog

## Stage 3 â€” Bounded GPT-5.6 interpretation and adversarial analysis

- Added lazy `server-only` OpenAI environment and client construction with `gpt-5.6` default.
- Added official Responses API Structured Outputs through `responses.parse` and `zodTextFormat`.
- Added a fake Responses client so tests and builds make zero live API requests.
- Added strict non-authoritative policy interpretation and adversarial scenario schemas.
- Added timeout, abort, refusal, empty/malformed output, environment, authentication, rate-limit, transient, and unknown error handling.
- Added an explicit human-confirmation boundary with reviewer, version, and source-hash provenance before deterministic compilation.
- Added reviewed adversarial fixture conversion and explicit escaped-scenario reporting without execution.
- Added only `POST /api/policies/interpret`, which returns an unconfirmed draft and cannot activate or execute anything.

## Stage 2B â€” Deterministic orchestration and golden path

- Added framework-independent orchestration, append-only audit, classification, redaction, private routing, exact approvals, idempotency, and synthetic golden-path execution.

## Stage 2A â€” Deterministic policy engine

- Added strict policy/action/decision schemas, safety precedence, default deny, approval lifecycle, audit events, and guarded simulated tools.

## Stage 1 â€” Repository foundation

- Added the Next.js App Router shell, strict TypeScript/npm toolchain, formatting, linting, testing, documentation, and security guidance.

## Next

Stage 4 will add a local demo UI for interpretation review, explicit human confirmation, deterministic scenario playback, approval resolution, and audit-timeline visualization. It will call only the bounded interpretation route and deterministic local application services; no real tools or customer data will be introduced.

## Stage 4 â€” Judge-ready workspace

- Replaced the static foundation shell with a responsive end-to-end control workspace.
- Added no-key demo interpretation and explicit Live GPT-5.6 mode without silent fallback.
- Added a server-owned, ephemeral demo session and strict command route.
- Added human confirmation, compiled-rule inspection, six synthetic action presets, approval resolution/continuation, adversarial fixtures, and append-only audit visualization.
- Added Stage 4 deterministic workspace coverage; the suite now contains 74 tests.
- Added judge demo and testing guides.

## Stage 5 â€” Deployment and submission hardening

- Added a minimal safe health endpoint.
- Added expiring, bounded, self-cleaning, idempotently initialized local demo sessions.
- Added safe session reset and an explicit UI notice for ephemeral state.
- Added bounded fixed-window throttling and minimal safe 429 responses.
- Added explicit live-mode availability without credential disclosure or fallback.
- Added conservative production response headers.
- Added deployment, threat-model, and submission-checklist documentation.
- Added deterministic health, session lifecycle, throttling, live-unavailable, and safe-error coverage.

## Upstash repository migration

- Added a DemoSessionRepository interface independent of Redis.
- Added a server-only Upstash Redis repository with secure random IDs, TTL, reset, and idempotent initialization.
- Retained a bounded in-memory implementation for local development and deterministic tests.
- Added strict sanitized persisted-session schemas and deterministic rehydration of approval, audit, duplicate-action, and replay state.
- Production now fails closed with a safe 503 when Redis configuration or availability is missing; it never downgrades to memory.
- Added fake-repository and production-selection tests with zero live Redis calls.

## Production deployment recorded

- Deployed BOUNDARY to Vercel Hobby from the GitHub main branch.
- Recorded the judge URL: https://boundary-ai-agent-control.vercel.app.
- Recorded the production health endpoint at /api/health.
- Confirmed documentation presents Demo fixture as the default no-key path and Live GPT-5.6 as optional and server-only.
- Clarified that all actions, refunds, emails, and tools are simulated and that demo sessions may reset after inactivity or deployment replacement.
