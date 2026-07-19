# Final Judge QA Evidence

## Test record

- Completed: 2026-07-19 21:57:59 +05:30
- Commit tested: `e531cf1248f7c6eb2a2cce2a07f73b0c913f057b`
- Live application: https://boundary-ai-agent-control.vercel.app
- Repository: https://github.com/kaulastudies/boundary-ai-agent-control
- Devpost: https://devpost.com/software/boundary-ai-that-asks-before-it-acts
- YouTube: https://youtu.be/FAHQ1UxO6MA
- Test owner: Rama Chandra M
- Test mode: signed-out isolated browser contexts
- Live GPT-5.6 public status: intentionally unavailable
- Judge workflow: Demo fixture, no credentials required

## Browser results

| Browser run            | Viewport | Result | Audit events observed |
| ---------------------- | -------: | ------ | --------------------: |
| Chrome desktop         | 1366×768 | PASS   |                     5 |
| Chrome mobile-width    |  390×844 | PASS   |                     5 |
| Microsoft Edge desktop | 1366×768 | PASS   |                     5 |

## Production and security checks

- Homepage returned HTTP 200.
- `GET /api/health` returned `{ "status": "ok" }`.
- Production session creation succeeded.
- Reset returned a replacement session ID.
- Demo fixture completed without an OpenAI API key.
- Live GPT-5.6 availability returned `false`.
- Human confirmation was required before policy compilation.
- The INR 7,500 refund paused for approval.
- Exact-action continuation produced one simulated execution.
- Repeating continuation did not create a duplicate execution event.
- Adversarial fixtures rendered outcomes without execution.
- Reset returned the workspace to an inactive policy state.
- Security headers verified: DENY framing, nosniff, no-referrer, restricted permissions, and same-origin opener policy.

## Public-link results

| Link              | HTTP | Final URL                                                         | Result |
| ----------------- | ---: | ----------------------------------------------------------------- | ------ |
| Live demo         |  200 | https://boundary-ai-agent-control.vercel.app/                     | PASS   |
| GitHub repository |  200 | https://github.com/kaulastudies/boundary-ai-agent-control         | PASS   |
| YouTube           |  200 | https://youtu.be/FAHQ1UxO6MA                                      | PASS   |
| Devpost           |  200 | https://devpost.com/software/boundary-ai-that-asks-before-it-acts | PASS   |

## Screenshot evidence

1. [Main workspace](./01-main-workspace.png)
2. [UNCONFIRMED policy interpretation](./02-unconfirmed-policy.png)
3. [INR 7,500 refund requiring approval](./03-refund-requires-approval.png)
4. [Approved continuation and audit](./04-approved-continuation-and-audit.png)
5. [Try to Break My Policy results](./05-try-to-break-policy-results.png)
6. [Ordered audit timeline](./06-ordered-audit-timeline.png)
7. [Signed-out Devpost project page](./07-devpost-public-page.png)

## Result

**PASS.** No judge-blocking defect was found during the final owner-led regression. Every action, refund, email, ticket, approval, and tool result remains synthetic or simulated.
