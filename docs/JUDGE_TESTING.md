# Judge Testing Guide

## No-key path

No environment file or key is required. Run npm run dev, open the root page, and follow docs/DEMO_SCRIPT.md with Demo fixture selected.

Verify:

- interpretation is visibly UNCONFIRMED;
- confirmation is required before compiled policy or action presets become active;
- ₹2,500 refund executes through the simulated refund tool;
- ₹7,500 refund and external email pause for approval;
- rejected and expired approvals cannot continue;
- cloud phone/payment context is redacted before re-evaluation;
- support transcripts route privately before re-evaluation;
- audit deletion is blocked;
- adversarial scenarios report outcomes but do not execute;
- audit events remain ordered and append-only.

## Live path

Configure OPENAI_API_KEY only in the server runtime and optionally set OPENAI_MODEL (default gpt-5.6). Select Live GPT-5.6. The response remains unconfirmed and cannot activate policy without the separate reviewer step.

## Verification commands

Run npm run format, npm run lint, npm test, npm run typecheck, npm run build, and git diff --check. Tests and builds use fake clients and make zero live OpenAI requests.

## Deployment hardening checks

- Confirm the ephemeral-session notice and Reset session control are visible.
- Confirm duplicate page initialization reuses one session.
- Confirm inactive sessions expire and capacity is bounded.
- Confirm throttled requests return HTTP 429 with only a retry message and Retry-After.
- Confirm Live GPT-5.6 is disabled without OPENAI_API_KEY and Demo fixture remains usable.
- Confirm GET /api/health returns only {"status":"ok"}.
- Confirm safe headers include nosniff, no-referrer, DENY framing, limited browser permissions, and same-origin opener policy.
- Confirm a process restart clears demo state as documented.

## Vercel persistence verification

- Production without both Upstash variables must return a safe temporary-unavailable response; it must not fall back to process memory.
- Confirm Redis records contain no unconfirmed policy draft, provider prompt, credential, original phone value, original payment value, or stack trace.
- Confirm a restored approved action executes once and duplicate continuation produces no second simulated execution.
- Confirm tests use the fake or bounded in-memory repository and make zero Upstash requests.

## Production judge URL

Run the judge workflow at https://boundary-ai-agent-control.vercel.app. Confirm https://boundary-ai-agent-control.vercel.app/api/health returns only the safe health status before testing.

Use Demo fixture mode for the primary no-key path. Live GPT-5.6 is optional and server-only. Treat every ticket, action, refund, email, approval, and tool result as synthetic or simulated. If the session expires after inactivity or a deployment replacement, refresh and start a new demo session.
