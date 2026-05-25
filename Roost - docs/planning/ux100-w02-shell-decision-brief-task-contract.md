# Task

## Header
- ID: UX100-W02
- Title: Shell Decision Brief And Mobile Quick Actions
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: UX100-W01
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Owner web UX
- Requirement Rows: UX100-S003, UX100-S004, UX100-S006, UX100-S007, UX100-S008
- Quality Scenario Rows: usability, accessibility, responsive web, AI readiness visibility
- Risk Rows: mobile navigation density, duplicated shell model
- Iteration: UX100 wave 02
- Operation Mode: BUILDER
- Mission ID: UX100-W02-shell-decision-brief
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: extend the existing authenticated shell command strip into a route-aware decision brief and add explicit mobile quick actions.
- Release objective advanced: make the web foundation useful and predictable before V2 Company City/gamification work.
- Included slices: route decision signal derivation, shared mobile quick actions, responsive/accessibility proof, source-of-truth updates.
- Explicit exclusions: no new shell framework, no Company City visuals, no fake provider data, no new agent write affordances.
- Checkpoint cadence: update this contract after implementation and after validation.
- Stop conditions: stop if the current shell cannot support the behavior without a parallel navigation model or if real state cannot safely drive the signals.
- Handoff expectation: UX100-W03 can build provenance and AI-safety labels on top of the same route/signal vocabulary.

## Context
UX100-W01 proved a dashboard owner decision board. UX100-W02 applies the same "what matters now, what is blocked, what is next" standard to the shared authenticated route frame so every private route starts with useful operating context, especially on mobile.

## Goal
Authenticated web routes should expose a state-derived shell decision brief and a mobile quick-action rail for the highest-frequency owner intents: map, brief, data, tasks, and settings.

## Scope
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `docs/ux/design-memory.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/next-steps.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`
- `docs/planning/mvp-next-commits.md`
- this task contract

## Implementation Plan
1. Reuse the current `route-command-strip` and route metadata.
2. Derive route-specific review/blocked/success signals from real workspace, task, relationship, Drive, API key, and MCP state.
3. Add a mobile quick-action rail inside the existing shell, not a separate shell.
4. Validate desktop, tablet, and mobile route frames with real navigation.
5. Update UX memory and canonical queue/state files.

## Acceptance Criteria
- [x] The route command strip shows state-derived signal text and tone after workspace data loads.
- [x] Mobile private routes expose quick actions for Map, Brief, Data, Tasks, and Settings without horizontal overflow.
- [x] Desktop, tablet, and mobile proof covers at least `/dashboard`, `/areas`, `/relationships`, `/data/tasks`, `/settings/api`, and `/settings/drive`.
- [x] Existing build, public JS check, API tests, and whitespace checks pass.
- [x] Source-of-truth files identify UX100-W03 as the next active wave.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] No existing functionality is broken.
- [x] Feature works after reload and route navigation.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `npm run check:public-js`: passed.
  - `npm run validate`: passed.
  - `git diff --check`: passed, with Windows CRLF warnings only.
  - `npm run test:api`: passed against portable PostgreSQL on
    `localhost:55475`.
- Manual checks:
  - Playwright fallback against local QA server
    `http://127.0.0.1:3121`: passed for `/dashboard`, `/areas`,
    `/relationships`, `/data/tasks`, `/settings/api`, and `/settings/drive`
    at desktop `1366x900`, tablet `834x1112`, and mobile `390x844`.
- Screenshots/logs:
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-ux100w02-verified\report.json`
  - Representative screenshots in
    `C:\Users\wrobl\AppData\Local\Temp\companycore-ux100w02-verified\`.
- High-risk checks:
  - No horizontal overflow in the checked route/viewport matrix.
  - No browser console issues.
  - No failed requests against the local QA server.
  - Zero unnamed visible controls.
  - Desktop quick rail hidden; tablet/mobile quick rail visible with five
    actions.
  - Route command title, matter, blocked signal, and tone present on every
    checked route.
- Coverage ledger updated: not applicable
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: UX100-W02 added as VERIFIED.
- Requirements matrix updated: not applicable
- Quality scenarios updated: not applicable
- Risk register updated: not applicable
- Reality status: verified

## Result Report
- Task summary: Implemented a state-derived shell decision brief and mobile
  quick actions inside the existing authenticated shell.
- Files changed:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/LEARNING_JOURNAL.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/ux/design-memory.md`
  - `docs/planning/ux100-w02-shell-decision-brief-task-contract.md`
- How tested: static public JS check, build/typecheck validate command,
  whitespace check, and Playwright fallback route/viewport proof passed.
- What is incomplete: nothing for the W02 scope.
- Next steps: start UX100-W03 Relationship/Data Provenance And AI Safety
  Labels.
