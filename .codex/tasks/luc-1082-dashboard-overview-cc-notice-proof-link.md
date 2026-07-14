# Task

## Header
- ID: LUC-1082
- Title: Prove Dashboard overview missing-test-link for cc-notice-tsx
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-998](/LUC/issues/LUC-998), [LUC-1080](/LUC/issues/LUC-1080)
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Dashboard overview
- Requirement Rows: REQ-CC-DASHBOARD-001, REQ-REACT-WEB-002
- Quality Scenario Rows: QA-CC-DASHBOARD-001
- Risk Rows: RISK-CC-DASHBOARD-001
- Iteration: not recorded
- Operation Mode: TESTER
- Mission ID: LUC-1082-dashboard-cc-notice-proof-link
- Mission Status: VERIFIED_DONE

## Goal
Close the generated Dashboard overview `missing_test_link` gap on
`web/src/components/cc-notice.tsx` by proving the shared notice component in
the live dashboard overview route state, without changing product runtime code.

## Scope
- `scripts/luc-1082-dashboard-cc-notice-proof.mjs`
- `docs/ux/evidence/luc-1082-dashboard-cc-notice-proof/`
- `docs/architecture/scanner-overrides.json`
- `docs/testing/test-map.csv`
- `.codex/tasks/luc-1082-dashboard-overview-cc-notice-proof-link.md`
- Generated source-of-truth refresh driven by the focused proof

Excluded:
- product runtime code
- duplicate component-only harnesses
- deploy/restart work
- credential or secret handling

## Implementation Plan
1. Confirm the routed Dashboard overview gap is the shared `CcNotice`
   component family rather than a broader dashboard-route regression.
2. Add one focused browser proof that renders `CcNotice` directly in the live
   dashboard overview loading and error states.
3. Mark `cc-notice.tsx` verified through that durable route proof.
4. Rerun the smallest relevant refresh chain so app-completion and Project
   Truth stop routing `cc-notice.tsx` as the first gap.

## Acceptance Criteria
- [x] `web/src/components/cc-notice.tsx` no longer appears as the first
      Dashboard overview `missing_test_link` row after refresh.
- [x] `CcNotice` is linked to durable dashboard route proof that visibly
      renders its loading and error states.
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
  `web/src/components/cc-notice.tsx` with a focused browser proof that renders
  `CcNotice` in the live overview route loading and fail-closed error states.
- Files changed:
  - `scripts/luc-1082-dashboard-cc-notice-proof.mjs`
  - `docs/planning/luc-1082-dashboard-overview-cc-notice-proof.md`
  - `docs/ux/evidence/luc-1082-dashboard-cc-notice-proof/report.json`
  - `docs/architecture/scanner-overrides.json`
  - `docs/testing/test-map.csv`
  - `.codex/tasks/luc-1082-dashboard-overview-cc-notice-proof-link.md`
  - source-of-truth state files refreshed from the generated readback
- How tested:
  - `npm run build:web`
  - `node scripts/luc-1082-dashboard-cc-notice-proof.mjs`
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch; ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch; node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
- What is incomplete:
  - no remaining work in this task scope
- Next steps:
  - next routed Dashboard overview proof gap is
    `web/src/components/cc-resource-selector.tsx`
- Decisions made:
  - use a route-level dashboard proof instead of a component-only harness so
    `CcNotice` is verified in the real consuming surface
  - keep the refresh chain sequential because app-completion can read a stale
    architecture-awareness graph when both generators run in parallel

## Completion Evidence
- Browser proof report:
  `docs/ux/evidence/luc-1082-dashboard-cc-notice-proof/report.json`
  generated `2026-07-14T10:38:50.718Z`, with
  `loadingState.noticeCount=3`, `errorState.noticeCount=3`,
  `redirectedToCanonicalDashboard=true`,
  `dashboardCommandUsedBearerToken=true`,
  `noHorizontalOverflow=true`, and expected mocked server failure isolated from
  `consoleIssues` and `pageErrors`.
- Architecture awareness:
  `docs/graphs/architecture-awareness.json` generated
  `2026-07-14T10:44:57.508Z` with `2978` entities / `7370` relations /
  `16504` files.
- App completion:
  `docs/status/app-completion-index.json` generated
  `2026-07-14T10:42:11.615Z` with `1277` items / `5` flows /
  `1123` missing test links / `25` missing doc links /
  `8` implemented-needs-proof / `0` blocked / `1156` risk items.
- Project Truth:
  `docs/status/project-truth-index.json` generated
  `2026-07-14T10:45:07.009Z`; public probes pass and the first routed gap is
  now Dashboard overview `cc-resource-selector.tsx` `missing_test_link`.
