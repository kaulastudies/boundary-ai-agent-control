# Threat Model

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

These constraints are explicit and accepted for the synthetic hackathon demonstration.
