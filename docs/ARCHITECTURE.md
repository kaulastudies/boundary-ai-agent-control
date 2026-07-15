# BOUNDARY Architecture

## Stage 2A scope

BOUNDARY remains one Next.js deployable, but its control core is framework-independent. Stage 2A adds deterministic policy compilation, evaluation, approvals, audit events, and simulated tools. It adds no UI behavior, route handler, OpenAI request, live network, database, payment, or email integration.

## Implemented modules

| Concern             | Path                                                    | Responsibility                                                                                            |
| ------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Policy schemas      | `src/domain/policy/schemas.ts`                          | Zod schemas and types for authored policies, compiled policies, normalized rules, and decision vocabulary |
| Policy compiler     | `src/application/policy-compiler/compile-policy.ts`     | Validate human-authored policy and produce normalized deterministic rules                                 |
| Enforcement schemas | `src/domain/enforcement/schemas.ts`                     | Validate proposed actions and ensure only allow decisions authorize execution                             |
| Enforcement engine  | `src/domain/enforcement/evaluate-action.ts`             | Pure rule matching, precedence, redaction metadata, and default deny                                      |
| Approval schema     | `src/domain/approvals/schemas.ts`                       | Validate pending, approved, rejected, and expired requests                                                |
| Approval workflow   | `src/application/approvals/in-memory-approval-store.ts` | Create and resolve immutable approval snapshots using injected time and IDs                               |
| Audit events        | `src/domain/audit/`                                     | Validate and freeze compilation, evaluation, approval, and simulated-execution events                     |
| Simulated tools     | `src/adapters/tools/simulated/index.ts`                 | Return synthetic results only after deterministic or human approval authorization                         |
| Support fixture     | `src/fixtures/support-policy.ts`                        | Define the synthetic ₹5,000 support policy without customer data                                          |
| Tests               | `tests/unit/`                                           | Exercise policy conflicts, default deny, approvals, audits, and guarded simulations                       |

## Decision precedence

When multiple rules match, the evaluator applies this safety ordering before rule priority and stable rule ID ordering:

1. `BLOCK`
2. `REQUIRE_APPROVAL`
3. `ROUTE_PRIVATELY`
4. `REDACT_AND_ALLOW`
5. `ALLOW`

If no rule matches, the result is `BLOCK`. `ALLOW` and `REDACT_AND_ALLOW` are the only decisions that directly set `authorizedForExecution`. `REQUIRE_APPROVAL` can reach a simulated tool only with a matching `APPROVED` request. A model has no authority field or execution bypass in this flow.

## Support-case policy

The human-authored fixture compiles into explicit rules that:

- block audit-log deletion at the highest precedence;
- require approval for refunds above ₹5,000;
- require approval for external email;
- route support transcripts privately instead of sending them to a cloud route;
- redact phone and payment classifications before cloud processing;
- allow refunds at or below ₹5,000;
- allow synthetic support-ticket reads; and
- block everything else by default.

## Dependency direction

`src/domain/` imports no Next.js, React, OpenAI SDK, or adapter module. `src/application/` coordinates domain behavior. `src/adapters/` may depend on domain contracts but domain code never depends on adapters. `src/app/` remains separate and does not yet invoke the control core.

All entry data is parsed with Zod. The deterministic evaluator is authoritative. Future GPT-5.6 output may propose a policy interpretation or adversarial scenario, but it must be validated and compiled through this control boundary and can never directly authorize an action.

## Audit model

Audit events are immutable validated snapshots for:

- `POLICY_COMPILED`
- `ACTION_EVALUATED`
- `APPROVAL_CREATED`
- `APPROVAL_RESOLVED`
- `SIMULATED_EXECUTION`

Stage 2A defines event data but deliberately does not persist or transmit it.

## Stage 2B boundary

Stage 2B should add one application-level use case that composes compilation, evaluation, approvals, redaction/private-routing transformations, simulation, and an in-memory audit ledger. It should remain local and deterministic. Route handlers and UI integration should be considered only after the orchestration API and full golden-path tests are stable.

## Deferred decisions

OpenAI integration, authentication, durable persistence, deployment, real approval delivery, production tools, real customer data, payments, and email remain intentionally deferred.
