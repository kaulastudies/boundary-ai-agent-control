# Deployment

<!-- boundary-doc-nav:start -->

> **BOUNDARY documentation** · [Overview](../README.md) · [Docs index](./README.md) · [Architecture](./ARCHITECTURE.md) · [Demo](./DEMO_SCRIPT.md) · [Judge testing](./JUDGE_TESTING.md) · [Deployment](./DEPLOYMENT.md) · [Threat model](./THREAT_MODEL.md)

<!-- boundary-doc-nav:end -->

---

## Vercel Hobby

1. Import this repository into a Vercel Hobby project.
2. Keep the detected framework as Next.js and the default npm install/build settings.
3. Create an Upstash Redis Free database.
4. Add the server-only environment variables listed below to Vercel Production and Preview.
5. Deploy, then configure /api/health as the external health-check target if desired.

No NEXT_PUBLIC variable is used for Redis or OpenAI credentials.

## Required production session variables

BOUNDARY accepts either of these server-only credential pairs:

Preferred Upstash names:

- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

Vercel legacy KV aliases:

- KV_REST_API_URL
- KV_REST_API_TOKEN

The Upstash names take precedence when both pairs are present. The application never copies, prints, or exposes the credential values. Existing Vercel KV integrations therefore work without duplicating secrets.

## Optional live interpretation variables

- OPENAI_API_KEY
- OPENAI_MODEL=gpt-5.6

Demo fixture mode remains the default and does not require OPENAI_API_KEY. Live mode remains unavailable when that key is absent and never silently falls back.

## Current public judge mode

The production deployment intentionally omits `OPENAI_API_KEY` because no funded API quota is attached. Demo fixture remains the complete primary judge path, and Live GPT-5.6 reports unavailable instead of repeatedly returning provider quota errors. Keep `OPENAI_MODEL=gpt-5.6` as non-sensitive configuration if desired. Do not add a key unless the associated API project has usable billing or promotional API quota.

## Persistence behavior

Production uses Upstash Redis only. Sessions use secure random identifiers and a 30-minute TTL that refreshes on access. Reset creates a new empty session. If Redis configuration is missing or Upstash is unavailable, the API returns a safe temporary-unavailable response; production never falls back to process memory.

Redis stores only a validated demo-session schema: compiled policy, sanitized synthetic action snapshots, approval metadata, safe audit events, and bounded replay metadata. It does not store provider prompts, unconfirmed drafts, original phone/payment values, credentials, keys, or stack traces.

Local development and tests use the bounded in-memory repository when NODE_ENV is not production.

## Vercel checks

1. GET /api/health returns only {"status":"ok"}.
2. The root page loads with Demo fixture selected.
3. Interpret, confirm, refresh, and continue the exact approved action.
4. Duplicate continuation creates no second execution event.
5. Reset creates a clean session.
6. Removing either Upstash variable produces only the safe temporary-unavailable message.
7. Live mode is disabled without OPENAI_API_KEY.

## Current production deployment

- Platform: Vercel Hobby
- Source: GitHub main branch
- Judge URL: https://boundary-ai-agent-control.vercel.app
- Health endpoint: https://boundary-ai-agent-control.vercel.app/api/health

Demo fixture mode is the default and requires no OpenAI API key. Live GPT-5.6 mode is optional, uses only server-side environment configuration, and never silently falls back.

All demonstrated actions, refunds, emails, and tools are simulated. Demo session state is ephemeral and may expire after inactivity or reset during a deployment replacement.

<!-- boundary-doc-footer:start -->

---

[Documentation index](./README.md) · [Live demo](https://boundary-ai-agent-control.vercel.app) · [Repository](https://github.com/kaulastudies/boundary-ai-agent-control)
<!-- boundary-doc-footer:end -->
