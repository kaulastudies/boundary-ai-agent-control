# Repository Guidelines

## Repository State

BOUNDARY is an OpenAI Build Week agent-control application. The default branch is `main`, and `origin` points to `https://github.com/kaulastudies/boundary-ai-agent-control.git`.

The Stage 1 foundation uses:

- Next.js App Router with strict TypeScript and Tailwind CSS.
- npm exclusively; `package-lock.json` is the only accepted lockfile.
- Zod for runtime schemas and Vitest for unit tests.
- The official OpenAI JavaScript SDK in server-only adapters.
- The OpenAI Responses API and `gpt-5.6` when model integration is introduced.

Canonical verification commands are `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Product Boundary

Treat BOUNDARY as an agent-control system whose core responsibility is to place explicit policy and human-controlled limits around model-backed actions. Keep control decisions separate from model invocation and from user-interface concerns. Record material product choices before encoding them in framework code.

Model integration must use OpenAI's supported Responses API and official JavaScript SDK from server-only modules. Use `gpt-5.6` for policy interpretation and adversarial scenario generation. Do not add LLM7, custom proxies, localhost model gateways, compatibility layers that impersonate OpenAI endpoints, or external model providers.

## Smallest Staged Architecture

Prefer one deployable Next.js application and one npm manifest until demonstrated requirements justify more. Do not introduce a monorepo, microservices, a plugin system, a queue, or a database abstraction speculatively.

Build in these stages:

1. **Foundation:** maintain the Next.js shell, README, `.gitignore`, exact `.env.example`, npm manifest and lockfile, formatting/linting configuration, and smoke test.
2. **Control core:** add framework-independent `src/domain/` policy types and decisions plus `src/application/` orchestration. Policy evaluation must be deterministic and testable without network access.
3. **Boundaries:** add `src/adapters/openai/` for the official OpenAI client and only the persistence or external adapters required by a concrete slice. Keep credentials and SDK response types out of the domain layer.
4. **Entry point:** use server-side App Router entry points for application orchestration; keep credentials and model calls out of client components.
5. **Verification:** mirror control behavior under `tests/unit/`; add `tests/integration/` only for real adapter contracts. Require allow, deny, approval-required, malformed-input, and provider-failure tests before expanding features.

The planned module map and dependency direction live in `docs/ARCHITECTURE.md`.

## Change Discipline

- Keep each change scoped to one stage or one independently reviewable behavior.
- Update this file, the README, and the hackathon changelog when commands or structure change.
- Use npm only and commit `package-lock.json` with `package.json`; do not add other package-manager metadata.
- Avoid generated files unless the generator, source, and repeatable command are committed.
- Do not add abstractions for hypothetical providers or deployment targets.
- Preserve existing user changes; inspect `git status` before and after edits.

## Testing and Review

Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before handing off an implementation change. Use `npm run format:check` when verifying without rewriting files.

Review control changes for secure defaults, explicit failure behavior, auditability, and separation between policy decisions and side effects. Denial and approval paths are first-class behavior. Mock at adapter boundaries and keep domain tests deterministic.

## Secrets and Sensitive Data

- Never commit API keys, tokens, credentials, session data, private prompts, customer data, or populated environment files.
- Keep secrets in environment variables or an approved secret manager. `.env.example` may contain only the approved empty/default entries for `OPENAI_API_KEY`, `OPENAI_MODEL`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`.
- Keep `.env`, `.env.local`, and other populated environment files ignored.
- Redact sensitive values from logs, fixtures, snapshots, examples, issues, and commit messages.
- Never expose OpenAI credentials to browser or other client-side code; model calls must cross a trusted server-side boundary.
- Before staging changes, inspect the diff for secrets and unexpected generated artifacts.

## Commit and Pull Request Guidance

There is no established project history from which to infer a commit convention. Until maintainers select one, use short imperative subjects describing the concrete change, and avoid claiming compatibility or test coverage that was not verified. Pull requests should state scope, decisions introduced, commands run, and security or policy-boundary impact. Never commit or push unless explicitly requested.

## Stage 5 runtime guidance

Production deployment uses Vercel server functions and the server-only Upstash Redis session repository. Local development and deterministic tests use the bounded in-memory repository. Sessions expire by TTL and reset replaces stored state. Do not add authentication, broader persistence, or real integrations during the hackathon submission stage.
