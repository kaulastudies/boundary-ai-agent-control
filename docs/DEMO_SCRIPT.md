# BOUNDARY Demo Script

## Three-minute golden path

1. Open https://boundary-ai-agent-control.vercel.app. Confirm the header says Simulated tools only and Demo fixture is selected.
2. Read the policy, then select Interpret policy. Point out the UNCONFIRMED badge: interpretation is a proposal, not authority.
3. Enter a reviewer label, check the human confirmation statement, and choose Confirm & compile. Show DETERMINISTIC_ENGINE and default BLOCK.
4. Select Cloud ticket + PII. Show ACTION_REDACTED, the re-evaluation, and simulated execution in the audit timeline. No original classified value appears.
5. Select Full transcript. Show the transition to the private zone and re-evaluation.
6. Select ₹7,500 refund. The workflow pauses. Approve it, then choose Continue exact action. The server resumes only the stored action under the same policy version.
7. Select Delete audit to show explicit blocking.
8. Run reviewed adversarial scenarios. Point out that split refunds are reported as an escape/gap while nested PII is safely transformed and audit deletion is blocked. No adversarial fixture executes.

## Optional live interpretation

Switch to Live GPT-5.6 only when OPENAI_API_KEY is configured server-side. Live mode calls POST /api/policies/interpret and returns the same unconfirmed contract. A provider failure is reported clearly; there is no fixture fallback.

## Stage 5 production rehearsal

Before the demo, confirm GET /api/health returns only a safe status. The default no-key path is unchanged.

The header marks Live GPT-5.6 unavailable when no server key exists. Do not switch modes during the core demo. Point out the ephemeral-state notice: inactivity clears Redis-backed demo state, while reset creates a clean session. Use Reset session if a clean judge run is needed.

## Deployed judge environment

- Judge URL: https://boundary-ai-agent-control.vercel.app
- Health: https://boundary-ai-agent-control.vercel.app/api/health
- Platform: Vercel Hobby connected to GitHub main

Demo fixture mode is the default and needs no API key. Live GPT-5.6 is optional and server-only. All actions, refunds, emails, and tools shown during the script are simulated. If inactivity or a deployment replacement clears the ephemeral session, refresh and restart from interpretation.
