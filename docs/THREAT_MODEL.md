# Threat Model

<!-- boundary-doc-nav:start -->

> **BOUNDARY documentation** · [Overview](../README.md) · [Docs index](./README.md) · [Architecture](./ARCHITECTURE.md) · [Demo](./DEMO_SCRIPT.md) · [Judge testing](./JUDGE_TESTING.md) · [Deployment](./DEPLOYMENT.md) · [Threat model](./THREAT_MODEL.md)

<!-- boundary-doc-nav:end -->

---

## Security boundaries

- Model output is non-authoritative and remains UNCONFIRMED.
- Policy activation is a separate human-controlled confirmation step.
- Deterministic code compiles policy and owns every enforcement decision.
- Approval continuation binds to the exact action fingerprint and policy version.
- Only side-effect-free simulated tools execute.
- Unmatched risky actions default to BLOCK.
- Audit output records categories and decisions, never original sensitive values.
- Credentials remain server-only and are not returned in errors or availability responses.

## Remaining demo limitations

- Production demo sessions use Upstash TTL storage; local tests use bounded process memory.
- Sessions are not authenticated or isolated for production users.
- Forwarded-address throttling is lightweight and depends on trusted deployment proxy headers.
- The split-refund adversarial fixture demonstrates that aggregate transaction controls are not implemented.
- The demo has no durable audit retention, cross-instance coordination, real tools, payments, email, or customer data.
- Redis availability and Free-tier limits can temporarily make demo sessions unavailable; the application fails closed.
- The public deployment intentionally disables live provider calls when no funded API quota is attached; judges use the bounded synthetic fixture path.

These constraints are explicit and accepted for the synthetic hackathon demonstration.

<!-- boundary-doc-footer:start -->

---

[Documentation index](./README.md) · [Live demo](https://boundary-ai-agent-control.vercel.app) · [Repository](https://github.com/kaulastudies/boundary-ai-agent-control)
<!-- boundary-doc-footer:end -->
