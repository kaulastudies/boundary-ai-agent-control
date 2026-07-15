"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  DemoPreset,
  WorkspaceSnapshot,
} from "@/application/demo/demo-workspace-session";
import { DEFAULT_DEMO_POLICY } from "@/fixtures/demo-policy-text";

type Mode = "demo" | "live";
type ApiReply =
  | { sessionId: string; snapshot: WorkspaceSnapshot; error?: never }
  | { error: string; sessionId?: never; snapshot?: never };

const presets: { id: DemoPreset; label: string; detail: string }[] = [
  { id: "SAFE_REFUND", label: "₹2,500 refund", detail: "Expected: allow" },
  { id: "LARGE_REFUND", label: "₹7,500 refund", detail: "Expected: approval" },
  { id: "PII_CLOUD", label: "Cloud ticket + PII", detail: "Expected: redact" },
  {
    id: "PRIVATE_TRANSCRIPT",
    label: "Full transcript",
    detail: "Expected: private route",
  },
  {
    id: "EXTERNAL_EMAIL",
    label: "External email",
    detail: "Expected: approval",
  },
  { id: "BLOCKED_DELETE", label: "Delete audit", detail: "Expected: block" },
];

export function BoundaryWorkspace() {
  const [sessionId, setSessionId] = useState("");
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [policyText, setPolicyText] = useState(DEFAULT_DEMO_POLICY);
  const [mode, setMode] = useState<Mode>("demo");
  const [reviewer, setReviewer] = useState("Build Week judge");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(
    "Start by interpreting the synthetic policy.",
  );

  const request = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/demo/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as ApiReply;
    if (!response.ok || "error" in body) throw new Error(body.error);
    setSessionId(body.sessionId);
    setSnapshot(body.snapshot);
    return body;
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- initializing a server-owned session */
  useEffect(() => {
    request({ command: "INIT" }).catch(() =>
      setNotice("Could not initialize the local demo session."),
    );
  }, [request]);

  async function run(
    label: string,
    task: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(label);
    try {
      await task();
      setNotice(success);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The request could not be completed.",
      );
    } finally {
      setBusy("");
    }
  }

  async function interpret() {
    await run(
      "interpret",
      async () => {
        if (mode === "demo") {
          await request({ command: "INTERPRET_DEMO", sessionId, policyText });
        } else {
          const response = await fetch("/api/policies/interpret", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ policyText }),
          });
          const draft = (await response.json()) as unknown;
          if (!response.ok)
            throw new Error(
              "Live GPT-5.6 interpretation failed. Demo mode remains available.",
            );
          await request({ command: "SET_LIVE_DRAFT", sessionId, draft });
        }
        setConfirmed(false);
      },
      mode === "demo"
        ? "Committed fixture loaded as an unconfirmed proposal."
        : "GPT-5.6 returned an unconfirmed proposal.",
    );
  }

  async function confirmPolicy() {
    if (!confirmed) return setNotice("Check the human confirmation box first.");
    await run(
      "confirm",
      () => request({ command: "CONFIRM", sessionId, reviewerId: reviewer }),
      "Human-confirmed policy compiled by deterministic code.",
    );
  }

  async function submit(preset: DemoPreset) {
    await run(
      preset,
      () => request({ command: "SUBMIT", sessionId, preset }),
      "Action evaluated by the deterministic engine.",
    );
  }

  async function approvalCommand(
    command: "RESOLVE" | "EXPIRE" | "CONTINUE",
    approvalId: string,
    resolution?: "APPROVED" | "REJECTED",
  ) {
    await run(
      command,
      () =>
        request({
          command,
          sessionId,
          approvalId,
          ...(resolution ? { resolution } : {}),
        }),
      command === "CONTINUE"
        ? "The exact approved action executed through a simulated tool."
        : "Approval state updated.",
    );
  }

  const draft = snapshot?.draft?.interpretation;
  const last = snapshot?.lastResult;
  const pending = snapshot?.approvals ?? [];

  return (
    <main className="workspace">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">B</span>
          <div>
            <b>BOUNDARY</b>
            <span>Deterministic agent control</span>
          </div>
        </div>
        <div className="mode-switch" aria-label="Interpretation mode">
          <button
            className={mode === "demo" ? "active" : ""}
            onClick={() => setMode("demo")}
          >
            Demo fixture
          </button>
          <button
            className={mode === "live" ? "active" : ""}
            onClick={() => setMode("live")}
          >
            Live GPT-5.6
          </button>
        </div>
        <div className="status">
          <i /> Simulated tools only
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">OPENAI BUILD WEEK · JUDGE WORKSPACE</p>
          <h1>
            AI that asks
            <br />
            before it acts.
          </h1>
        </div>
        <p className="hero-copy">
          Interpret policy with GPT-5.6 or a synthetic fixture. Confirm it as a
          human. Then watch deterministic code redact, route, pause, block, and
          audit every proposed action.
        </p>
      </section>

      <div className="notice" role="status">
        <span>{busy ? "Working" : "Ready"}</span>
        {notice}
      </div>

      <section className="primary-grid grid">
        <article className="panel policy-panel">
          <PanelHead
            step="01"
            title="Author policy"
            tag={mode === "demo" ? "NO API KEY" : "SERVER-SIDE"}
          />
          <label htmlFor="policy">Natural-language policy</label>
          <textarea
            id="policy"
            value={policyText}
            onChange={(event) => setPolicyText(event.target.value)}
          />
          <div className="panel-actions">
            <span>{policyText.length} characters</span>
            <button
              className="button primary"
              disabled={!sessionId || Boolean(busy)}
              onClick={interpret}
            >
              Interpret policy
            </button>
          </div>
        </article>

        <article className="panel">
          <PanelHead
            step="02"
            title="Review proposal"
            tag={draft ? "UNCONFIRMED" : "WAITING"}
          />
          {draft ? (
            <>
              <p className="summary">{draft.summary}</p>
              <div className="metric-row">
                <Metric
                  label="Confidence"
                  value={`${Math.round(draft.confidence * 100)}%`}
                />
                <Metric
                  label="Rules"
                  value={String(draft.proposedRules.length)}
                />
                <Metric
                  label="Questions"
                  value={String(draft.clarificationQuestions.length)}
                />
              </div>
              <div className="rule-list">
                {draft.proposedRules.map((rule, index) => (
                  <div className="rule" key={index}>
                    <Decision value={rule.outcome} />
                    <div>
                      <b>{rule.actionType.replaceAll("_", " ")}</b>
                      <p>{rule.rationale}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="hash">
                SOURCE HASH · {draft.sourcePolicyTextHash.slice(0, 18)}…
              </p>
            </>
          ) : (
            <Empty text="Interpret the authored policy to create a reviewable, non-authoritative draft." />
          )}
        </article>
      </section>

      <section className="confirmation-grid grid">
        <article className="panel confirm-panel">
          <PanelHead
            step="03"
            title="Human confirmation"
            tag={snapshot?.compiledPolicy ? "CONFIRMED" : "REQUIRED"}
          />
          <p>
            GPT-5.6 can propose rules. It cannot activate them. A separate
            reviewer establishes human provenance.
          </p>
          <label className="field">
            Reviewer identity
            <input
              value={reviewer}
              onChange={(event) => setReviewer(event.target.value)}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              I reviewed this proposal and confirm it as the authored policy.
            </span>
          </label>
          <button
            className="button primary wide"
            disabled={!draft || Boolean(busy)}
            onClick={confirmPolicy}
          >
            Confirm & compile
          </button>
        </article>
        <article className="panel compiled-panel">
          <PanelHead
            step="04"
            title="Compiled policy"
            tag={snapshot?.compiledPolicy ? "ACTIVE" : "INACTIVE"}
          />
          {snapshot?.compiledPolicy ? (
            <>
              <div className="authority">
                <span>Authority</span>
                <b>DETERMINISTIC_ENGINE</b>
              </div>
              <div className="rule-chips">
                {snapshot.compiledPolicy.rules.map((rule) => (
                  <span key={rule.id}>
                    {rule.priority} · {rule.decision}
                  </span>
                ))}
              </div>
              <p className="footnote">
                Default decision: <b>BLOCK</b> · confirmed by{" "}
                {snapshot.reviewedBy}
              </p>
            </>
          ) : (
            <Empty text="No policy is active. Unconfirmed interpretation cannot evaluate or execute actions." />
          )}
        </article>
      </section>

      <section className="panel simulator">
        <PanelHead step="05" title="Action simulator" tag="SYNTHETIC INPUTS" />
        <div className="preset-grid">
          {presets.map((preset) => (
            <button
              disabled={!snapshot?.compiledPolicy || Boolean(busy)}
              key={preset.id}
              onClick={() => submit(preset.id)}
            >
              <span>{preset.label}</span>
              <small>{preset.detail}</small>
            </button>
          ))}
        </div>
        <div className="decision-stage">
          <div>
            <p className="eyebrow">LATEST DECISION</p>
            {last ? (
              <>
                <Decision value={last.decision.decision} large />
                <h3>{last.action.kind.replaceAll("_", " ")}</h3>
                <p>{last.decision.reason}</p>
              </>
            ) : (
              <h3>No action evaluated yet</h3>
            )}
          </div>
          <div className="decision-details">
            {last ? (
              <>
                <span>Action</span>
                <code>{last.action.id}</code>
                <span>Matched rule</span>
                <code>{last.decision.matchedRuleId ?? "default-deny"}</code>
                <span>Status</span>
                <code>{last.status}</code>
              </>
            ) : (
              <p>Select a preset after confirmation.</p>
            )}
          </div>
        </div>
      </section>

      <section className="lower-grid grid">
        <article className="panel">
          <PanelHead
            step="06"
            title="Approval console"
            tag={
              pending.length
                ? `${pending.length} REQUEST${pending.length === 1 ? "" : "S"}`
                : "CLEAR"
            }
          />
          {pending.length ? (
            <div className="approval-list">
              {pending.map((approval) => (
                <div className="approval" key={approval.id}>
                  <div>
                    <Decision value={approval.status} />
                    <b>{approval.id}</b>
                    <small>
                      Exact action fingerprint ·{" "}
                      {approval.actionFingerprint.slice(0, 16)}…
                    </small>
                  </div>
                  <div className="approval-actions">
                    {approval.status === "PENDING" && (
                      <>
                        <button
                          onClick={() =>
                            approvalCommand("RESOLVE", approval.id, "APPROVED")
                          }
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            approvalCommand("RESOLVE", approval.id, "REJECTED")
                          }
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => approvalCommand("EXPIRE", approval.id)}
                        >
                          Expire
                        </button>
                      </>
                    )}
                    {approval.status === "APPROVED" && (
                      <button
                        className="primary"
                        onClick={() => approvalCommand("CONTINUE", approval.id)}
                      >
                        Continue exact action
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="Actions above policy thresholds will pause here for a human decision." />
          )}
        </article>

        <article className="panel">
          <PanelHead
            step="07"
            title="Adversarial analysis"
            tag="NON-EXECUTING"
          />
          <p>
            Reviewed bypass suggestions become deterministic fixtures. They
            never invoke tools.
          </p>
          <button
            className="button wide outline"
            disabled={!snapshot?.compiledPolicy || Boolean(busy)}
            onClick={() =>
              run(
                "adversarial",
                () => request({ command: "RUN_ADVERSARIAL", sessionId }),
                "Reviewed fixtures evaluated without execution.",
              )
            }
          >
            Run reviewed scenarios
          </button>
          {snapshot?.adversarialReport && (
            <div className="adversarial-results">
              {snapshot.adversarialReport.fixtures.map((fixture, index) => (
                <div key={`${fixture.scenarioId}-${index}`}>
                  <b>{fixture.scenarioId}</b>
                  <Decision value={fixture.outcome} />
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="panel audit-panel">
        <PanelHead
          step="08"
          title="Append-only audit timeline"
          tag={`${snapshot?.audit.length ?? 0} EVENTS`}
        />
        <div className="timeline">
          {snapshot?.audit.length ? (
            snapshot.audit.map((event, index) => (
              <div className="event" key={event.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <i />
                <div>
                  <b>{event.type.replaceAll("_", " ")}</b>
                  <small>
                    {event.occurredAt} · {event.correlationId}
                  </small>
                </div>
                <code>{event.id}</code>
              </div>
            ))
          ) : (
            <Empty text="Compilation, evaluation, transformation, approval, and simulated execution events appear here in order." />
          )}
        </div>
      </section>

      <footer>
        <span>BOUNDARY · Build Week demo</span>
        <span>GPT proposes → human confirms → deterministic code enforces</span>
      </footer>
    </main>
  );
}

function PanelHead({
  step,
  title,
  tag,
}: {
  step: string;
  title: string;
  tag: string;
}) {
  return (
    <header className="panel-head">
      <div>
        <span>{step}</span>
        <h2>{title}</h2>
      </div>
      <em>{tag}</em>
    </header>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
function Decision({
  value,
  large = false,
}: {
  value: string;
  large?: boolean;
}) {
  return (
    <span
      className={`decision ${large ? "large" : ""} decision-${value.toLowerCase().replaceAll("_", "-")}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
