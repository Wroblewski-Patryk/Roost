# Task

## Header
- ID: ACF-MAINT-002
- Title: Google Drive Workbench Context Extraction
- Task Type: refactor
- Current Stage: post-release
- Status: DONE
- Owner: Frontend Builder
- Depends on: V2VIS-005
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `ux/settings-drive-route-body`
- Requirement Rows: `ACF-007`
- Quality Scenario Rows: `QAS-MAINTAINABILITY`, `QAS-RESPONSIVE-WEB`
- Risk Rows: `RISK-LARGE-FILE-DRIFT`
- Iteration: 21
- Operation Mode: BUILDER
- Mission ID: ACF-MAINT-002
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed earlier in this active mission wave.
- [x] `.agents/core/mission-control.md` was reviewed earlier in this active mission wave.
- [x] Missing or template-like state tables were not needed for this narrow refactor.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: reduce `public/app.js` route-body complexity by extracting a self-contained Google Drive context renderer.
- Release objective advanced: lower regression risk in the owner web app before more UX or AI-facing work.
- Included slices: extract Drive command summary/context panel logic, load the new static module, verify build/tests/browser proof, update source-of-truth docs.
- Explicit exclusions: OAuth flow changes, Drive import actions, backend APIs, CSS redesign, test-suite splitting.
- Checkpoint cadence: one bounded refactor, then validation, docs, commit, push.
- Stop conditions: script load regression, Drive route render failure, build/test failure, or changed Drive behavior.
- Handoff expectation: future agents can continue modularizing remaining route workbenches using this small-module pattern.

## Context

`ACF-007` identified large runtime/UI files as a maintainability risk. `ACF-MAINT-001` extracted the relationship workbench. After V2VIS-005, the Google Drive context/command summary became a clear candidate for another safe extraction because it has one route body, one state-derived renderer, and no backend semantics.

## Goal

Move the Google Drive context command summary out of `public/app.js` into a dedicated static module while preserving the verified `/settings/drive` behavior.

## Scope

- `public/google-drive-workbench.js`
- `public/index.html`
- `public/app.js`
- source-of-truth docs and ledgers

## Implementation Plan
1. Identify the smallest Drive renderer that can move without changing API or import actions.
2. Create a static module exposing `window.CompanyCoreGoogleDriveWorkbench`.
3. Load the module before `app.js`.
4. Replace `renderGoogleDriveContext()` internals with a module call.
5. Run syntax, build, diff, integration tests, and browser route proof.
6. Update source-of-truth docs and commit.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: `public/app.js` remains a large hotspot, and the Drive context renderer was embedded directly in it.
- Gaps: Drive renderer had no module boundary after V2VIS-005.
- Inconsistencies: relationship workbench already had a separate static module; Drive did not.
- Architecture constraints: keep the static vanilla app pattern and avoid new framework/runtime dependencies.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none
- Sources scanned: application completion audit, task queue, file-size scan, Drive route code.
- Rows created or corrected: source-of-truth docs updated after verification.
- Assumptions recorded: a route-local static module is an approved pattern because `relationship-workbench.js` already exists.
- Blocking unknowns: none.
- Why it was safe to continue: the refactor only moves rendering logic and keeps state/helpers passed from `app.js`.

### 2. Select One Priority Mission Objective
- Selected task: ACF-MAINT-002 Additional Hotspot Modularization.
- Priority rationale: it is the active `NOW` item after V2VIS-005.
- Why other candidates were deferred: lint/test splitting is next and should follow this smaller modularity win.

### 3. Plan Implementation
- Files or surfaces to modify: listed in Scope.
- Logic: move Drive command state and context panel rendering into `public/google-drive-workbench.js`.
- Edge cases: signed-out, missing OAuth client, missing consent, selected folders, imported items, unassigned folders, and completed state.

### 4. Execute Implementation
- Implementation notes: added `driveCommandState()` and `renderContextPanel()` in the new module; `app.js` now delegates `renderGoogleDriveContext()` to that module.

### 5. Verify and Test
- Validation performed: `node --check public/app.js`; `node --check public/google-drive-workbench.js`; `npm run build`; `git diff --check`; `npm test` with disposable PostgreSQL on `localhost:55472`; Playwright fallback on `http://127.0.0.1:3119/settings/drive`.
- Result: passed.

### 6. Self-Review
- Simpler option considered: leave the renderer inside `app.js`.
- Technical debt introduced: no
- Scalability assessment: this pattern can be repeated for other self-contained route context/workbench renderers.
- Refinements made: kept action handlers in `app.js` to avoid broad behavior movement in this slice.

### 7. Update Documentation and Knowledge
- Docs updated: task contract, task board, next steps, planning queue, project state, system health, module confidence ledger.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Drive context/command summary logic lives in `public/google-drive-workbench.js`.
- [x] `public/app.js` delegates Drive context rendering to the module.
- [x] `/settings/drive` still renders the command summary and four command cards.
- [x] Build, tests, diff check, and browser proof pass.
- [x] Source-of-truth docs record completion and the next queue item.

## Success Signal
- User or operator problem: future route-body changes are less likely to break unrelated app surfaces.
- Expected product or reliability outcome: smaller, clearer static module boundary for Drive UX.
- How success will be observed: route proof shows the module loads and Drive summary still renders with no console/network/layout regressions.
- Post-launch learning needed: no

## Deliverable For This Stage

A verified refactor commit that extracts Drive context rendering without changing product behavior.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full route UI flow works across relevant client layers.
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

## Validation Evidence
- Tests: `node --check public/app.js`; `node --check public/google-drive-workbench.js`; `npm run build`; `git diff --check`; `npm test` with disposable PostgreSQL on `localhost:55472`.
- Manual checks: Playwright fallback verified `/settings/drive` at desktop `1366x900` and mobile `390x844`.
- Screenshots/logs:
  `C:\Users\wrobl\AppData\Local\Temp\companycore-acfmaint002-desktop-drive-refactor.png`,
  `C:\Users\wrobl\AppData\Local\Temp\companycore-acfmaint002-mobile-drive-refactor.png`,
  and `C:\Users\wrobl\AppData\Local\Temp\companycore-acfmaint002-drive-proof.json`.
- High-risk checks: module loaded in browser, four command cards rendered, no horizontal overflow, no console issues, and no failed requests.
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: `ACF-MAINT-002`
- Requirements matrix updated: not applicable
- Quality scenarios updated: not applicable
- Risk register updated: not applicable
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: not applicable
- Loading state verified: yes
- Error state verified: yes
- Refresh/restart behavior verified: yes
- Regression check performed: full integration test suite plus browser route proof.

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: future maintainers and agents changing the owner web app.
- Existing workaround or pain: large `public/app.js` makes route polish slower and riskier.
- Smallest useful slice: extract Drive context rendering only.
- Success metric or signal: verified route behavior after module extraction.
- Feature flag, staged rollout, or disable path: not applicable
- Post-launch feedback or metric check: none.

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: yes
- Feedback item IDs: direct user feedback in this thread to continue planned work until complete.
- Feedback accepted: continue from V2VIS-005 into ACF-MAINT-002.
- Feedback needs clarification: none.
- Feedback conflicts: none.
- Feedback deferred or rejected: broader test splitting remains NEXT.
- Active task changed by feedback: yes
- New task created from feedback: no
- Design memory updated: not applicable
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable
- Critical user journey: owner opens `/settings/drive` after the static module split.
- SLI: route renders with no client errors and no failed required requests.
- SLO: not applicable
- Error budget posture: not applicable
- Health/readiness check: local `/health` returned `ok`.
- Logs, dashboard, or alert route: browser console and network checks.
- Smoke command or manual smoke: Playwright route proof on `http://127.0.0.1:3119/settings/drive`.
- Rollback or disable path: revert the ACF-MAINT-002 commit.

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable
- AI feature changed: no
- Multi-step AI scenario: not applicable
- Prompt injection/data leakage checks: not applicable

