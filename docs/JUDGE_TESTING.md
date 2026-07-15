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
