# Hackathon Changelog

<!-- boundary-doc-nav:start -->

> **Project documentation** · [Overview](./README.md) · [Docs index](./docs/README.md) · [Architecture](./docs/ARCHITECTURE.md) · [Judge testing](./docs/JUDGE_TESTING.md) · [Deployment](./docs/DEPLOYMENT.md)

<!-- boundary-doc-nav:end -->

---

## Submission polish and final public mode

- Reworked the README into a judge-ready project page with badges, architecture, testing evidence, security boundaries, tracked team tasks, and direct navigation.
- Added GitHub labels, a post-submission milestone, and four scoped QA/documentation issues for Naboth Daniel without representing unfinished work as completed.
- Added a documentation index, consistent navigation, an automated Markdown/link audit, and an MIT license.
- Verified 89 automated tests, ESLint, strict TypeScript, production build, Redis-backed session creation, session reset, and the public health route.
- Confirmed that ChatGPT/Codex credits and API billing are separate. The public deployment intentionally keeps Live GPT-5.6 unavailable because no funded API quota is attached.
- Preserved the complete no-key Demo fixture path for judging. No OpenAI credential is committed, exposed to the browser, placed in documentation, or stored in Git.

## Vercel KV compatibility patch

- Added support for `KV_REST_API_URL` and `KV_REST_API_TOKEN` while retaining preferred Upstash variable names.
- Kept deterministic fail-closed behavior when no complete Redis credential pair exists.
- Added deterministic selection coverage and redeployed the verified production application.

## Production deployment

- Deployed BOUNDARY to Vercel Hobby from the GitHub `main` branch.
- Recorded the judge URL: https://boundary-ai-agent-control.vercel.app.
- Recorded the production health endpoint: https://boundary-ai-agent-control.vercel.app/api/health.
- Confirmed that Demo fixture is the default no-key path and all actions, refunds, emails, approvals, and tools are synthetic or simulated.

## Upstash repository migration

- Added a `DemoSessionRepository` interface independent of Redis.
- Added a server-only Upstash Redis repository with secure random IDs, TTL, reset, and idempotent initialization.
- Retained a bounded in-memory implementation for local development and deterministic tests.
- Added strict sanitized persisted-session schemas and deterministic rehydration of approval, audit, duplicate-action, and replay state.
- Production fails closed with a safe 503 when Redis configuration or availability is missing; it never downgrades to memory.
- Added fake-repository and production-selection tests with zero live Redis calls.

## Stage 5 — Deployment and submission hardening

- Added a minimal safe health endpoint.
- Added expiring, bounded, self-cleaning, idempotently initialized local demo sessions.
- Added safe session reset and an explicit UI notice for ephemeral state.
- Added bounded fixed-window throttling and minimal safe 429 responses.
- Added explicit live-mode availability without credential disclosure or fallback.
- Added conservative production response headers.
- Added deployment, threat-model, and submission-checklist documentation.
- Added deterministic health, session lifecycle, throttling, live-unavailable, and safe-error coverage.

## Stage 4 — Judge-ready workspace

- Replaced the static foundation shell with a responsive end-to-end control workspace.
- Added no-key demo interpretation and explicit Live GPT-5.6 mode without silent fallback.
- Added a server-owned, ephemeral demo session and strict command route.
- Added human confirmation, compiled-rule inspection, six synthetic action presets, approval resolution/continuation, adversarial fixtures, and append-only audit visualization.
- Added judge demo and testing guides.

## Stage 3 — Bounded GPT-5.6 interpretation and adversarial analysis

- Added lazy `server-only` OpenAI environment and client construction with `gpt-5.6` as the default model.
- Added official Responses API Structured Outputs through `responses.parse` and `zodTextFormat`.
- Added a fake Responses client so tests and builds make zero live API requests.
- Added strict non-authoritative policy interpretation and adversarial scenario schemas.
- Added timeout, abort, refusal, empty/malformed output, environment, authentication, rate-limit, transient, and unknown error handling.
- Added an explicit human-confirmation boundary with reviewer, version, and source-hash provenance before deterministic compilation.
- Added reviewed adversarial fixture conversion and explicit escaped-scenario reporting without execution.
- Added `POST /api/policies/interpret`, which returns an unconfirmed draft and cannot activate or execute anything.

## Stage 2B — Deterministic orchestration and golden path

- Added framework-independent orchestration, append-only audit, classification, redaction, private routing, exact approvals, idempotency, and synthetic golden-path execution.

## Stage 2A — Deterministic policy engine

- Added strict policy/action/decision schemas, safety precedence, default deny, approval lifecycle, audit events, and guarded simulated tools.

## Stage 1 — Repository foundation

- Added the Next.js App Router shell, strict TypeScript/npm toolchain, formatting, linting, testing, documentation, and security guidance.

<!-- boundary-doc-footer:start -->

---

[Project overview](./README.md) · [Documentation index](./docs/README.md) · [Live demo](https://boundary-ai-agent-control.vercel.app)
<!-- boundary-doc-footer:end -->
