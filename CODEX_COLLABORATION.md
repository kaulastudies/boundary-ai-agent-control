# Codex Collaboration

## Working agreement

Codex and human contributors work in small, reviewable stages. Before editing, inspect `AGENTS.md`, the working tree, and the files in scope. After editing, run the canonical npm checks and report failures and fixes. Never commit or push unless explicitly requested.

## Decision ownership

- Humans own authored policy, risk tolerance, approval decisions, and approval UX.
- The deterministic compiler, orchestrator, and evaluator own runtime enforcement.
- Models may later propose interpretations and adversarial scenarios, but their output is untrusted and never authorizes execution.
- Record durable decisions in `docs/ARCHITECTURE.md`; do not hide them in prompts or generated output.

## Stage 2B invariants

- Parse every boundary with Zod and classify context deterministically.
- Treat redaction and private routing as transformations requiring re-evaluation.
- Never place original sensitive values in audit events.
- Bind approval continuation to the exact normalized action fingerprint and policy version.
- Reject rejected, expired, mismatched, conflicting, and looped transitions.
- Make identical retries idempotent and simulated execution at-most-once per flow.
- Inject clocks and ID generators so orchestration tests remain stable.
- Keep the audit ledger append-only; add no mutation or deletion API.
- Use synthetic tickets, addresses, content, refunds, and email results only.

## Safety rules

- Never read, create, print, or commit real secrets. Use `.env.example` for variable names and safe defaults only.
- Never place `OPENAI_API_KEY` in browser-visible code, `NEXT_PUBLIC_*` variables, logs, fixtures, or screenshots.
- Use only the official OpenAI JavaScript SDK from server-only modules and the Responses API when integration begins.
- Do not introduce LLM7, external model providers, custom proxies, localhost gateways, or compatibility endpoints.
- Do not connect deterministic tests, orchestration, audit, or simulated tools to networks, databases, real payments, real mail, or customer data.

## Handoff checklist

Report changed files, commands executed, total tests, verification results, known limitations, and the exact next implementation slice. Keep `HACKATHON_CHANGELOG.md` current as stages land.
