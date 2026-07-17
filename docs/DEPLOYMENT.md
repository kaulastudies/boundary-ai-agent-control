# Deployment

## Vercel Hobby

1. Import this repository into a Vercel Hobby project.
2. Keep the detected framework as Next.js and the default npm install/build settings.
3. Create an Upstash Redis Free database.
4. Add the server-only environment variables listed below to Vercel Production and Preview.
5. Deploy, then configure /api/health as the external health-check target if desired.

No NEXT_PUBLIC variable is used for Redis or OpenAI credentials.

## Required production session variables

- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

These are the variable names required by the installed official Upstash SDK. Values come from the Upstash database details or Vercel integration and must never be committed or printed.

## Optional live interpretation variables

- OPENAI_API_KEY
- OPENAI_MODEL=gpt-5.6

Demo fixture mode remains the default and does not require OPENAI_API_KEY. Live mode remains unavailable when that key is absent and never silently falls back.

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
