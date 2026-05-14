# Task

## Header
- ID: V2VIS-005
- Title: Settings Drive Route Body UX Polish Cycle
- Task Type: design
- Current Stage: post-release
- Status: DONE
- Owner: Frontend Builder
- Depends on: V2VIS-004
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `ux/settings-drive-route-body`
- Requirement Rows: `UX-AUTH-SHELL`, `UX-PROVIDER-SETUP`
- Quality Scenario Rows: `QAS-USABILITY`, `QAS-RESPONSIVE-WEB`, `QAS-A11Y`
- Risk Rows: `RISK-UX-WORKBENCH-DENSITY`, `RISK-AI-CONTEXT-QUALITY`
- Iteration: 20
- Operation Mode: TESTER
- Mission ID: V2VIS-005
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed in this mission wave before selecting the V2VIS queue.
- [x] `.agents/core/mission-control.md` was reviewed in this mission wave for long-running work.
- [x] Missing or template-like state tables were not needed for this narrow route-body slice.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: make `/settings/drive` a decision-led Google Drive setup and import surface.
- Release objective advanced: improve web owner usability before V2 Company City and gamification planning proceeds into implementation.
- Included slices: route audit, route-body command summary, stable anchors, responsive CSS, docs, browser proof.
- Explicit exclusions: Google OAuth backend changes, Drive provider behavior, production deployment, mobile native app, V2 Company City visuals.
- Checkpoint cadence: complete implementation, then verify, document, commit, and push.
- Stop conditions: build/test failure, browser regression, architecture mismatch, or any need to change Drive data semantics.
- Handoff expectation: future agents can continue from updated UX docs, task board, module confidence, and planning queue.

## Context

The Google Drive route is foundational for imported company knowledge and future AI/MCP use. The previous version exposed setup controls and context pills, but the route body did not make the staged workflow clear enough: connect OAuth, select folders, import files, then assign folders to operating areas.

## Goal

Add a canonical route-body command summary to `/settings/drive` so owners can immediately see the current Drive setup priority, blockers, readiness counts, and next actions across desktop, tablet, and mobile.

## Scope

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `docs/ux/settings-drive-route-body-usability-audit-2026-05-15.md`
- `docs/planning/v2vis-005-settings-drive-route-body-polish-task-contract.md`
- affected source-of-truth state docs after verification

## Implementation Plan
1. Inspect existing Drive route markup, state rendering, and route command strip.
2. Record a 100-finding UX audit for the route body.
3. Add stable section anchors for folder selection and imported file review.
4. Add a command summary derived from existing `state.googleDrive` values.
5. Add scoped responsive CSS for desktop, tablet, and mobile.
6. Run syntax, build, tests, diff, and browser responsive proof.
7. Update source-of-truth docs, commit, and push.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: the route body was form-first and did not prioritize the staged workflow.
- Gaps: no stable anchors for picker/import review; no local command summary.
- Inconsistencies: context pills exposed counts but did not translate them into action.
- Architecture constraints: reuse existing vanilla static app and Drive state; no backend changes.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none for this slice
- Sources scanned: Drive route markup, Drive context renderer, current CSS, planning/task state from the active queue.
- Rows created or corrected: pending after verification.
- Assumptions recorded: existing Drive state is the source of truth for UI readiness.
- Blocking unknowns: none.
- Why it was safe to continue: this is a route-body UX enhancement that does not change data semantics.

### 2. Select One Priority Mission Objective
- Selected task: V2VIS-005 Settings Drive Route Body UX Polish Cycle.
- Priority rationale: it is the next `NOW` queue item and closes the planned V2VIS route-body polish sequence before maintenance tasks.
- Why other candidates were deferred: ACF-MAINT-002 is next after this route is verified and committed.

### 3. Plan Implementation
- Files or surfaces to modify: listed in Scope.
- Logic: staged priority derivation from auth, OAuth client, OAuth token, selected folder IDs, imported files, and unassigned folders.
- Edge cases: signed-out, missing OAuth client, client saved without token, selected folders without import, imported folders without area ownership, fully mapped state.

### 4. Execute Implementation
- Implementation notes: Added `drive-command-summary`, four command cards, command action links, and stable section anchors.

### 5. Verify and Test
- Validation performed: `node --check public/app.js`; `npm run build`; `git
  diff --check`; `npm test` with disposable PostgreSQL on `localhost:55471`;
  Playwright fallback on `http://127.0.0.1:3118/settings/drive` at desktop,
  tablet, and mobile.
- Result: passed.

### 6. Self-Review
- Simpler option considered: only renaming existing pills.
- Technical debt introduced: no
- Scalability assessment: command card pattern can support future provider setup screens without backend changes.
- Refinements made: used existing state helpers and `bindInlineNavigation`.

### 7. Update Documentation and Knowledge
- Docs updated: audit, task contract, design memory, system health, module
  confidence ledger, project state, task board, and next-commits queue.
- Context updated: yes.
- Learning journal updated: not applicable; no recurring validation pitfall was
  found.

## Acceptance Criteria
- [x] `/settings/drive` shows a Drive import command summary derived from real state.
- [x] The route has stable anchors for setup, folder selection, and imported file review.
- [x] Desktop, tablet, and mobile layouts show no horizontal overflow, console errors, failed requests, or unnamed visible controls.
- [x] Build, tests, and whitespace checks pass.
- [x] Source-of-truth docs record the result and next queue item.

## Success Signal
- User or operator problem: owners can understand what is missing before Drive knowledge is safe for AI/MCP use.
- Expected product or reliability outcome: Drive import setup becomes staged, scannable, and less error-prone.
- How success will be observed: browser proof across responsive sizes plus command summary/card visibility.
- Post-launch learning needed: no

## Deliverable For This Stage

A verified route-body UX improvement with evidence and updated canonical queue docs.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full route UI flow works across relevant client layers.
- [x] UI error and disabled states remain honest.
- [x] No existing functionality is broken.
- [x] Feature works after navigation refresh.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal and rollback evidence are recorded.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Forbidden
- new systems without approval
- duplicated logic or parallel implementations of the same contract
- temporary bypasses, hacks, or workaround-only paths
- architecture changes without explicit approval
- implicit stage skipping

## Validation Evidence
- Tests: `node --check public/app.js`; `npm run build`; `git diff --check`;
  `npm test` with disposable PostgreSQL on `localhost:55471`.
- Manual checks: Playwright fallback verified `/settings/drive` at desktop
  `1366x900`, tablet `834x1112`, and mobile `390x844`.
- Screenshots/logs:
  `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis005-final-desktop-settings-drive.png`,
  `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis005-final-tablet-settings-drive.png`,
  `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis005-final-mobile-settings-drive.png`,
  and `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis005-drive-proof.json`.
- High-risk checks: no horizontal overflow, no console issues, no failed
  requests, four command cards, working folder-picker anchor, stable setup and
  imported-files anchors, and zero unnamed visible controls.
- Coverage ledger updated: not applicable
- Coverage rows closed or changed: not applicable
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: `ux/settings-drive-route-body`
- Requirements matrix updated: not applicable for this narrow UI route-body slice
- Requirement rows closed or changed: not applicable
- Quality scenarios updated: not applicable
- Quality scenario rows closed or changed: not applicable
- Risk register updated: not applicable
- Risk rows closed or changed: not applicable
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: not applicable
- Loading state verified: yes
- Error state verified: yes
- Refresh/restart behavior verified: yes
- Regression check performed: full integration test suite plus responsive
  browser route proof.

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: owner configuring Drive and future AI/MCP knowledge.
- Existing workaround or pain: infer next action from long setup form and low-hierarchy status pills.
- Smallest useful slice: route-body command summary and anchors.
- Success metric or signal: successful responsive browser proof and no route regressions.
- Feature flag, staged rollout, or disable path: not applicable
- Post-launch feedback or metric check: monitor owner feedback after deployment.

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: yes
- Feedback item IDs: direct user feedback in this thread requesting continued UX improvements.
- Feedback accepted: improve weak authenticated web UX until planned queue is complete.
- Feedback needs clarification: none for this slice.
- Feedback conflicts: none.
- Feedback deferred or rejected: V2 game/city visuals remain future scope.
- Active task changed by feedback: yes
- New task created from feedback: yes
- Design memory updated: yes
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable
- Critical user journey: owner signs in and reviews Drive setup readiness.
- SLI: route renders with no client errors and no failed required requests in browser proof.
- SLO: not applicable for static route-body UI.
- Error budget posture: not applicable
- Health/readiness check: local `/health` returned `ok` before browser proof.
- Logs, dashboard, or alert route: browser console and network checks.
- Smoke command or manual smoke: Playwright route proof on
  `http://127.0.0.1:3118/settings/drive`.
- Rollback or disable path: revert V2VIS-005 commit.

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable
- AI feature changed: no
- Multi-step AI scenario: not applicable
- Prompt injection/data leakage checks: not applicable
