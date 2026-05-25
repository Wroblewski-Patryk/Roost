# Task

## Header
- ID: V2VIS-001
- Title: Shared CompanyShell And Dashboard Frame
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Depends on: ACF-MAINT-001
- Priority: P1
- Coverage Ledger Rows: dashboard-shell, web-user-layout
- Module Confidence Rows: V2VIS-001
- Requirement Rows: REQ-V2VIS-001
- Quality Scenario Rows: QA-V2VIS-001
- Risk Rows: RISK-UX-001
- Iteration: 2026-05-14.2
- Operation Mode: BUILDER
- Mission ID: WEBFOUND-V2VIS-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed during the current work wave.
- [x] `.agents/core/mission-control.md` was reviewed during the current work wave.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: Add the first canonical post-login dashboard frame that makes workspace health, operating areas, relationship review, integrations, and MCP readiness visible from one screen.
- Release objective advanced: Improve web usability before V2 expansion by making the current V1 foundation easier to understand and operate.
- Included slices: dashboard company map markup, render logic, responsive styling, validation evidence, source-of-truth updates.
- Explicit exclusions: mobile native app, full Company City V2 game layer, new backend entities, new integration providers.
- Checkpoint cadence: Commit after validation passes and source-of-truth documents are updated.
- Stop conditions: Build/test failure, visual regression that prevents dashboard use, or architecture mismatch.
- Handoff expectation: A verified dashboard frame that can become the shared shell pattern for later route work.

## Context
The current web dashboard already has a command center and module links, but the screen still reads like a collection of admin panels instead of one operating surface. The user wants a useful post-login layout that helps manage everything the app touches, while keeping V2 gamification and Company City ideas as future layers.

## Goal
Create a canonical dashboard frame that gives the user an immediate map of the workspace, company areas, integration health, relationship review state, task pressure, and MCP agent access.

## Scope
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/*` files affected by task status and evidence
- `docs/planning/mvp-next-commits.md`
- `docs/planning/v2vis-001-task-contract.md`

## Implementation Plan
1. Inspect the existing dashboard, shared shell, render functions, and responsive CSS.
2. Add a dashboard company map frame using real workspace, operating model, relationship, integration, task, and MCP data.
3. Keep the frame responsive for desktop, tablet, and mobile without changing backend contracts.
4. Run syntax, build, tests, and browser smoke proof.
5. Update source-of-truth documents with evidence and next queue status.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Dashboard had useful pieces but no single operating map that explained workspace state at a glance.
- Gaps: Company areas, integrations, relationship review, and MCP readiness were distributed across separate cards and modules.
- Inconsistencies: The layout did not yet express the future workspace/city mental model in a reusable V1-safe way.
- Architecture constraints: Reuse existing public web shell and existing client state only; do not add backend schemas.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none blocking this slice
- Sources scanned: `public/index.html`, `public/app.js`, `public/styles.css`, planning and state files from the current work wave
- Rows created or corrected: pending verification update
- Assumptions recorded: It is safe to add a frontend-only dashboard frame because it reads existing state and does not alter data contracts.
- Blocking unknowns: none for this slice
- Why it was safe to continue: The implementation surface is limited to the existing web dashboard and source-of-truth updates.

### 2. Select One Priority Mission Objective
- Selected task: V2VIS-001 Shared CompanyShell And Dashboard Frame
- Priority rationale: The user explicitly asked to continue fixing the remaining gaps toward a 100% usable web foundation.
- Why other candidates were deferred: Additional modularization and deeper route polish are valuable, but the dashboard frame is the highest UX leverage slice.

### 3. Plan Implementation
- Files or surfaces to modify: Dashboard markup, dashboard render logic, dashboard CSS, planning/state docs.
- Logic: Derive area readiness, status strip values, and command brief from existing client state.
- Edge cases: Signed-out state, empty operating model, missing MCP manifest, unavailable integrations, mobile wrapping.

### 4. Execute Implementation
- Implementation notes: Added a dashboard Company map frame, derived status
  pills, area readiness cards, command brief metrics, responsive styling, and
  query-preserving shared `data-link` navigation for area deep links.

### 5. Verify and Test
- Validation performed: `node --check public/app.js`; `node --check
  public/relationship-workbench.js`; `git diff --check`; `npm test` against
  disposable PostgreSQL on `localhost:55465`; Playwright fallback proof on
  `http://127.0.0.1:3000`.
- Result: Passed. Dashboard proof covered desktop `1366x900`, tablet
  `834x1112`, and mobile `390x844`, with 13 area cards, 4 status pills, no
  overflow, no clipped cards, no console issues, and no failed requests.
  Desktop interaction clicked the Company map into `/areas?area=main-general`
  and verified `/relationships` still loaded after the extracted relationship
  module.

### 6. Self-Review
- Simpler option considered: Styling only the existing command cards.
- Technical debt introduced: no
- Scalability assessment: The frame is intentionally data-driven and can later be extracted into a shared shell module.
- Refinements made: Tightened desktop card grid after screenshot review,
  shortened the relationship status label, and reused `areaDefinitionFor()` so
  area labels match canonical department labels.

### 7. Update Documentation and Knowledge
- Docs updated: task board, project state, active queue, requirement matrix,
  quality scenarios, risk register, system health, module confidence ledger.
- Context updated: yes
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] Dashboard shows a company map frame with real workspace, area, relationship, integration, task, and MCP signals.
- [x] Desktop, tablet, and mobile layouts render without horizontal overflow or hidden critical copy.
- [x] Existing dashboard command center, module launch, routes, and relationship workbench still work.
- [x] Build, test, and browser smoke evidence is recorded.
- [x] Source-of-truth documents identify the completed slice and next priority.

## Success Signal
- User or operator problem: The dashboard should immediately answer what matters now, what is blocked, and where the next action lives.
- Expected product or reliability outcome: The web foundation becomes easier to operate and safer to extend before V2.
- How success will be observed: Browser smoke proof confirms the dashboard frame renders on desktop, tablet, and mobile without console failures or overflow.
- Post-launch learning needed: yes

## Deliverable For This Stage
A verified dashboard company map frame and updated source-of-truth records.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior
- implement features as a vertical slice across UI, logic, API, DB, validation, error handling, and tests when the task affects runtime behavior

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
- [x] Success signal, reliability, security, and rollback evidence are recorded when applicable.
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
