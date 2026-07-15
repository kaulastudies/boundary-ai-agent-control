# BOUNDARY Architecture

## Stage 2B scope

BOUNDARY remains one Next.js deployable with a framework-independent control core. Stage 2B composes policy compilation, deterministic classification and evaluation, transformation, approval, simulated execution, and audit recording into a complete local workflow. It adds no UI behavior, route handler, OpenAI request, live network, database, payment, or email integration.

## Implemented module map

| Concern                          | Path                                                    | Responsibility                                                                    |
| -------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Policy and decision contracts    | `src/domain/policy/`                                    | Authored/compiled policy, normalized rule, and decision schemas                   |
| Action and enforcement contracts | `src/domain/enforcement/`                               | Proposed action schema, execution zones, support context, and validated decisions |
| Deterministic evaluator          | `src/domain/enforcement/evaluate-action.ts`             | Safety-first matching and default deny                                            |
| Approval contract                | `src/domain/approvals/`                                 | Exact action fingerprint, policy version, state, and resolution metadata          |
| Audit contract                   | `src/domain/audit/`                                     | Value-free immutable event schemas for every control transition                   |
| Policy compiler                  | `src/application/policy-compiler/`                      | Human-authored policy normalization                                               |
| Approval store                   | `src/application/approvals/`                            | Idempotent creation and immutable lifecycle snapshots                             |
| Audit ledger                     | `src/application/audit/`                                | Append-only ordered events, correlation queries, injected IDs, and injected time  |
| Transformations                  | `src/application/control-flow/transform-action.ts`      | Context classification, PII removal, private-zone routing, and loop prevention    |
| Action fingerprint               | `src/application/control-flow/action-fingerprint.ts`    | SHA-256 binding for exact-action continuation                                     |
| Orchestrator                     | `src/application/control-flow/boundary-control-flow.ts` | Golden-path composition and idempotency boundaries                                |
| Simulated tools                  | `src/adapters/tools/simulated/`                         | Synthetic execution guarded by deterministic or human authorization               |

## Orchestration flow

1. Validate and deterministically classify the proposed action.
2. Compile the human-authored policy once and audit its use once per correlation.
3. Evaluate the action and record only decision metadata, never the action payload.
4. For `REDACT_AND_ALLOW`, remove classified phone/payment fields, record category names, and re-evaluate.
5. For `ROUTE_PRIVATELY`, set `executionZone` and processing route to private, record the transition, and re-evaluate.
6. For `REQUIRE_APPROVAL`, hash and preserve the exact normalized action and compiled policy version, then create one pending request.
7. Continue only if the matching request is approved and unexpired.
8. Execute one side-effect-free tool at most once and append one execution event.
9. Return prior immutable results for identical retries; reject conflicting resolution, action substitution, or routing loops.

## Decision and transformation safety

Decision precedence remains `BLOCK`, `REQUIRE_APPROVAL`, `ROUTE_PRIVATELY`, `REDACT_AND_ALLOW`, then `ALLOW`. Unmatched actions are blocked. Routing and redaction are transitions, not authorization shortcuts: each transformed action is parsed and evaluated again.

The action fingerprint covers the complete normalized action, including values, classifications, execution zone, and routing history. The fingerprint is retained only in the in-memory approval record; audit events contain IDs, policy metadata, decision metadata, category names, zones, and outcomes but never original support-context values.

## Idempotency boundaries

- policy-compilation audit: once per correlation
- evaluation: once per correlation and exact action fingerprint
- approval creation: once per flow and exact action binding
- approval resolution: identical retries return the prior result; conflicting retries fail
- continuation: requires an exact fingerprint and policy-version match
- execution: once per flow; repeated continuation returns the original result

## Audit timeline

The append-only ledger supports ordered immutable events and correlation queries. It exposes no mutation or deletion method. Event types are:

- `POLICY_COMPILED`
- `ACTION_CLASSIFIED`
- `ACTION_EVALUATED`
- `ACTION_REDACTED`
- `ACTION_ROUTED_PRIVATELY`
- `APPROVAL_CREATED`
- `APPROVAL_RESOLVED`
- `SIMULATED_EXECUTION`

## Dependency direction

`src/domain/` imports no Next.js, React, OpenAI SDK, or adapter. `src/application/` composes domain behavior and explicit in-memory stores. `src/adapters/` depends on validated domain authorization. `src/app/` remains separate and does not yet invoke the control flow.

## Deferred decisions

OpenAI integration, route handlers, UI workflow, authentication, durable persistence, deployment, real approval delivery, production tools, customer data, payments, and email remain intentionally deferred.
