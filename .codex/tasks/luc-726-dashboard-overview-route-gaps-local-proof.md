# Task

## Header
- ID: LUC-726
- Title: Add local proof for dashboard overview route gaps
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: [LUC-5774](/LUC/issues/LUC-5774), [LUC-5235](/LUC/issues/LUC-5235)
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Dashboard overview
- Requirement Rows: REQ-CC-DASHBOARD-001, REQ-REACT-WEB-002
- Quality Scenario Rows: QA-CC-DASHBOARD-001
- Risk Rows: RISK-CC-DASHBOARD-001
- Iteration: not recorded
- Operation Mode: BUILDER
- Mission ID: LUC-726-dashboard-route-proof
- Mission Status: VERIFIED

## Goal
Add the smallest backend-local proof that closes the dashboard overview route-shaped confidence gap without reopening the broader dashboard UI family.

## Scope
- `src/tests/api.test.ts`
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-726-dashboard-overview-route-gaps-local-proof.md`
- Minimal source-of-truth state updates for this proof packet

## Implementation Plan
1. Confirm the existing dashboard command proof and the remaining route-shaped gap.
2. Extend the API harness with one explicit assertion for the unversioned protected `/dashboard/command` mount.
3. Link the resulting proof packet to the dashboard route/module scanner entities.
4. Run the smallest relevant backend validation plus architecture/status hygiene checks.

## Acceptance Criteria
- [x] The local API harness proves both `/v1/dashboard/command` and `/dashboard/command`.
- [x] Dashboard route/module proof linkage is recorded in scanner overrides.
- [x] Validation commands and residual risk are captured in a durable task packet.

## Definition of Done
- [x] Code builds without errors.
- [x] The affected API route works through the real local API harness.
- [x] No workaround or duplicate dashboard runtime path was introduced.
- [x] Relevant source-of-truth files were updated.
- [x] Behavior is reproducible from the recorded commands below.

## Validation Evidence
- Tests: `npm run test:api:local` - PASS with disposable PostgreSQL (`companycore-luc-726-postgres`, port `55726`); Node test runner passed `8/8` subtests including explicit `/dashboard/command` parity assertions.
- High-risk checks: `npm run check:route-capabilities` - PASS. `npm run architecture:status` - PASS. `git diff --check` - PASS with LF-to-CRLF warnings only.
- Cleanup: `docker ps -a --filter "name=^/companycore-luc-726-postgres$"` returned no validation-owned container. `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` returned no validation-owned process.
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: yes
- Error state verified: not applicable
- Regression check performed: existing protected API flow assertions plus new unversioned dashboard mount assertion

## Result Report
- Task summary: Added explicit local API proof that the unversioned protected dashboard mount (`/dashboard/command`) behaves consistently with the already-proven versioned route, then linked that proof to the dashboard route/module evidence surface.
- Files changed:
  - `src/tests/api.test.ts`
  - `docs/architecture/scanner-overrides.json`
  - `.codex/tasks/luc-726-dashboard-overview-route-gaps-local-proof.md`
- How tested:
  - `$env:COMPANYCORE_TEST_DB_CONTAINER='companycore-luc-726-postgres'`
  - `$env:COMPANYCORE_TEST_DB_PORT='55726'`
  - `$env:COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP='0'`
  - `npm run test:api:local`
  - `npm run check:route-capabilities`
  - `npm run architecture:status`
  - `git diff --check`
- What is incomplete: this does not attempt fresh browser proof for `general-dashboard.tsx` or public-home/dashboard UX rows; those remain separate UI/browser evidence work.
- Next steps: if generated dashboard overview gaps persist after the next architecture/app-completion refresh, route the remaining frontend/browser rows to QA/Docs rather than reopening backend runtime proof.
- Decisions made: route-shaped dashboard confidence debt is backend-proofable through the existing API harness; broader dashboard component debt is not owned by this backend lane.
