# Task

## Header
- ID: LUC-1072
- Title: Prove Dashboard overview missing-test-link for src-modules-dashboard
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-726](/LUC/issues/LUC-726), [LUC-1070](/LUC/issues/LUC-1070)
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Dashboard overview
- Requirement Rows: REQ-CC-DASHBOARD-001, REQ-REACT-WEB-002
- Quality Scenario Rows: QA-CC-DASHBOARD-001
- Risk Rows: RISK-CC-DASHBOARD-001
- Iteration: not recorded
- Operation Mode: TESTER
- Mission ID: LUC-1072-dashboard-module-proof-link
- Mission Status: VERIFIED

## Goal
Close the generated Dashboard overview `missing_test_link` gap on
`src/modules/dashboard` by linking the existing local API proof to the backend
dashboard module, route file, and helper functions without adding duplicate
runtime tests.

## Scope
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-1072-dashboard-overview-src-modules-dashboard-proof-link.md`
- Generated source-of-truth refresh driven by the existing scanner override links

## Implementation Plan
1. Confirm the current Dashboard overview gap is limited to the backend module
   and helper rows.
2. Reuse the existing local API harness proof for `/v1/dashboard/command` and
   `/dashboard/command` rather than adding duplicate tests.
3. Add explicit verification overrides and test-evidence links for
   `src/modules/dashboard`, `dashboard.routes.ts`, and the helper functions
   reported by app-completion.
4. Rerun the smallest relevant proof plus architecture-awareness,
   app-completion, and Project Truth refresh so the generated gap no longer
   classifies these rows as `missing_test_link`.

## Acceptance Criteria
- [x] `src/modules/dashboard` no longer appears as a Dashboard overview
      `missing_test_link` row after refresh.
- [x] The route file and helper rows (`coerceCount`, `pickHealth`, `riskRank`,
      `startOfToday`, `startOfTomorrow`, `sumCounts`) are linked to durable
      verification evidence.
- [x] Validation commands and the next routed gap are captured in a durable task
      packet.

## Definition of Done
- [x] No duplicate dashboard runtime path or workaround was introduced.
- [x] The real local API harness proof remains reproducible.
- [x] Relevant source-of-truth files were updated.
- [x] `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` were respected for
      this verification-only slice.

## Validation Evidence
- Tests: `npm run test:api:local` - PASS after the proof-link refresh.
- High-risk checks:
  - `npm run architecture:refresh` - PASS
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` - PASS
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` - PASS
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` - PASS
  - `npm run architecture:status` - PASS
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: yes
- Error state verified: not applicable
- Regression check performed: reused the existing dashboard command API proof
  and route-alias parity assertions from `src/tests/api.test.ts`

## Result Report
- Task summary: Linked the existing dashboard API proof to the generated
  backend module and helper rows so Project Truth no longer routes
  `src/modules/dashboard` as a Dashboard overview `missing_test_link` surface.
- Files changed:
  - `docs/architecture/scanner-overrides.json`
  - `.codex/tasks/luc-1072-dashboard-overview-src-modules-dashboard-proof-link.md`
  - Generated architecture-awareness / app-completion / Project Truth exports
- How tested:
  - `npm run test:api:local`
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`
- What is incomplete: Dashboard overview now routes the same backend
  `src/modules/dashboard` family as `missing_doc_link`, and still has separate
  frontend `missing_test_link` rows on shared components and `AssetsOverview`;
  this task only closes the backend proof-link gap selected by Project Truth.
- Next steps: route the next first Dashboard overview gap only after reading the
  refreshed `docs/status/project-truth-index.json`; the next owner for this
  backend family is the docs lane, not another dashboard test-authoring lane.
- Decisions made: treat `LUC-1072` as a proof-link repair rather than a new
  test-authoring task because the local API harness already proves the
  dashboard command packet behavior through the real route, and the actual fix
  required refreshing the architecture-awareness scanner exports that
  app-completion consumes.
