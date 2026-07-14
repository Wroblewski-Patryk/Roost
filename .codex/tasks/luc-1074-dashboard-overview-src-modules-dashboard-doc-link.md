# LUC-1074 Dashboard Overview src-modules-dashboard Doc Link

## Header
- ID: LUC-1074
- Title: Prove Dashboard overview missing-doc-link for `src/modules/dashboard`
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: [LUC-1072](/LUC/issues/LUC-1072)
- Priority: P1
- Coverage Ledger Rows: Dashboard overview `src/modules/dashboard` `missing_doc_link`
- Module Confidence Rows: Dashboard overview backend module documentation linkage
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: Dashboard overview backend documentation-link drift
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-1074-DASHBOARD-OVERVIEW-SRC-MODULES-DASHBOARD-DOC-LINK
- Mission Status: VERIFIED

## Context
[LUC-1072](/LUC/issues/LUC-1072) already closed the Dashboard overview backend
family `missing_test_link` queue for `src/modules/dashboard`,
`dashboard.routes.ts`, and the helper functions `coerceCount`, `pickHealth`,
`riskRank`, `startOfToday`, `startOfTomorrow`, and `sumCounts`. Project Truth
then routed the same family to Documentation Steward as `missing_doc_link`.
`docs/API.md` did not yet have an explicit dashboard command-center contract,
so this lane needed both the accepted route documentation and the exact
symbol-to-doc relations.

## Goal
Document the dashboard command-center route contract in an accepted
source-of-truth doc, link the exact dashboard backend module family to that
contract, refresh generated truth, and prove the dispatched `missing_doc_link`
rows are cleared.

## Scope
- `docs/API.md`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1074-dashboard-overview-src-modules-dashboard-doc-link.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Explicit Exclusions
- No runtime logic changes in `src/modules/dashboard/dashboard.routes.ts`.
- No schema, migration, deploy, push, protected smoke, browser proof, or live
  credential/provider work.
- No broader dashboard UX redesign or frontend component proof work.

## Proof
- Documentation change:
  - `docs/API.md` now includes a `Dashboard Command Center` contract for
    `GET /v1/dashboard/command` and `/dashboard/command`, covering
    workspace-scoped auth, normalized summary counts, overdue and due-today
    date boundaries, critical-risk classification, department health
    derivation, next-action routing, and `read_only_command_center`
    agent-packet semantics.
  - `docs/architecture/relations/documentation-links.csv` now links
    `src/modules/dashboard`, `src/modules/dashboard/dashboard.routes.ts`,
    `coerceCount`, `pickHealth`, `riskRank`, `startOfToday`,
    `startOfTomorrow`, and `sumCounts` to `docs/API.md`.

## Generated Truth Refresh
- Repo architecture refresh:
  `npm run architecture:refresh`
  -> PASS with graph `454` nodes / `765` relations / `35` chains; chain
  coverage `34/34`; evidence queue `0`; chain worklist `0`; all gates pass.
- Architecture-awareness refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS generated `2026-07-14T08:36:13.709Z` with `2963` entities /
  `7304` relations / `16499` files and materialized the exact dashboard
  module/helper documentation relations.
- App-completion refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS now reports `1278` items / `5` flows / `1133` missing test links /
  `25` missing doc links / `8` implemented-needs-proof / `0` blocked /
  `1166` risk items. The dashboard backend family no longer appears as
  `missing_doc_link`.
- Project Truth apply:
  `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  -> PASS generated `2026-07-14T08:36:31.429Z` with public probe `pass`,
  runtime findings `0`, incomplete event chains `0`, operational gate gaps
  `0`, and first gap advanced from the dashboard backend family to Dashboard
  overview `cc-button.tsx` `missing_test_link`.
- Architecture status:
  `npm run architecture:status`
  -> PASS (`GREEN`, `454/765/35`, evidence queue `0`, chain worklist `0`).

## Acceptance Criteria
- [x] An accepted source-of-truth doc explicitly describes the dashboard
  command-center backend contract and its read-only invariants.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact
  dashboard backend module, route file, and helper rows to that doc.
- [x] Refreshed generated truth no longer reports the dashboard backend family
  as `missing_doc_link`.

## Definition Of Done Evidence
- `DEFINITION_OF_DONE.md` reviewed: yes.
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- `NO_TEMPORARY_SOLUTIONS.md` reviewed: yes.
- `DEPLOYMENT_GATE.md` reviewed: yes.
- Reality status: verified.
- Deploy impact: none.

## Result Report
- Task summary: documented the dashboard command-center backend contract in
  `docs/API.md`, linked the exact dashboard module/helper family to that
  contract, refreshed generated truth, and cleared the dispatched
  `missing_doc_link` queue.
- Files changed: `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`, this task packet,
  refreshed generated outputs under `docs/status` and `docs/graphs`, and the
  source-of-truth state files updated for the closure.
- How tested: repo architecture refresh, Paperclip architecture-awareness
  refresh, app-completion refresh, Project Truth apply, `npm run
  architecture:status`, and exact-row readback from the refreshed indexes.
- What is incomplete: no Documentation Steward work remains for the dashboard
  backend family. The next routed Dashboard overview gap is frontend component
  proof debt starting at `web/src/components/cc-button.tsx`, followed by the
  sibling shared components and `AssetsOverview`.
- Next steps: close the issue with the refreshed evidence and route the new
  first gap to Test Automation Engineer + QA Regression Lead instead of
  reopening dashboard backend documentation work.
- Decisions made: reused `docs/API.md` as the accepted dashboard route
  contract instead of creating a new planning-only or module-local doc surface.
