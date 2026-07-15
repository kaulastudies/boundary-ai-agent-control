import type {
  AuthoredPolicy,
  CompiledPolicy,
  NormalizedRule,
} from "@/domain/policy/schemas";
import {
  authoredPolicySchema,
  compiledPolicySchema,
} from "@/domain/policy/schemas";

export function compilePolicy(untrustedPolicy: AuthoredPolicy): CompiledPolicy {
  const policy = authoredPolicySchema.parse(untrustedPolicy);
  const rules: NormalizedRule[] = [
    ...policy.prohibitedActions.map((actionKind) => ({
      id: `block:${actionKind.toLowerCase()}`,
      description: `Explicitly prohibited action: ${actionKind}`,
      priority: 1_000,
      decision: "BLOCK" as const,
      match: { actionKinds: [actionKind] },
    })),
    {
      id: "refund:above-threshold",
      description: `Refunds above INR ${policy.refundApprovalThresholdInr} require approval`,
      priority: 900,
      decision: "REQUIRE_APPROVAL",
      match: {
        actionKinds: ["ISSUE_REFUND"],
        amountInrGreaterThan: policy.refundApprovalThresholdInr,
      },
    },
    ...(policy.outboundCommunicationRequiresApproval
      ? [
          {
            id: "communication:external-approval",
            description: "External email requires human approval",
            priority: 850,
            decision: "REQUIRE_APPROVAL" as const,
            match: {
              actionKinds: ["SEND_EMAIL" as const],
              recipientScopes: ["EXTERNAL" as const],
            },
          },
        ]
      : []),
    ...(policy.routePrivately.length > 0
      ? [
          {
            id: "sensitive:private-route",
            description: "Sensitive support context must use private routing",
            priority: 800,
            decision: "ROUTE_PRIVATELY" as const,
            match: {
              sensitiveData: [...policy.routePrivately],
              processingRoutes: ["CLOUD" as const],
            },
          },
        ]
      : []),
    ...(policy.redactBeforeCloud.length > 0
      ? [
          {
            id: "sensitive:redact-cloud",
            description:
              "Sensitive data must be redacted before cloud processing",
            priority: 700,
            decision: "REDACT_AND_ALLOW" as const,
            match: {
              sensitiveData: [...policy.redactBeforeCloud],
              processingRoutes: ["CLOUD" as const],
            },
            redact: [...policy.redactBeforeCloud],
          },
        ]
      : []),
    {
      id: "refund:within-threshold",
      description: `Refund is within the INR ${policy.refundApprovalThresholdInr} limit`,
      priority: 200,
      decision: "ALLOW",
      match: {
        actionKinds: ["ISSUE_REFUND"],
        amountInrAtMost: policy.refundApprovalThresholdInr,
      },
    },
    {
      id: "support:read-ticket",
      description: "Reading a support ticket is explicitly allowed",
      priority: 100,
      decision: "ALLOW",
      match: { actionKinds: ["READ_SUPPORT_TICKET"] },
    },
  ];

  const compiled = compiledPolicySchema.parse({
    id: `${policy.id}@${policy.version}`,
    sourcePolicyId: policy.id,
    sourcePolicyVersion: policy.version,
    authority: "DETERMINISTIC_ENGINE",
    rules,
    defaultDecision: "BLOCK",
  });

  return Object.freeze({
    ...compiled,
    rules: Object.freeze([...compiled.rules]),
  });
}
