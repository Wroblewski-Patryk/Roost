# Task

## Header
- ID: V2VIS-002
- Title: Route Frame Convergence And Usability Repair
- Task Type: design | fix
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: ACF-UX-003
- Priority: P1
- Coverage Ledger Rows: UI shell, owner web routes, React route shell
- Module Confidence Rows: authenticated web shell, React private routes
- Requirement Rows: REQ-V2VIS-002
- Quality Scenario Rows: QA-V2VIS-002
- Risk Rows: RISK-V2VIS-002
- Iteration: 2026-05-15-01
- Operation Mode: BUILDER
- Mission ID: V2VIS-002
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed through the project
      startup protocol.
- [x] Missing or template-like state tables were not found in the active scope.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by reducing route-to-route UX drift.

## Mission Block
- Mission objective: make private web routes more useful and coherent by
  applying the repaired CompanyCore shell pattern to vanilla and React route
  frames.
- Release objective advanced: pre-V2 web/backend/MCP foundation quality.
- Included slices: route audit, reusable route command strip, React shell frame
  convergence, responsive proof, source-of-truth updates.
- Explicit exclusions: no Company City V3/gameification implementation, no
  backend/API/schema changes, no broad React route rewrite.
- Checkpoint cadence: after audit, after implementation, after validation.
- Stop conditions: build failure that cannot be resolved inside shell scope,
  architecture mismatch requiring a new route ownership decision, or failed
  real route proof.
- Handoff expectation: leave the next route polish target in planning files.

## Context
The user reported that the sidebar and header remained weak after the first
repair. ACF-UX-003 improved the vanilla shell, but React routes still use a
separate header-only shell and many private views still lack a consistent
answer to what matters now, what is blocked, and what the next action is.

## Goal
Converge the private route frame so every major web surface feels like part of
one CompanyCore management application and gives the owner faster orientation.

## Scope
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `web/src/react-route-kit.tsx`
- `docs/ux/route-frame-usability-audit-2026-05-15.md`
- relevant planning, state, and UX source-of-truth files

## Implementation Plan
1. Inspect route ownership, current shell patterns, and UX source-of-truth.
2. Publish a 100-item route-frame usability audit with fix mapping.
3. Add a reusable vanilla route command strip for private routes.
4. Convert the shared React shell from a header-only frame to a company
   command shell with left orientation, quick actions, and status.
5. Validate build/test and run desktop/tablet/mobile route render proof.
6. Update source-of-truth files and close with evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: private vanilla routes and React routes still teach different chrome;
  several workbenches start with page-local titles but no persistent command
  brief; route purpose, blocked state, and next action are not consistently
  available.
- Gaps: no shared React left rail; no route-level command strip across vanilla
  routes; route audit was not yet captured as a durable 100-item list.
- Inconsistencies: `/areas` is canonical React on direct refresh while vanilla
  still contains an in-app `/areas` view for SPA navigation.
- Architecture constraints: reuse existing hybrid vanilla/React migration; no
  backend rewrite; no fake data; keep V2 game visuals deferred.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none in active scope
- Sources scanned: `.agents/core/project-memory-index.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, UX source-of-truth docs, `public/`,
  `web/src/`, and `src/app.ts`.
- Rows created or corrected: REQ-V2VIS-002, QA-V2VIS-002, V2VIS-002 module
  confidence row, and RISK-APP-AUDIT-007 mitigation update.
- Assumptions recorded: safe assumption that the next best slice is shell/frame
  convergence, because it is already active in `NOW`.
- Blocking unknowns: none.
- Why it was safe to continue: user explicitly requested implementation and
  current planning queue names this route-frame convergence as `NOW`.

### 2. Select One Priority Mission Objective
- Selected task: V2VIS-002 Route Frame Convergence And Usability Repair.
- Priority rationale: it repairs a cross-route usability defect affecting all
  owner work rather than polishing one isolated screen.
- Why other candidates were deferred: maintainability modularization remains
  important but does not directly address the user's current UX pain.

### 3. Plan Implementation
- Files or surfaces to modify: vanilla shell HTML/CSS/JS and shared React shell.
- Logic: central route metadata drives command strip copy and actions; React
  shell uses the same lane model as the vanilla command rail.
- Edge cases: signed-out routes, data-table subroutes, mobile/tablet overflow,
  long workspace names, unavailable connection data, and React routes without a
  connection payload.

### 4. Execute Implementation
- Implementation notes: Added the 100-item route-frame audit, a route metadata
  driven vanilla command strip, and a React company command shell with desktop
  rail, grouped navigation, workspace status, compact topbar, and mobile
  shortcut rail. Fixed accessible names and mobile notice layout issues found
  during proof.

### 5. Verify and Test
- Validation performed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test`, and Playwright fallback route proof against
  `http://127.0.0.1:3115`.
- Result: passed.

### 6. Self-Review
- Simpler option considered: polish only CSS on existing headers.
- Technical debt introduced: no.
- Scalability assessment: route metadata centralizes vanilla command-strip
  behavior; React shell still belongs in the existing route kit until a later
  modularization task extracts it.
- Refinements made: added missing ARIA labels and replaced narrow mobile React
  alert grids with a readable notice layout.

### 7. Update Documentation and Knowledge
- Docs updated: task contract, route audit, design memory, project state, task
  board, planning queue, module confidence, requirement matrix, quality
  scenarios, risk register, system health, and next steps.
- Context updated: yes.
- Learning journal updated: not applicable unless validation finds a recurring
  pitfall.

## Acceptance Criteria
- [x] A 100-item route-frame usability audit exists and maps issues to route
      frame repairs.
- [x] Vanilla private routes have a consistent command strip with current
      matter, blocked/review signal, next action, and quick actions.
- [x] Shared React private routes no longer rely on a header-only navigation
      model and show company/workbench/integration/workspace orientation.
- [x] Desktop, tablet, and mobile route proof reports no horizontal overflow,
      no failed requests, and no relevant console errors.

## Success Signal
- User or operator problem: the owner does not feel lost or forced to decode
  route-local chrome.
- Expected product or reliability outcome: private routes feel more coherent,
  more useful, and more AI/MCP-foundation aligned.
- How success will be observed: screenshots and route metrics across vanilla
  and React private routes.
- Post-launch learning needed: yes

## Deliverable For This Stage
Implemented shell/frame convergence slice with validation evidence and durable
UX/source-of-truth updates.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered
  behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] No existing functionality is broken.
- [x] Feature works after restart, reload, and navigation refresh.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
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
  `npm test` with disposable PostgreSQL on `localhost:55468`.
- Manual checks: Playwright fallback covered representative vanilla and React
  private routes at desktop `1366x900`, tablet `834x1112`, and mobile
  `390x844`.
- Screenshots/logs: `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis002-final-*`
  and `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis002-final-mobile-areas-polished.png`.
- High-risk checks: no horizontal overflow, no failed requests, no relevant
  console errors/warnings, and zero unnamed visible controls.
- Coverage ledger updated: not applicable
- Module confidence ledger updated: yes
- Requirements matrix updated: yes
- Quality scenarios updated: yes
- Risk register updated: yes
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: not applicable
- DB schema and migrations verified: not applicable
- Loading state verified: yes
- Error state verified: not changed; existing user-language notices preserved
- Refresh/restart behavior verified: yes, direct route refresh used
- Regression check performed: `npm test` plus Playwright route proof

## UX/UI Evidence
- Design source type: approved_snapshot
- Design source reference:
  `docs/ux/authenticated-shell-layout-audit-2026-05-14.md`,
  `docs/ux/design-system-contract.md`, and ACF-UX-003 verified screenshots.
- Canonical visual target: pre-V2 CompanyCore operating shell.
- Fidelity target: structurally_faithful
- Evidence-driven UX review used: yes
- Primary user question answered within 3 seconds: yes
- Next action visibility: yes
- Blocked-state visibility: yes
- Stitch used: no
- Experience-quality bar reviewed: yes
- Visual-direction brief reviewed: yes
- Existing shared pattern reused: Company Command Rail Repair.
- New shared pattern introduced: route command strip for vanilla private routes.
- Design-memory update required: yes
- Pattern-gallery reference: authenticated shell, command brief, workbench rows.
- Visual gap audit completed: yes
- Background or decorative asset strategy: no decorative asset changes.
- Canonical asset extraction required: no
- Screenshot comparison pass completed: yes
- Remaining mismatches: deeper route body polish remains future work
- Anti-patterns checked: yes
- Screen-quality checklist reviewed: yes
- UI scorecard used: no
- Surface strategy checked: mobile | tablet | desktop
- State checks: loading | empty | error | success
- Feedback locality checked: yes
- Raw technical errors hidden from end users: not applicable
- Responsive checks: desktop, tablet, mobile
- Input-mode checks: touch | pointer | keyboard
- Accessibility checks: zero unnamed visible controls in representative proof
- Parity evidence: structurally faithful to ACF-UX-003 Company Command Rail

## Deployment / Ops Evidence
- Deploy impact: low
- Env or secret changes: none
- Health-check impact: none
- Smoke steps updated: not applicable
- Rollback note: revert the UI commit.
- Observability or alerting impact: none
- Staged rollout or feature flag: not applicable
- `DEPLOYMENT_GATE.md` reviewed: yes

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Operation mode was selected according to iteration rotation.
- [x] Current stage is declared and respected.
- [x] Deliverable for the current stage is complete.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Integration checklist evidence is attached where applicable.
- [x] Deployment gate evidence is attached where applicable.
- [x] Definition of Done evidence is attached.
- [x] Relevant validations were run.
- [x] Docs or context were updated if repository truth changed.

## Result Report
- Task summary: implemented the first route-frame convergence repair across
  vanilla and React authenticated web surfaces.
- Files changed: `public/index.html`, `public/app.js`, `public/styles.css`,
  `web/src/react-route-kit.tsx`, `web/src/main.tsx`, `web/src/styles.css`,
  generated React assets, and source-of-truth docs/state files.
- How tested: syntax, build, diff check, test suite, and responsive Playwright
  route proof.
- What is incomplete: deeper route-body UX polish remains future work.
- Next steps: ACF-MAINT-002 or V2VIS-003 route body polish candidate.
- Decisions made: fix shared route-frame defects before broad route-body
  rewrites.

## Notes
The request said to catch "100 things" in every view. This task captures 100
route-frame issues across the current authenticated web route set and fixes the
repeatable shell-level classes of defects first, because that improves every
view without unsafe broad rewrites.

