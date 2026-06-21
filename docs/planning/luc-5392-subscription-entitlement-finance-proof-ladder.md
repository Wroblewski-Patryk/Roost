# LUC-5392 Subscription And Entitlement Finance Proof Ladder

## Task Contract

- ID: [LUC-5392](/LUC/issues/LUC-5392)
- Title: Roost QA proof ladder from [LUC-5390](/LUC/issues/LUC-5390) app-completion confidence debt
- Task Type: QA verification
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Mission ID: LUC-5392-SUBSCRIPTION-ENTITLEMENT-FINANCE-PROOF
- Mission Status: VERIFIED

## Goal

Select and prove one focused user-flow slice from the refreshed
[LUC-5390](/LUC/issues/LUC-5390) app-completion confidence debt without turning
the aggregate missing-test signal into broad test generation.

## Scope

Selected flow: `Subscription and entitlement`.

Mapped runtime slice:

- `GET /v1/finance/context`
- `GET /v1/commercial-exceptions`
- `src/modules/finance/finance.routes.ts`
- `src/modules/commercial-exceptions/commercial-exceptions.routes.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/tests/api.test.ts`
- `web/src/features/departments/finance-route.tsx` as the current UI consumer

The app-completion scanner labels the highest-debt flow as subscription and
entitlement. In current Roost code this is not a Stripe/subscription billing
entitlement service. It is represented by Finance/Billing pricing candidates,
owner-decision-required subscription policy, commercial exception risk packets,
read-only agent authority, and blocked money-impacting actions.

## Exclusions

No product code, schema, migration authoring, browser proof, protected smoke,
deploy, push, restart, production mutation, credential access, secret
disclosure, live provider action, or long-running local server was performed.

## Implementation Plan

1. Read the [LUC-5390](/LUC/issues/LUC-5390) baseline and app-completion index.
2. Map `Subscription and entitlement` to existing finance/commercial exception
   runtime contracts and prior proof history.
3. Run the smallest useful project-native local proof against a disposable
   database.
4. Run route/capability and architecture status gates.
5. Verify cleanup of validation-owned resources.
6. Record the evidence and residual risk in project memory.

## Verification Evidence

| Check | Command / Evidence | Result |
| --- | --- | --- |
| Selected confidence debt | `docs/status/app-completion-index.md` generated `2026-06-21T00:44:00.519Z` reports `Subscription and entitlement` with `474` entities, `458` missing test links, `14` implemented-needs-proof items, and `2` blocked items | selected |
| Flow interpretation | Code inspection of `src/modules/finance/finance.routes.ts`, `src/modules/commercial-exceptions/commercial-exceptions.routes.ts`, and `src/tests/api.test.ts` | current subscription/entitlement posture maps to read-only Finance/Billing and commercial exception guardrails |
| Local API proof | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5392-postgres COMPANYCORE_TEST_DB_PORT=55592 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | PASS; server/web build passed, all `31` migrations applied, seed passed, and `7/7` node test subtests passed including `CompanyCore v1 protected API flow` |
| Route/capability drift | `npm run check:route-capabilities` | PASS, `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok` |
| Architecture continuity | `npm run architecture:status` | PASS, `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass |
| Diff hygiene | `git diff --check` | PASS with LF-to-CRLF warnings only |
| Database cleanup | `docker ps -a --filter "name=^/companycore-luc-5392-postgres$" --format "{{.Names}} {{.Status}}"` | PASS, no validation DB container remained |
| Browser cleanup | `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` | PASS, no browser validation process was present |

## Assertions Covered

The selected proof exercised existing assertions for:

- unauthenticated denial for commercial exception and finance reads;
- authenticated owner success for `GET /v1/finance/context`;
- CH subscription/pricing candidates, including `499 CHF/month`,
  `1500 CHF setup + 150 CHF/month`, and pure `150 CHF/month` analysis;
- no active pricing policy without owner decision;
- `150 CHF/hour` value assumption exposure;
- `100%` commercial exception inclusion from same-workspace evidence;
- invoice-readiness blockers and pricing policy conflict detection;
- read-only finance agent packet mode;
- blocked money-impacting actions including `set_active_price_policy`,
  `quote_final_terms`, `apply_discount`, `send_invoice`, and
  `mark_payment_status`;
- no source mutation during readback;
- foreign-workspace isolation;
- MCP manifest exposure for `companycore_get_finance_context` with
  `finance:read`;
- scoped-key denial for `commercial-exceptions:read` and `finance:read` when
  the key lacks those scopes.

## Acceptance Criteria

- [x] One flow selected from the [LUC-5390](/LUC/issues/LUC-5390)
      app-completion confidence debt.
- [x] Existing implementation and prior proof history mapped before validation.
- [x] Local proof run through the project-native API harness against a
      disposable database.
- [x] Route/capability and architecture status checks passed.
- [x] Validation resources cleaned up.
- [x] Residual risk and next owner path recorded.

## Result Report

Status: `VERIFIED_DONE`.

The current Roost subscription/entitlement posture is locally verified for the
Finance/Billing slice: read-only pricing candidates, owner-decision-required
subscription policy, commercial exception inclusion, blocked money-impacting
actions, workspace isolation, MCP/capability exposure, and scoped-key denial.
No product repair issue is warranted from this proof.

Files changed by this issue: this evidence packet plus project state/ledger
updates only.

Runtime changes: none.

Commit status: not committed in this QA heartbeat because the workspace already
contains the pre-existing [LUC-5390](/LUC/issues/LUC-5390) generated/status
evidence packet awaiting [LUC-5391](/LUC/issues/LUC-5391) source-control
closure.

Push status: not pushed.

Deploy impact: none.

Residual risk: this was an API proof, not a desktop/mobile browser proof of
`/areas?area=07-finanse&view=overview`, and not protected production proof.
Protected target proof remains approval/credential gated. A future QA browser
lane may verify the Finance board projection when UI confidence, not API
entitlement posture, is the selected risk.
