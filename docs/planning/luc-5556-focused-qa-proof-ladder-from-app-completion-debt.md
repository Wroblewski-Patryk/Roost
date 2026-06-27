# LUC-5556 Focused QA Proof Ladder From App-Completion Debt

Date: 2026-06-27
Issue: [LUC-5556](/LUC/issues/LUC-5556)
Parent: [LUC-5551](/LUC/issues/LUC-5551)
Stage: verification

## Task Contract

- Goal: select one focused, non-duplicated proof ladder from the refreshed Roost
  app-completion missing-test-link debt and run the smallest safe proof
  available in this heartbeat.
- Task Type: QA verification.
- Current Stage: verification.
- Deliverable For This Stage: selected proof ladder, affected surfaces,
  commands run, evidence, blocker, and next owner.

## Scope

Sources read:

- `docs/status/app-completion-index.json`
- `docs/planning/luc-5551-known-state-evidence-and-architecture-baseline.md`
- `docs/planning/luc-5560-top-flow-test-link-proof-ladder.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/module-confidence-ledger.md`
- `package.json`
- `scripts/test-api-local.mjs`
- `scripts/owner-console-ux-smoke.mjs`
- `src/tests/api.test.ts`
- `web/src/main.tsx`
- `web/src/layout/shell.tsx`

Current app-completion snapshot: generated `2026-06-27T14:49:44.922Z`,
`845` items, `7` flows, `826` missing test links, `0` missing doc links, and
`2` blocked items.

## Non-Duplication Check

Recent QA proof ladders already cover:

- Account access API authority: [LUC-5560](/LUC/issues/LUC-5560), partially
  verified and blocked by local Docker availability.
- API auth/config boundary coverage: [LUC-5570](/LUC/issues/LUC-5570),
  statically verified and blocked by local Docker availability for behavioral
  API execution.
- Finance browser subscription projection:
  [LUC-5433](/LUC/issues/LUC-5433), verified locally.
- Dashboard overview, Exchange connection/configuration, Strategy, Company OS,
  ClickUp/provider task-sync, and broad API-backbone slices: verified in
  earlier focused packets.

The selected non-duplicated ladder for this issue is therefore the User
configuration browser/settings surface, with API execution as a prerequisite
gate because the settings screens depend on authenticated owner state.

## Selected Proof Ladder

| Rank | Flow | Affected surfaces | Smallest proof | Expected evidence | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | User configuration API precondition | `src/modules/auth/auth.routes.ts`, `src/modules/api-keys/api-keys.routes.ts`, `src/modules/integration-settings/*`, `src/tests/api.test.ts` | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5556-postgres COMPANYCORE_TEST_DB_PORT=55556 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | build, migrations, seed, API subtests proving owner auth, workspace isolation, API-key configuration, and integration settings fail closed | Blocked locally by Docker engine unavailable |
| 2 | User configuration browser/settings | `/account/settings`, `/workspace/settings`, `/settings`, `/settings/drive`, `/settings/api`; `web/src/features/settings/settings-routes.tsx`, `web/src/layout/shell.tsx`, `scripts/owner-console-ux-smoke.mjs` | After Rank 1 passes, start a local server against the verified test database and run `npm run owner-console:ux-smoke` with scoped settings routes and required-text assertions | desktop/tablet/mobile screenshots, `report.json`, signed-in assertions, no console issues, no raw provider/validation errors exposed | Not run because Rank 1 local runtime prerequisite is blocked |

## Commands Run

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run check:route-capabilities` | PASS | `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok` |
| `npm run build` | PASS | server TypeScript compile PASS; Vite web build PASS; warning only: `/vendor/phosphor/bold/style.css` unresolved at build time and left for runtime |
| `npm run architecture:status` | PASS | `GREEN`; graph `454` nodes / `765` relations / `35` chains; evidence queue `0`; chain worklist `0`; delta `0/0/0`; all gates pass |
| `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5556-postgres COMPANYCORE_TEST_DB_PORT=55556 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | BLOCKED | Docker unavailable before DB creation: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.` |

## Acceptance Criteria

- [x] One non-duplicated proof ladder selected from the refreshed
      app-completion debt.
- [x] Affected routes, API modules, scripts, and tests mapped.
- [x] Smallest safe local static gates run.
- [x] Behavioral/runtime proof attempted and blocker recorded without
      broadening into protected smoke or production mutation.
- [x] Repair issue decision recorded.

## Result Report

Status: `PARTIALLY_VERIFIED_BLOCKED`.

The selected User configuration settings ladder is ready and non-duplicative.
Route capability mapping, full build, and architecture status are verified
locally. The behavioral API prerequisite for a browser settings proof is
blocked because Docker Desktop's Linux engine pipe is unavailable before the
disposable PostgreSQL test database can be created. No database container,
browser, server, provider action, push, deploy, production mutation, credential
access, or secret access occurred.

No product repair issue is warranted from this heartbeat because no user
journey failed. Next owner/action: QA/Test or Engineering Delivery should rerun
the Rank 1 command in a Docker-enabled environment or with an approved safe
local `DATABASE_URL`; if it passes, run the Rank 2 scoped browser proof for
settings routes with desktop/tablet/mobile screenshots and no-console evidence.

Commit status: not committed in this heartbeat because the shared workspace
already contains unrelated dirty and untracked evidence packets plus sibling
source-control closure lanes. Push status: not pushed. Deploy impact: none.
Protected production proof remains approval/credential gated and was not
attempted.
