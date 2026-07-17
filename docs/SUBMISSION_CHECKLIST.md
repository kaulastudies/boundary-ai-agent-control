# Submission Checklist

## Repository and secrets

- [ ] npm and package-lock.json are the only package manager artifacts.
- [ ] .env.example contains only approved empty/default variable names.
- [ ] No real .env file, Redis token, OpenAI key, customer data, or raw credential exists.
- [ ] Redis and OpenAI variables are absent from client components and rendered output.
- [ ] No LLM7, custom proxy, localhost model gateway, Chat Completions, or external model provider exists.

## Verification

- [ ] npm run format
- [ ] npm run lint
- [ ] npm test
- [ ] npm run typecheck
- [ ] npm run build
- [ ] git diff --check
- [ ] Tests made zero OpenAI and Upstash calls.

## Vercel Hobby and Upstash Free

- [ ] Vercel detects Next.js and npm.
- [ ] An Upstash Redis Free database is connected.
- [ ] UPSTASH_REDIS_REST_URL is server-only.
- [ ] UPSTASH_REDIS_REST_TOKEN is server-only.
- [ ] Optional OPENAI_API_KEY and OPENAI_MODEL are server-only.
- [ ] GET /api/health returns only safe status.
- [ ] Missing Redis configuration fails closed without memory fallback.
- [ ] Demo state survives serverless invocations and expires by TTL.
- [ ] Reset, approval continuation, duplicate-action, and replay safeguards work.
- [ ] The public URL completes docs/DEMO_SCRIPT.md.

## Actual production deployment

- [x] Production platform is Vercel Hobby.
- [x] Deployment source is the GitHub main branch.
- [x] Judge URL is https://boundary-ai-agent-control.vercel.app.
- [ ] Verify https://boundary-ai-agent-control.vercel.app/api/health immediately before judging.
- [ ] Verify Demo fixture is the default and works without an OpenAI API key.
- [ ] Verify optional Live GPT-5.6 configuration remains server-only.
- [ ] Remind judges that all actions, refunds, emails, and tools are simulated.
- [ ] Be prepared to restart the workflow if ephemeral state expires or a deployment replacement resets it.
