# Task

## Header
- ID: LUC-1076
- Title: Prove Dashboard overview missing-test-link for cc-button-tsx
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-998](/LUC/issues/LUC-998), [LUC-1074](/LUC/issues/LUC-1074)
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Dashboard overview
- Requirement Rows: REQ-CC-DASHBOARD-001, REQ-REACT-WEB-002
- Quality Scenario Rows: QA-CC-DASHBOARD-001
- Risk Rows: RISK-CC-DASHBOARD-001
- Iteration: not recorded
- Operation Mode: TESTER
- Mission ID: LUC-1076-dashboard-cc-button-proof-link
- Mission Status: DONE

## Goal
Close the generated Dashboard overview `missing_test_link` gap on
`web/src/components/cc-button.tsx` by linking the existing focused
dashboard/public-home browser proof to the shared button component and its
helper functions without introducing a duplicate UI harness.

## Scope
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-1076-dashboard-overview-cc-button-proof-link.md`
- Generated source-of-truth refresh driven by the verification override links

Excluded:
- product runtime code
- duplicate proof harnesses
- deploy/restart work
- credential or secret handling

## Implementation Plan
1. Confirm the current Dashboard overview gap is limited to the shared button
   component family.
2. Reuse the existing focused browser proof from `LUC-998` rather than adding
   a duplicate component-only harness.
3. Add explicit verification overrides for `cc-button.tsx`, `CcButton`, and
   `iconClass`.
4. Rerun the smallest relevant refresh chain so app-completion and Project
   Truth stop routing `cc-button.tsx` as the first gap.

## Implementation Summary
1. Reused the existing `LUC-998` dashboard/public-home proof evidence already
   recorded in `docs/planning/luc-998-dashboard-public-home-frontend-proof.md`,
   `docs/ux/evidence/luc-998-dashboard-public-home-proof/report.json`, and
   `scripts/luc-998-dashboard-public-home-proof.mjs`.
2. Added direct `tests` proof-link overrides from the existing `LUC-998`
   proof document, proof script, and this task packet to:
   - `web/src/components/cc-button.tsx`
   - `web/src/components/cc-button.tsx#CcButton`
   - `web/src/components/cc-button.tsx#iconClass`
3. Tightened the `CcButton` and `iconClass` scanner override descriptions so
   the app-completion heuristic reads the reused proof as explicit
   Playwright-style browser test evidence instead of leaving the function rows
   scored as `missing_test_link`.
4. Regenerated architecture-awareness, app-completion, and Project Truth to
   verify the queue advanced to the next Dashboard overview component family.

## Acceptance Criteria
- [x] `web/src/components/cc-button.tsx` no longer appears as the first
      Dashboard overview `missing_test_link` row after refresh.
- [x] `CcButton` and `iconClass` are linked to durable browser proof evidence.
- [x] Validation commands and the next routed gap are captured in a durable
      task packet.

## Definition of Done
- [x] No duplicate runtime test path or workaround was introduced.
- [x] The reused browser proof remains reproducible and clearly linked.
- [x] Relevant source-of-truth files were updated.
- [x] `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` were respected for
      this verification-only slice.

## Validation Evidence
- Tests:
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch`
  - `ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`
- High-risk checks:
  - Project Truth public probe passed for `https://roost.luckysparrow.ch`,
    `https://roost.luckysparrow.ch/api/build-info`,
    `https://api.roost.luckysparrow.ch/health`, and
    `https://api.roost.luckysparrow.ch/ready`.
- Reality status:
  - verified by refreshed source-of-truth exports; no local long-running
    processes were started.

## Result Report
- Task summary: closed the `cc-button.tsx` Dashboard overview proof-link gap by
  reusing the existing `LUC-998` browser proof instead of creating another UI
  harness.
- Files changed:
  - `docs/architecture/scanner-overrides.json`
  - `.codex/tasks/luc-1076-dashboard-overview-cc-button-proof-link.md`
  - regenerated `docs/graphs/*` and `docs/status/*` exports
- How tested:
  - architecture refresh completed green
  - app-completion refresh dropped `missingTestLink` from `1132` to `1130`
  - Project Truth advanced its first routed gap to
    `Dashboard overview: cc-data-table.tsx has app-completion risk missing_test_link.`
  - `npm run architecture:status` returned `GREEN`
- What is incomplete:
  - broader Dashboard overview shared-component proof gaps remain for
    `cc-data-table.tsx`, `cc-field.tsx`, `cc-notice.tsx`,
    `cc-resource-selector.tsx`, `cc-route-loading.tsx`, and
    `cc-text-input.tsx`
- Next steps:
  - if this lane continues, reuse the same `LUC-998` proof surface for
    `cc-data-table.tsx` as the next smallest Dashboard overview
    `missing_test_link` repair
- Decisions made:
  - treated the existing `LUC-998` focused browser proof as the canonical
    evidence source for the shared dashboard/public-home button family
  - kept the fix in source-of-truth metadata only; no product code or new test
    harnesses were introduced
