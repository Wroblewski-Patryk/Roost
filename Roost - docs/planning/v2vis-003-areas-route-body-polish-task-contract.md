# Task

## Header
- ID: V2VIS-003
- Title: Areas Route Body UX Polish
- Task Type: design
- Current Stage: release
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: V2VIS-002
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: V2VIS-003 Owner web UX
- Requirement Rows: UX route-body usability
- Quality Scenario Rows: mobile/tablet/desktop usability
- Risk Rows: route-body density, responsive overflow
- Iteration: 11
- Operation Mode: BUILDER
- Mission ID: V2VIS-003
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository
      sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: improve the canonical `/areas` route body so it answers
  current priority, review blockers, and next actions before dense exploration.
- Release objective advanced: pre-V2 web foundation quality and owner-console
  usability.
- Included slices: 100-point route-body audit, command summary, early filters,
  anchored sections, coverage highlight framing, responsive density polish,
  validation evidence, and source-of-truth updates.
- Explicit exclusions: Company City V2 visuals, gamification, backend contract
  changes, new data model, and broad multi-route redesign.
- Checkpoint cadence: record audit before implementation, validate after
  implementation, update ledgers before commit.
- Stop conditions: architecture mismatch, failing build/test gate, horizontal
  overflow, or inability to prove the `/areas` journey locally.
- Handoff expectation: future UX cycles can pick the next route body using the
  same evidence-driven audit pattern.

## Context

V2VIS-002 converged the shared route frame and React shell. The next UX risk is
route-body usefulness: key screens still contain useful data but often require
too much scrolling and interpretation before the owner knows what to do.

## Goal

Polish `/areas` as the first detailed route-body UX slice by promoting review
pressure, filters, section navigation, and responsive density without changing
backend contracts.

## Scope

- `web/src/main.tsx`
- `web/src/styles.css`
- `docs/ux/areas-route-body-usability-audit-2026-05-15.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/next-steps.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`
- `docs/planning/mvp-next-commits.md`
- `docs/ux/design-memory.md`

## Implementation Plan
1. Inspect `/areas` implementation, UX contracts, and current planning state.
2. Record 100 UX/UI findings for the route body.
3. Add a reusable route-body command summary using existing tokens and
   primitives.
4. Move filters near the top and anchor major sections.
5. Tighten responsive spacing for mobile/tablet/desktop.
6. Validate build, tests, and real browser screenshots.
7. Update source-of-truth files and commit/push if all gates pass.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: `/areas` had valuable panels but lacked a route-body priority layer.
- Gaps: filters were too low, review pressure was distributed, and mobile
  density was too loose for a management workbench.
- Inconsistencies: route frame now answered high-level questions, but route
  body still behaved like a long report.
- Architecture constraints: reuse React/DaisyUI/CompanyCore primitives and do
  not alter backend APIs.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: project memory index, task board, next steps, MVP queue,
  design-system contract, route-frame audit, `/areas` implementation.
- Rows created or corrected: pending verification updates.
- Assumptions recorded: latest user feedback safely prioritizes V2VIS-003 over
  ACF-MAINT-002 for this iteration.
- Blocking unknowns: none.
- Why it was safe to continue: scope is UI-only and uses existing contracts.

### 2. Select One Priority Mission Objective
- Selected task: V2VIS-003 Areas Route Body UX Polish.
- Priority rationale: user explicitly requested repeated UX/UI cycles, and
  `/areas` was already identified as the next route-body candidate.
- Why other candidates were deferred: ACF-MAINT-002 remains important but does
  not address the newest UX/UI request.

### 3. Plan Implementation
- Files or surfaces to modify: route body JSX, route CSS, UX/task/state docs.
- Logic: derive provider/Drive review counts from existing data, expose them in
  a command summary, and link to existing sections.
- Edge cases: empty provider/Drive queues, empty rows, mobile widths, table
  overflow, loading/error states.

### 4. Execute Implementation
- Implementation notes: Added `AreaCommandSummary`, moved filters before dense
  route-body panels, anchored review/context/lifecycle/coverage/table
  sections, wrapped coverage highlights in a named section, and added
  responsive CSS for command cards and mobile density.

### 5. Verify and Test
- Validation performed: `npm run build`, `git diff --check`, `npm test` with
  disposable PostgreSQL on `localhost:55469`, and Playwright signed-in `/areas`
  smoke on `http://127.0.0.1:3116` at desktop, tablet, and mobile viewports.
- Result: pass.

### 6. Self-Review
- Simpler option considered: moving filters only. Rejected because it would not
  answer priority/review/next-action questions.
- Technical debt introduced: no planned debt.
- Scalability assessment: command summary can be reused by future route-body
  polish slices.
- Refinements made: moved the command summary above hero metrics after the
  first smoke showed it was still too low on mobile.

### 7. Update Documentation and Knowledge
- Docs updated: audit, task contract, design memory, task board, MVP queue,
  next steps, system health, module confidence, and project state.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `/areas` shows a route-body command summary before dense mapping panels.
- [x] Filters are reachable near the top before long review/detail sections.
- [x] Review queues, selected context, lifecycle, coverage, and table are
      linkable with stable anchors.
- [x] Desktop, tablet, and mobile proofs show no horizontal overflow, console
      issues, failed requests, or clipped primary controls.
- [x] Build, tests, and diff whitespace gates pass.

## Success Signal
- User or operator problem: the owner cannot quickly decide what needs area
  ownership work.
- Expected product or reliability outcome: `/areas` becomes a usable company
  management workbench instead of a long report.
- How success will be observed: responsive screenshots and browser checks show
  a command summary, early filters, and stable layout.
- Post-launch learning needed: yes.

## Deliverable For This Stage

Verified implementation and updated source-of-truth evidence for `/areas`.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI, API, CLI, or operator path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across all relevant layers.
- [x] Backend and UI/client error handling exists where applicable.
- [x] No existing functionality is broken.
- [x] Feature works after restart, reload, or navigation refresh where applicable.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal, reliability, security, and rollback evidence are recorded
      when applicable.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests: `npm run build`; `git diff --check`; `npm test` with
  `DATABASE_URL=postgresql://postgres:postgres@localhost:55469/companycore_test?schema=public`.
- Manual checks: Playwright signed-in `/areas` smoke at desktop `1366x900`,
  tablet `834x1112`, and mobile `390x844`.
- Screenshots/logs:
  `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis003-final2-desktop-areas.png`,
  `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis003-final2-tablet-areas.png`,
  and `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis003-final2-mobile-areas.png`.
- High-risk checks: no horizontal overflow, no console issues, no failed
  requests, four command cards, and zero unnamed visible controls.
- Module confidence ledger updated: yes.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes, existing `/areas` route contracts reused.
- DB schema and migrations verified: yes, `npm test` ran migrations against
  disposable PostgreSQL.
- Loading state verified: yes, existing route state remains unchanged and
  build/browser smoke passed.
- Error state verified: yes, existing route state remains unchanged and
  build/browser smoke passed.
- Refresh/restart behavior verified: yes, signed-in `/areas` loaded through
  the built server on `http://127.0.0.1:3116`.
- Regression check performed: build, test, and responsive browser smoke.

## Result Report

V2VIS-003 is verified. `/areas` now presents an owner-focused command summary,
early filters, section anchors, coverage framing, and responsive density polish
without backend contract changes. Remaining route-body UX cycles should target
the next dense workbench, likely `/settings/api` or `/settings/drive`.
