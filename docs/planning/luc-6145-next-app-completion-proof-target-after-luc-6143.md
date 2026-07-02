# LUC-6145 Next App-Completion Proof Target After LUC-6143

## Header
- ID: [LUC-6145](/LUC/issues/LUC-6145)
- Parent: [LUC-6143](/LUC/issues/LUC-6143)
- Task Type: QA verification
- Current Stage: verification
- Status: VERIFIED_DONE_NO_COMMIT
- Owner: QA/Test
- Date: 2026-06-29
- Mission ID: LUC-6145-NEXT-APP-COMPLETION-PROOF-TARGET

## Goal
Select and prove or classify one non-duplicated local app-completion target from the
[LUC-6143](/LUC/issues/LUC-6143) Roost app-completion missing-test-link debt
without treating aggregate scanner counts as product defects.

## Scope
- Source snapshot: `docs/status/app-completion-index.json`, generated
  `2026-06-29T01:35:21.428Z`.
- Snapshot counts: `373` items / `7` flows / `362` missing test links /
  `0` missing doc links / `0` blocked / `0` browser-review records.
- Candidate set: `implemented_needs_proof` rows outside already-proven
  Account access auth API and previously classified dashboard/account duplicate
  debt.
- Selected flow: `Trading operation`.
- Selected target:
  - API route: `GET /v1/strategy/context`
  - App-completion route mount: `src/app.ts#/strategy`
  - Backend file: `src/modules/strategy/strategy.routes.ts`
  - Web consumer: `web/src/features/departments/strategy-route.tsx`
  - Test file: `src/tests/api.test.ts`

## Exclusions
No product code, schema, migration authoring, browser/server long-running
process, protected smoke, deploy, push, restart, production mutation,
credential access, secret disclosure, provider action, or source-control
rewrite was performed.

## Implementation Plan
1. Read the [LUC-6145](/LUC/issues/LUC-6145) issue context and current
   app-completion snapshot.
2. Extract non-account, non-dashboard `implemented_needs_proof` candidates.
3. Avoid duplicate subscription/entitlement and exchange-configuration lanes
   that already have proof packets.
4. Map the selected Trading operation row to concrete Strategy API and web
   surfaces.
5. Run the smallest safe local API proof against a disposable PostgreSQL
   database.
6. Run lightweight route/capability, architecture status, and diff hygiene
   gates.
7. Clean up validation-owned local resources and record the result.

## Candidate Classification
| Flow | Candidate | Classification | Decision |
| --- | --- | --- | --- |
| Subscription and entitlement | `LUC-5647 Subscription And Entitlement Missing-Test Proof Ladder` | Existing proof-ladder document with test/doc evidence; current remaining rows are docs/scanner confidence signals. | Not selected to avoid duplicate finance/subscription proof. |
| Exchange connection and configuration | `Api Key.Middleware` / `LUC-5409 Exchange Connection Configuration Proof Ladder` | Existing local connection/configuration proof packet verifies this lane. | Not selected to avoid duplicate exchange/config proof. |
| Trading operation | `app.ts`, `USE /strategy`, `strategy.routes.ts`, `strategy-route.tsx` | Concrete runtime API and web consumer remain visible in the current app-completion debt, but [LUC-5417](/LUC/issues/LUC-5417) already proved the same Strategy mapping from an earlier snapshot. | Rerun as current-snapshot regression confirmation; no new nonduplicated repair target remains. |
| Unclassified user workflow | broad mounted API routes and tooling scripts | Too broad for a first focused QA target while a concrete Trading/Strategy route is available. | Deferred. |

## Verification Evidence
| Check | Command / Evidence | Result |
| --- | --- | --- |
| Source checkpoint | `git rev-parse HEAD` -> `7bdc016ef071c9d940cd45fd40b1af8bc26bb54e` | verified |
| Disposable database | Docker `postgres:16-alpine`, container `companycore-luc-6145-postgres`, port `55645`, database `companycore_test` | verified |
| Server build | `npm run build:server` with `DATABASE_URL=postgresql://companycore:companycore@127.0.0.1:55645/companycore_test?schema=public` and `NODE_ENV=test` | PASS |
| Migration replay | `npm run prisma:migrate:deploy` | PASS, `31` migrations applied |
| Seed | `npm run seed` | PASS |
| Focused API proof | `node --test --test-name-pattern "CompanyCore v1 protected API flow" dist/tests/api.test.js` | PASS, `1/1`, duration `26146.853ms` |
| Route/capability drift | `npm run check:route-capabilities` | PASS, `180` manifest routes / `35` route files |
| Architecture continuity | `npm run architecture:status` | PASS, `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass |
| Diff hygiene | `git diff --check` | PASS with LF-to-CRLF warnings only |

## Assertions Covered
The selected proof exercises `GET /v1/strategy/context` through the real
Express/Prisma path and covers:

- unauthenticated denial;
- authenticated owner success;
- Strategy department identity and backend area key;
- strategy goals, targets, tasks, metrics, risks, controls, decisions,
  knowledge items, and Drive file projection;
- read-only agent packet mode and blocked strategy write actions;
- no mutation during readback by comparing counts before and after;
- foreign workspace isolation;
- MCP manifest exposure for `companycore_get_strategy_context` with
  `/v1/strategy/context` and `strategy:read`;
- scoped-key denial for keys without `strategy:read`.

## Acceptance Criteria
- [x] One selected user flow and exact endpoint/component/file target is named.
- [x] The selected target avoids already-proven Account access auth API and
      dashboard/account duplicate debt.
- [x] A safe local proof was run and passed.
- [x] Command output, status, residual risk, and repair-lane decision are
      recorded.
- [x] Validation-owned local resources were cleaned up.

## Result Report
Status: `VERIFIED_DONE_NO_COMMIT`.

Selected current-snapshot proof target: `Trading operation` mapped to the Strategy read packet,
`GET /v1/strategy/context`, backed by `src/modules/strategy/strategy.routes.ts`
and consumed by `web/src/features/departments/strategy-route.tsx`.

Outcome: implemented and verified locally. This is not a new product repair
target; it confirms the same Strategy/Trading mapping already proved by
[LUC-5417](/LUC/issues/LUC-5417) still passes against the
[LUC-6143](/LUC/issues/LUC-6143) current snapshot. No product repair lane is
warranted from this target. The current app-completion missing-test-link count
remains a proof-link/scanner confidence signal unless a future snapshot exposes
a fresh unverified concrete runtime route, API endpoint, browser surface, or
capability.

Files changed by this issue: this evidence packet and source-of-truth state
notes only.

Source-control status: not committed. The Roost workspace is a shared
mixed-dirty worktree and already contains unrelated modified
`src/tests/api.test.ts`, many untracked historical planning/UX evidence files,
and a branch ahead of origin. This heartbeat did not stage, revert, or commit.

Push status: not needed and not performed.

Deploy impact: none.

Residual risk: this is a local API proof, not a browser proof for the Strategy
web board and not a protected production smoke. Browser and production proof
remain separate release/UX/Ops gates if Strategy becomes release-critical.
