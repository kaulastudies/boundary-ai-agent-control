# Submission Checklist

<!-- boundary-doc-nav:start -->

> **BOUNDARY documentation** · [Overview](../README.md) · [Docs index](./README.md) · [Architecture](./ARCHITECTURE.md) · [Demo](./DEMO_SCRIPT.md) · [Judge testing](./JUDGE_TESTING.md) · [Deployment](./DEPLOYMENT.md) · [Threat model](./THREAT_MODEL.md)

<!-- boundary-doc-nav:end -->

---

## Repository and secrets

- [x] npm and `package-lock.json` are the only package-manager artifacts.
- [x] `.env.example` contains only approved empty/default variable names.
- [x] No real `.env` file, Redis token, OpenAI key, customer data, or raw credential is tracked.
- [x] Redis and OpenAI variables are absent from client components and rendered output.
- [x] No LLM7, custom proxy, localhost model gateway, Chat Completions, or external model provider exists.
- [x] An MIT license is present for the public repository.

## Verification

- [x] `npm run format`
- [x] `npm run format:check`
- [x] `npm run docs:check`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test` — 89 tests passing
- [x] `npm run build`
- [x] `git diff --check`
- [x] Tests made zero OpenAI and Upstash calls.

## Vercel and Redis

- [x] Vercel detects Next.js and npm.
- [x] A Redis integration is connected through the Vercel KV-compatible REST variables.
- [x] Redis credentials remain server-only.
- [x] `GET /api/health` returns only `{ "status": "ok" }`.
- [x] Missing Redis configuration fails closed without a process-memory fallback.
- [x] Demo state survives serverless invocations and expires by TTL.
- [x] Reset, approval continuation, duplicate-action, and replay safeguards work.
- [x] The public URL completes the documented Demo fixture workflow.

## OpenAI boundary

- [x] The official OpenAI JavaScript SDK and Responses API integration are implemented server-side.
- [x] GPT-5.6 output remains non-authoritative and requires separate human confirmation.
- [x] The public deployment intentionally has no `OPENAI_API_KEY` because no funded API quota is attached.
- [x] Live mode reports unavailable instead of returning repeated provider 429 responses.
- [x] The complete judge workflow remains available without credentials through committed synthetic fixtures.

## Submission evidence

- [x] Category: Work & Productivity.
- [x] Public repository and live demo supplied.
- [x] README explains setup, Codex collaboration, GPT-5.6 integration, decisions, and testing.
- [x] `/feedback` ID recorded from the main Codex implementation session.
- [x] All actions, refunds, emails, customer records, approvals, and tools are identified as synthetic or simulated.
- [x] Post-submission QA and documentation tasks are tracked as open work rather than claimed as completed.

## Final manual checks

- [ ] Confirm the Devpost project still shows **Submitted** after any edit.
- [ ] Confirm the public YouTube video remains under three minutes and playable while signed out.
- [ ] Confirm every teammate has accepted the Devpost invitation and contribution claims are accurate.
- [ ] Repeat the browser golden path immediately before the deadline.

<!-- boundary-doc-footer:start -->

---

[Documentation index](./README.md) · [Live demo](https://boundary-ai-agent-control.vercel.app) · [Repository](https://github.com/kaulastudies/boundary-ai-agent-control)
<!-- boundary-doc-footer:end -->
