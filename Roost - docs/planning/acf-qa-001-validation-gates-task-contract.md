# Task

## Header
- ID: ACF-QA-001
- Title: Validation Gate Entrypoints
- Task Type: refactor
- Current Stage: post-release
- Status: DONE
- Owner: QA/Test + Backend Builder
- Depends on: ACF-MAINT-002
- Priority: P2
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `qa/validation-gates`
- Requirement Rows: `ACF-014`
- Quality Scenario Rows: `QAS-TESTABILITY`, `QAS-MAINTAINABILITY`
- Risk Rows: `RISK-VALIDATION-DRIFT`
- Iteration: 22
- Operation Mode: BUILDER
- Mission ID: ACF-QA-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed earlier in this active mission wave.
- [x] `.agents/core/mission-control.md` was reviewed earlier in this active mission wave.
- [x] Missing or template-like state tables were not needed for this narrow QA slice.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: add explicit validation entrypoints for public JS syntax and API integration tests.
- Release objective advanced: make pre-commit quality gates clearer and less dependent on remembered one-off commands.
- Included slices: package scripts, testing docs, project state validation contract, source-of-truth evidence.
- Explicit exclusions: adding a new lint dependency, splitting `src/tests/api.test.ts` into multiple files, CI provider changes.
- Checkpoint cadence: implement scripts, run gates, document, commit, push.
- Stop conditions: any gate failure or mismatch with existing local development contract.
- Handoff expectation: future agents can use `npm run validate`, `npm run check:public-js`, and `npm run test:api` directly.

## Context

`ACF-014` identified that validation was effective but too coarse: no explicit lint/static gate existed, and the API integration suite only had the broad `npm test` command. After route-module extraction introduced multiple public JS modules, a public JS syntax gate became valuable.

## Goal

Add small, dependency-free validation scripts that make static public JS checks and API integration tests explicit.

## Scope

- `package.json`
- `.codex/context/PROJECT_STATE.md`
- `docs/engineering/testing.md`
- source-of-truth queue and ledger docs

## Implementation Plan
1. Add `check:public-js` for current public static JS modules.
2. Add `test:api` as an explicit API integration test entrypoint.
3. Keep `npm test` delegating to the API gate for compatibility.
4. Make `npm run validate` run static public JS checks before build.
5. Update validation documentation.
6. Run every new gate and the DB-backed API test gate.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: validation commands existed but did not name public JS syntax checks or API test entrypoints.
- Gaps: new static modules could be added without a named syntax gate.
- Inconsistencies: documentation still said lint was not configured.
- Architecture constraints: avoid adding a new toolchain dependency in this small slice.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none
- Sources scanned: `package.json`, project state validation commands, testing docs.
- Rows created or corrected: source-of-truth docs updated after verification.
- Assumptions recorded: Node's syntax checker is the correct lightweight static gate until an approved lint tool is added.
- Blocking unknowns: none.
- Why it was safe to continue: scripts preserve existing `npm test` behavior while adding clearer aliases.

### 2. Select One Priority Mission Objective
- Selected task: ACF-QA-001 Lint And Split Test Gates.
- Priority rationale: it became the active `NOW` item after ACF-MAINT-002.
- Why other candidates were deferred: deployment automation proof is next and should remain separate from local validation ergonomics.

### 3. Plan Implementation
- Files or surfaces to modify: listed in Scope.
- Logic: `check:public-js` checks `public/app.js`, `public/relationship-workbench.js`, and `public/google-drive-workbench.js`; `test:api` builds, migrates, and runs `dist/tests/api.test.js`.
- Edge cases: keep `npm test` compatible for existing documentation and agent habits.

### 4. Execute Implementation
- Implementation notes: added the scripts and updated validation documentation.

### 5. Verify and Test
- Validation performed: `npm run check:public-js`; `npm run validate`; `git diff --check`; `npm run test:api` with disposable PostgreSQL on `localhost:55473`.
- Result: passed.

### 6. Self-Review
- Simpler option considered: document ad hoc `node --check` commands only.
- Technical debt introduced: no
- Scalability assessment: scripts can later expand to ESLint or split test files without breaking command names.
- Refinements made: kept `npm test` as the compatibility wrapper.

### 7. Update Documentation and Knowledge
- Docs updated: project state, testing docs, task contract, task board, planning queue, system health, module confidence ledger.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `npm run check:public-js` exists and checks all current public JS modules.
- [x] `npm run test:api` exists and runs the API integration test gate.
- [x] `npm test` still works by delegating to `test:api`.
- [x] `npm run validate` includes the public JS static check before build.
- [x] Documentation records the new validation commands.

## Success Signal
- User or operator problem: future agents have fewer hidden quality-gate commands to remember.
- Expected product or reliability outcome: validation is more discoverable and less likely to skip static JS syntax after module extraction.
- How success will be observed: all new scripts pass locally with a disposable database for API tests.
- Post-launch learning needed: no

## Deliverable For This Stage

Verified validation entrypoints and synchronized documentation.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through real CLI validation paths.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal and rollback evidence are recorded.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `npm run check:public-js`; `npm run validate`; `git diff --check`; `npm run test:api` with disposable PostgreSQL on `localhost:55473`.
- Manual checks: script output and migration/test pass reviewed.
- Screenshots/logs: command output in Codex tool transcript.
- High-risk checks: `npm test` compatibility preserved through delegation; disposable PostgreSQL container removed after the run.
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: `ACF-QA-001`
- Requirements matrix updated: not applicable
- Quality scenarios updated: not applicable
- Risk register updated: not applicable
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: yes
- Loading state verified: not applicable
- Error state verified: not applicable
- Refresh/restart behavior verified: not applicable
- Regression check performed: API integration suite and build.

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: agents and developers preparing commits.
- Existing workaround or pain: remembering separate `node --check` commands for public JS modules.
- Smallest useful slice: add explicit scripts without new dependencies.
- Success metric or signal: all scripts pass locally.
- Feature flag, staged rollout, or disable path: not applicable
- Post-launch feedback or metric check: none.

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: yes
- Feedback item IDs: direct user feedback in this thread to continue planned work until complete.
- Feedback accepted: continue queue after ACF-MAINT-002.
- Feedback needs clarification: none.
- Feedback conflicts: none.
- Feedback deferred or rejected: full physical split of `src/tests/api.test.ts` remains future work.
- Active task changed by feedback: yes
- New task created from feedback: no
- Design memory updated: not applicable
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable
- Critical user journey: contributor runs local pre-commit gates.
- SLI: validation command exits `0` when code is healthy.
- SLO: not applicable
- Error budget posture: not applicable
- Health/readiness check: not applicable
- Logs, dashboard, or alert route: CLI output.
- Smoke command or manual smoke: `npm run validate` and `npm run test:api`.
- Rollback or disable path: revert the ACF-QA-001 commit.

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable
- AI feature changed: no
- Multi-step AI scenario: not applicable
- Prompt injection/data leakage checks: not applicable

