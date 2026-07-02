# LUC-5664 Trading Operation Missing-Test Micro-Lane

## Task Contract

Task Type: test automation / proof selection

Current Stage: verification

Deliverable For This Stage: classification and proof mapping for the
`Trading operation` app-completion bucket after [LUC-5662](/LUC/issues/LUC-5662).

Goal: decide whether the three `Trading operation` missing-test rows require a
new local test, or whether existing Strategy proof already covers the concrete
surface.

Scope:

- `docs/status/app-completion-index.json`
- `docs/graphs/architecture-awareness.json`
- `src/app.ts`
- `src/modules/strategy/strategy.routes.ts`
- `web/src/features/departments/strategy-route.tsx`
- `src/tests/api.test.ts`
- Existing evidence packets:
  - `docs/planning/luc-5417-strategy-proof-ladder.md`
  - `docs/planning/luc-5156-strategy-api-journey-proof.md`
  - `docs/planning/v1-strategy-context-read-api-task-contract.md`

Exclusions:

- No product code, route code, schema, migration, browser, database, Docker,
  protected smoke, live integration, deploy, push, restart, production
  mutation, provider action, credential access, or secret disclosure.

Implementation Plan:

1. Read the issue context and current app-completion snapshot.
2. Reproduce the app-completion classifier logic against the current
   architecture graph to identify the three `Trading operation` rows.
3. Map those rows to current route, backend, frontend, and test evidence.
4. Run the smallest local gate that confirms route/capability drift has not
   appeared.
5. Record the selection and residual owner path.

Acceptance Criteria:

- `Trading operation` is either mapped to existing proof or assigned one small
  local proof.
- Evidence names the exact rows, files, and command output.
- Remaining flow debt has one owner/action.
- No protected or live trading/runtime action occurred.

Definition Of Done:

- Evidence packet is recorded.
- Source-of-truth state reflects the classification.
- Paperclip issue has a final disposition.

## Findings

The post-[LUC-5662](/LUC/issues/LUC-5662) `Trading operation` signal is a
scanner classification side effect, not a live trading/order/provider surface.

`build-app-completion-index.mjs` maps text containing `strategy` to
`Trading operation`. Replaying that classifier against the current
`docs/graphs/architecture-awareness.json` identifies exactly these three rows:

| Row | Type | Path | Current classification |
| --- | --- | --- | --- |
| `USE /strategy` | `api_endpoint` | `src/app.ts#/strategy` | Strategy read-packet route mount |
| `strategy.routes.ts` | `feature` | `src/modules/strategy/strategy.routes.ts` | Strategy read-only backend packet |
| `strategy-route.tsx` | `feature` | `web/src/features/departments/strategy-route.tsx` | Strategy department web board consuming `/v1/strategy/context` |

No Binance, exchange, order, position, wallet, market-data, provider, or live
trading implementation row was found in this bucket.

## Existing Proof Mapping

The concrete Strategy surface is already covered by existing local API proof:

- [LUC-5417](/LUC/issues/LUC-5417) selected the same `Trading operation`
  bucket, mapped it to Strategy, and ran
  `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5417-postgres
  COMPANYCORE_TEST_DB_PORT=55517 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0
  npm run test:api:local` successfully.
- [LUC-5156](/LUC/issues/LUC-5156) proved the `01 Strategy` read-only API
  journey with focused local API execution.
- `src/tests/api.test.ts` currently asserts `/v1/strategy/context`
  unauthenticated denial, authenticated owner success, department identity,
  backend area mapping, summary data, goals/targets/tasks, metrics, risks,
  controls, decision logs, decisions, knowledge items, Drive files, read-only
  agent packet mode, blocked write actions, no mutation on read, workspace
  isolation, MCP manifest exposure for `companycore_get_strategy_context`,
  and scoped-key denial without `strategy:read`.
- `web/src/features/departments/strategy-route.tsx` consumes
  `/v1/strategy/context`, so the frontend row maps to the same backend packet.

## Verification Evidence

| Check | Evidence | Result |
| --- | --- | --- |
| Issue context | [LUC-5664](/LUC/issues/LUC-5664) heartbeat context cites [LUC-5662](/LUC/issues/LUC-5662) and the `Trading operation` bucket with `3` missing-test rows | PASS |
| Current app-completion summary | `docs/status/app-completion-index.json` generated `2026-06-27T21:34:57.134Z` reports `Trading operation: 3` with `missing_test_link: 3` | PASS |
| Row extraction | Local Node replay of the app-completion classifier returned exactly `USE /strategy`, `strategy.routes.ts`, and `strategy-route.tsx` | PASS |
| Route/capability drift | `npm run check:route-capabilities` checked `180` manifest routes and `35` route files with `status=ok` | PASS |
| Existing Strategy proof | [LUC-5417](/LUC/issues/LUC-5417), [LUC-5156](/LUC/issues/LUC-5156), and `src/tests/api.test.ts` cover the concrete `/v1/strategy/context` route and `strategy:read` MCP exposure | VERIFIED by prior packet and current code inspection |

## Selection

Selected next proof: none.

Reason: the three rows are already mapped to Strategy and the Strategy
read-only context packet already has local API/MCP proof. A new test would
duplicate [LUC-5417](/LUC/issues/LUC-5417) unless a future refresh surfaces a
real exchange/order/trading runtime row or a fresh Strategy regression.

Next owner/action: Docs/Architecture or shared scanner curation should rename
or split the app-completion keyword bucket so `strategy` does not imply live
trading for Roost. Test Automation should wait for a concrete unverified
runtime row or fresh regression before adding more Strategy proof.

## Result Report

Status: verified and closed as proof mapping.

Files changed: this evidence packet plus source-of-truth state/context updates.

Validation: `npm run check:route-capabilities` PASS.

Commit status: not committed in this heartbeat because the shared workspace
already contains unrelated prior evidence/state packets.

Push status: not pushed.

Deploy impact: none.

Residual risk: the app-completion classifier still labels Strategy rows as
`Trading operation`, so future refreshes may resurface the same three
missing-test links until scanner curation is completed. This is classification
debt, not a product runtime defect.
