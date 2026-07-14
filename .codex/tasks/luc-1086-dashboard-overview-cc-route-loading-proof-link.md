# Task

## Header
- ID: LUC-1086
- Title: Prove Dashboard overview missing-test-link for cc-route-loading-tsx
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-998](/LUC/issues/LUC-998), [LUC-1084](/LUC/issues/LUC-1084)
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Dashboard overview
- Requirement Rows: REQ-CC-DASHBOARD-001, REQ-REACT-WEB-002
- Quality Scenario Rows: QA-CC-DASHBOARD-001
- Risk Rows: RISK-CC-DASHBOARD-001
- Iteration: not recorded
- Operation Mode: TESTER
- Mission ID: LUC-1086-dashboard-cc-route-loading-proof-link
- Mission Status: VERIFIED_DONE

## Goal
Close the generated Dashboard overview `missing_test_link` gap on
`web/src/components/cc-route-loading.tsx` by proving the shared route-loading
component in the live dashboard lazy-route path, without changing product runtime
code.

## Scope
- `scripts/luc-1086-dashboard-cc-route-loading-proof.mjs`
- `docs/ux/evidence/luc-1086-dashboard-cc-route-loading-proof/`
- `docs/architecture/scanner-overrides.json`
- `docs/testing/test-map.csv`
- `docs/planning/luc-1086-dashboard-overview-cc-route-loading-proof.md`
- `.codex/tasks/luc-1086-dashboard-overview-cc-route-loading-proof-link.md`
- Generated source-of-truth refresh driven by the focused proof

Excluded:
- product runtime code
- duplicate component-only harnesses
- deploy/restart work
- credential or secret handling

## Implementation Plan
1. Confirm the routed Dashboard overview gap is the shared `CcRouteLoading`
   component family rather than a broader dashboard-route regression.
2. Add one focused browser proof that delays the built `general-dashboard`
   chunk so the live signed-in route visibly renders `CcRouteLoading`.
3. Mark `cc-route-loading.tsx` verified through that durable route proof.
4. Rerun the smallest relevant refresh chain so app-completion and Project
   Truth stop routing `cc-route-loading.tsx` as the first gap.

## Acceptance Criteria
- [x] `web/src/components/cc-route-loading.tsx` no longer appears as the first
      Dashboard overview `missing_test_link` row after refresh.
- [x] `CcRouteLoading` is linked to durable dashboard route proof that visibly
      renders its lazy-route loading state.
- [x] Validation commands, proof artifacts, and the next routed gap are
      captured in a durable task packet.

## Definition of Done
- [x] No product runtime code or workaround path was introduced.
- [x] The focused browser proof remains reproducible and clearly linked.
- [x] Relevant source-of-truth files were updated.
- [x] `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` were respected for
      this verification-only slice.

## Result Report
- Task summary: Closed the routed Dashboard overview `missing_test_link` gap on
  `web/src/components/cc-route-loading.tsx` with a focused browser proof that
  delays the live dashboard lazy chunk and captures the shared fallback before
  the ready state renders.
- Files changed:
  - `scripts/luc-1086-dashboard-cc-route-loading-proof.mjs`
  - `docs/planning/luc-1086-dashboard-overview-cc-route-loading-proof.md`
  - `docs/ux/evidence/luc-1086-dashboard-cc-route-loading-proof/report.json`
  - `docs/architecture/scanner-overrides.json`
  - `docs/testing/test-map.csv`
  - `.codex/tasks/luc-1086-dashboard-overview-cc-route-loading-proof-link.md`
  - source-of-truth state files refreshed from the generated readback
- How tested:
  - `npm run build:web`
  - `node scripts/luc-1086-dashboard-cc-route-loading-proof.mjs`
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` -> PASS (`generatedAt=2026-07-14T11:40:59.847Z`, `entities=3002`, `relations=7422`, `files=16516`)
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` -> PASS (`generatedAt=2026-07-14T11:41:06.206Z`, `items=1282`, `missingTestLink=1116`, `missingDocLink=30`, `implementedNeedsProof=8`)
  - `$env:ROOST_PUBLIC_URL='https://roost.luckysparrow.ch'; $env:ROOST_API_PUBLIC_URL='https://api.roost.luckysparrow.ch'; node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` -> PASS (`generatedAt=2026-07-14T11:41:11.036Z`, public probes `pass`, first gap advanced to `web/src/components/cc-text-input.tsx`)
  - `npm run architecture:status`
- What is incomplete:
  - no remaining work in this task scope
- Next steps:
  - next routed Dashboard overview proof gap is
    `web/src/components/cc-text-input.tsx`
- Decisions made:
  - use a route-level lazy-load proof instead of reusing the older theme task so
    `CcRouteLoading` has a current machine-linkable test entry
  - keep the refresh chain sequential because app-completion can read a stale
    architecture-awareness graph when both generators run in parallel
  - classify proof-harness helper functions in `docs/architecture/scanner-overrides.json`
    as `test` entities so Project Truth keeps routing product gaps instead of
    helper implementation details
