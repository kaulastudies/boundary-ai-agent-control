# BOUNDARY Documentation

<!-- boundary-doc-nav:start -->

> **BOUNDARY documentation** · [Overview](../README.md) · [Architecture](./ARCHITECTURE.md) · [Demo](./DEMO_SCRIPT.md) · [Judge testing](./JUDGE_TESTING.md) · [Deployment](./DEPLOYMENT.md) · [Threat model](./THREAT_MODEL.md)

<!-- boundary-doc-nav:end -->

---

## Purpose

This directory contains the judge, maintainer, deployment, and security documentation for BOUNDARY. Every document follows the same authority model: GPT-5.6 may interpret or suggest, a human confirms, and deterministic code owns enforcement and simulated execution.

## Current public mode

- The public Vercel demo defaults to the complete no-key Demo fixture workflow.
- Redis-backed sessions, approvals, adversarial analysis, audit history, and reset are available to judges.
- Live GPT-5.6 is intentionally unavailable in the public deployment because no funded API quota is attached.
- The official server-only Responses API integration remains implemented and can be enabled later without changing application code.
- No API key, Redis token, customer information, or real business-system credential is committed.

## Documentation map

| Document                                          | Purpose                                                                           |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Architecture](./ARCHITECTURE.md)                 | Authority boundaries, dependency direction, persistence, and provider integration |
| [Demo script](./DEMO_SCRIPT.md)                   | Three-minute narrated golden path                                                 |
| [Judge testing](./JUDGE_TESTING.md)               | Credential-free verification and optional operator-enabled live path              |
| [Deployment](./DEPLOYMENT.md)                     | Vercel, Redis, environment, and production checks                                 |
| [Threat model](./THREAT_MODEL.md)                 | Security guarantees and accepted demo limitations                                 |
| [Submission checklist](./SUBMISSION_CHECKLIST.md) | Final hackathon evidence and verification record                                  |
| [Link audit](./LINK_AUDIT.md)                     | Automated local, anchor, and external-link results                                |
| [Codex collaboration](../CODEX_COLLABORATION.md)  | How Codex and GPT-5.6 were used and constrained                                   |
| [Hackathon changelog](../HACKATHON_CHANGELOG.md)  | Chronological implementation record                                               |
| [Repository guidelines](../AGENTS.md)             | Contributor instructions and non-negotiable boundaries                            |

## Canonical verification

```text
npm run format:check
npm run docs:check
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

<!-- boundary-doc-footer:start -->

---

[Project overview](../README.md) · [Live demo](https://boundary-ai-agent-control.vercel.app) · [Repository](https://github.com/kaulastudies/boundary-ai-agent-control)
<!-- boundary-doc-footer:end -->
