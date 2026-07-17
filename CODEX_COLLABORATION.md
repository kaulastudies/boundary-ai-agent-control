# Codex Collaboration

## Working agreement

Codex and human contributors work in small, reviewable stages. Inspect `AGENTS.md`, the working tree, and scoped files before editing. Run all canonical checks after editing. Never commit or push unless explicitly requested.

## Authority model

- GPT-5.6 interprets and proposes.
- Humans clarify and confirm.
- Deterministic code compiles, enforces, approves, transforms, and audits.
- Only simulated tools can execute in the demo.

A model draft is always `UNCONFIRMED`. It cannot set human authority, approve a request, authorize execution, create execution audit claims, or invoke a tool. Human confirmation is a separate application call with explicit reviewer provenance.

## Stage 3 invariants

- Use only the official OpenAI JavaScript SDK, Responses API, `responses.parse`, and `zodTextFormat`.
- Keep credential access and real client construction in `server-only` modules.
- Construct clients lazily; tests must not require a key.
- Validate all output with strict Zod schemas and reject source-hash mismatch.
- Support caller abort and bounded timeout.
- Discard provider messages and return safe application errors.
- Never log prompts, keys, stack traces, or sensitive ticket values.
- Convert adversarial suggestions only after human review and run fixtures solely against deterministic evaluation.
- Clearly report escaped scenarios; never execute them.
- Keep the interpretation route non-activating and non-executing.
- Use the fake Responses client for every test; live test-call count must remain zero.

## Provider and secret rules

Never add Chat Completions, LLM7, external providers, custom proxies, localhost gateways, compatible endpoints, or browser-accessible keys. Never commit real credentials or populated environment files.

## Handoff checklist

Report changed files, commands, test count, route behavior, security boundaries, live API call count, verification results, and the exact next stage.

## Stage 4 collaboration record

Codex composed the existing Stage 2/3 services behind a server-owned demo workspace. No alternate enforcement logic was placed in the browser. The committed demo fixture is clearly marked synthetic; Live GPT-5.6 remains optional and server-only. The UI exposes approval decisions but continuation always uses the preserved server-side action and policy version.

No database, external provider, live payment, live email, commit, push, or deployment was performed. Test execution made zero live OpenAI requests.

## Stage 5 collaboration record

Codex hardened only the existing submission surface. Demo persistence now uses a server-only repository boundary with Upstash Redis in production and bounded memory only for local development and tests; no authentication, database, multi-tenancy, real integration, distributed signing, or alternate provider was introduced. Throttling and session bounds contain public-demo resource use without storing policy text or sensitive action values.

Demo mode works without secrets. Live availability reveals only a boolean. Tests and production build make zero OpenAI requests.

## Upstash migration collaboration record

Codex replaced only demo-session persistence. Deterministic policy compilation, enforcement, approvals, simulated tools, and audit rules remain unchanged. The Redis adapter is server-only and stores a strict sanitized schema. Tests use a fake repository or bounded memory; no test imports live credentials or contacts Upstash.

## Production handoff record

The documented production target is Vercel Hobby connected to the GitHub main branch at https://boundary-ai-agent-control.vercel.app. The judge path defaults to the no-key Demo fixture; optional GPT-5.6 access remains server-only. Documentation explicitly identifies every action, refund, email, and tool as simulated and treats demo-session state as ephemeral across inactivity and deployment replacement.
