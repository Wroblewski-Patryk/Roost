# LUC-5417 Strategy Proof Ladder

## Task

- Issue: [LUC-5417](/LUC/issues/LUC-5417)
- Parent: [LUC-5413](/LUC/issues/LUC-5413)
- Task Type: QA verification
- Current Stage: verification
- Status: VERIFIED_DONE
- Owner: QA Verification Engineer
- Date: 2026-06-21

## Goal

Select one non-duplicated app-completion confidence-debt target from the
[LUC-5413](/LUC/issues/LUC-5413) refresh, map its implementation and proof
surface, run the smallest safe local proof, and decide whether product repair is
warranted.

## Scope

- Selected app-completion bucket: `Trading operation`
- Actual mapped capability: Strategy department read-only context, not a live
  trading/order/provider operation
- Mapped entities:
  - `USE /strategy` in `src/app.ts#/strategy`
  - `src/modules/strategy/strategy.routes.ts`
  - `web/src/features/departments/strategy-route.tsx`
  - `src/auth/capabilities.ts` (`strategy:read`)
  - `src/mcp/manifest.ts`
  - `src/tests/api.test.ts`
- Protected exclusions: no push, deploy, restart, protected smoke, production
  mutation, credential access, secret disclosure, or live provider action.

## Selection Rationale

The refreshed app-completion index reported `840` items across `7` flows, with
`821` missing test links, `0` browser-review needs, `0` missing doc links, and
`2` blocked items.

Recent proof lanes already covered Account access, Subscription/Entitlement,
Dashboard overview, User configuration, and Exchange connection/configuration.
The remaining non-duplicated choices were:

| Candidate | Count | Current interpretation | QA decision |
| --- | ---: | --- | --- |
| `Trading operation` | 3 | Scanner heuristic classifies `strategy` as trading because the broad keyword set includes `strategy`; mapped files are the Strategy Management System read packet and web board. | Selected because it is small, concrete, locally provable, and does not require provider credentials. |
| `Unclassified user workflow` | 195 | Broad scanner-inference bucket dominated by route mounts, scripts, shared modules, and docs. | Deferred because it is better handled through curation or targeted owner lanes, not one blind QA proof. |

## Existing Proof Mapping

`src/tests/api.test.ts` already contains Strategy assertions inside the
`CompanyCore v1 protected API flow` subtest:

- unauthenticated `/v1/strategy/context` returns `401`;
- authenticated owner can read Strategy department summary, goals, targets,
  metrics, risks, controls, decision logs, decisions, knowledge items, Drive
  files, and strategic tasks;
- workspace B Strategy data does not leak into workspace A;
- the read path does not mutate goals, targets, metrics, risks, decisions,
  knowledge, Drive files, tasks, audit logs, or events;
- MCP manifest exposes `companycore_get_strategy_context` with
  `strategy:read`, read risk, and no approval requirement;
- scoped keys without `strategy:read` receive `403`.

## Proof Run

| Check | Result | Evidence |
| --- | --- | --- |
| Local API ladder | PASS | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5417-postgres COMPANYCORE_TEST_DB_PORT=55517 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` |
| Build | PASS | `npm run test:api:local` ran `npm run build`, including server TypeScript and Vite web build. |
| Migrations | PASS | All `31` migrations applied to `127.0.0.1:55517/companycore_test`. |
| Seed | PASS | `npm run seed` completed inside the local API ladder. |
| API tests | PASS | Node test reported `7/7` subtests passed, including `CompanyCore v1 protected API flow`. |
| Route-capability manifest | PASS | `npm run check:route-capabilities` checked `180` manifest routes and `35` route files with status `ok`. |
| Architecture status | PASS | `npm run architecture:status` reported `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |
| Validation cleanup | PASS | No `companycore-luc-5417-postgres` container remained, no port `55517` listener remained, and no `chrome-headless-shell` process remained. |

## Result Report

- Selected flow and why: selected the `Trading operation` bucket because it was
  small and not recently duplicated; mapped it to Strategy after inspecting the
  generated app-completion logic and architecture graph.
- Product repair warranted: no. The selected Strategy read-only local API/MCP
  posture is implemented and verified.
- Remaining risk: the bucket label is scanner-noisy because Strategy is not a
  live trading operation. This is an app-completion classification nuance, not a
  product runtime defect. Browser Strategy board proof and protected production
  proof remain separate future gates if selected by release ownership.
- Files changed by this QA lane: this evidence packet plus source-of-truth state
  entries only.
- Commit/push: not committed in this heartbeat because the shared workspace
  already contains parent and sibling evidence changes awaiting
  [LUC-5416](/LUC/issues/LUC-5416) source-control closure. Push not needed.
- Deploy impact: none.
