# Codex Collaboration

## Working agreement

Codex and human contributors should work in small, reviewable stages. Before editing, inspect `AGENTS.md`, the working tree, and the files in scope. After editing, run the canonical npm checks and report both failures and fixes. Never commit or push unless explicitly requested.

## Decision ownership

- Humans own authored policy, risk tolerance, approval decisions, and approval UX.
- The deterministic compiler and evaluator own runtime enforcement.
- Models may later propose interpretations and adversarial scenarios, but their output is untrusted and never authorizes execution.
- Codex may implement an agreed slice, add focused tests, and propose tradeoffs.
- Record durable architecture decisions in `docs/ARCHITECTURE.md`; do not hide them in prompts or generated output.

## Stage 2A invariants

- Parse every policy, action, decision, approval, and audit boundary with Zod.
- Resolve matching rules with `BLOCK` first, then approval, private routing, redaction, and allow.
- Default unmatched actions to `BLOCK`.
- Permit direct simulated execution only for deterministic allow decisions.
- Permit approval-gated simulation only with a matching immutable approved request.
- Inject clocks and ID generators so approval tests remain deterministic.
- Use synthetic ticket IDs, addresses, and content only.

## Safety rules

- Never read, create, print, or commit real secrets. Use `.env.example` for variable names and safe defaults only.
- Never place `OPENAI_API_KEY` in browser-visible code, `NEXT_PUBLIC_*` variables, logs, fixtures, or screenshots.
- Use only the official OpenAI JavaScript SDK from server-only modules and the Responses API when integration begins.
- Do not introduce LLM7, external model providers, custom proxies, localhost gateways, or compatibility endpoints.
- Do not connect deterministic tests or simulated tools to networks, databases, real payments, real mail, or customer data.

## Handoff checklist

Report changed files, commands executed, test count, verification results, known limitations, and the exact next implementation slice. Keep `HACKATHON_CHANGELOG.md` current as stages land.
