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
