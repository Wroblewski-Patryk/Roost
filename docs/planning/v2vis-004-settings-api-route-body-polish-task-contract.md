# Task

## Header
- ID: V2VIS-004
- Title: Settings API Route Body UX Polish
- Task Type: design
- Current Stage: release
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: V2VIS-003
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: V2VIS-004 Owner web UX
- Requirement Rows: UX route-body usability, agent-access safety
- Quality Scenario Rows: mobile/tablet/desktop usability, safety clarity
- Risk Rows: service-key misuse, broad key review, MCP supervision clarity
- Iteration: 12
- Operation Mode: ARCHITECT
- Mission ID: V2VIS-004
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed through the active
      queue and state files from the previous cycle.
- [x] `.agents/core/mission-control.md` rules are represented by this bounded
      mission block.
- [x] Missing or template-like state tables were confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: make `/settings/api` communicate agent-access safety,
  review pressure, and next actions before service-key creation controls.
- Release objective advanced: pre-V2 web/backend/MCP foundation usability and
  AI-safe owner handoff.
- Included slices: 100-point audit, safety command summary, command cards,
  section anchors, responsive CSS, validation, and source-of-truth updates.
- Explicit exclusions: backend key model changes, new MCP routes, new
  capability taxonomy, production deploy.
- Checkpoint cadence: audit, implementation, verification, documentation.
- Stop conditions: broken key list rendering, failing build/test gate,
  horizontal overflow, or unsafe raw key display regression.
- Handoff expectation: future route-body cycles can continue from V2VIS-005.

## Context

V2VIS-003 established the route-body command summary pattern on `/areas`.
`/settings/api` is the next high-value route because it controls agent service
keys and MCP exposure.

## Goal

Polish `/settings/api` so the owner can quickly judge whether agent access is
safe, what needs review, and where to act before copying a key to another
system.

## Scope

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `docs/ux/settings-api-route-body-usability-audit-2026-05-15.md`
- `docs/planning/v2vis-004-settings-api-route-body-polish-task-contract.md`
- relevant task/state/UX docs after verification

## Implementation Plan
1. Inspect `/settings/api` route body, existing key lifecycle code, route
   command memory, and queue state.
2. Publish 100 findings for the route body.
3. Add a safety-first command summary using real key, scope, MCP, and profile
   state.
4. Add anchors to key, capability, and route sections without breaking
   existing DOM ids.
5. Add responsive CSS for desktop/tablet/mobile.
6. Validate build, tests, and signed-in browser smoke.
7. Update ledgers and queues, then commit/push.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: key creation, MCP exposure, and route capabilities were present but
  spread across several panels with weak first-viewport safety hierarchy.
- Gaps: broad/scoped key review, supervision count, and preset availability
  were not summarized before the form.
- Inconsistencies: route command strip existed, but the route body still needed
  a security-specific command summary.
- Architecture constraints: reuse vanilla web patterns and existing API key
  contracts.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: next steps, task board, MVP queue, design memory,
  `/settings/api` HTML/JS/CSS, API key routes and tests.
- Rows created or corrected: pending verification updates.
- Assumptions recorded: `/settings/api` is the safest next V2VIS-004 route
  because it has high AI/MCP safety impact.
- Blocking unknowns: none.
- Why it was safe to continue: UI-only change using existing data.

### 2. Select One Priority Mission Objective
- Selected task: V2VIS-004 Settings API Route Body UX Polish.
- Priority rationale: latest user request asks to continue improving app UX/UI
  until the web app is excellent, and `/settings/api` is AI/security critical.
- Why other candidates were deferred: `/settings/drive` remains a strong next
  candidate, while ACF-MAINT-002 waits behind the active UX cycle.

### 3. Plan Implementation
- Files or surfaces to modify: `public/index.html`, `public/app.js`,
  `public/styles.css`, UX/task/state docs.
- Logic: derive command state from existing `apiKeys`, `mcpManifest`,
  `agentKeyProfiles`, and route manifest.
- Edge cases: signed-out state, no keys, broad active keys, fallback presets,
  no MCP tools, mobile width, long raw keys.

### 4. Execute Implementation
- Implementation notes: Added the agent-access safety command summary, command
  cards for active keys, MCP tools, supervised tools, and presets, anchors for
  key list/capabilities/routes, and responsive CSS for the command grid.

### 5. Verify and Test
- Validation performed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` with disposable PostgreSQL on
  `localhost:55470`, Playwright signed-in `/settings/api` smoke at desktop,
  tablet, and mobile, plus a real create-key browser proof.
- Result: pass.

### 6. Self-Review
- Simpler option considered: copy-only adjustment. Rejected because safety
  state must be visible before service-key creation.
- Technical debt introduced: no planned debt.
- Scalability assessment: command summary reuses the route-body pattern and can
  be applied to `/settings/drive`.
- Refinements made: preserved the existing `agentKeyList` DOM id so key-list
  rendering and existing JS bindings remain intact while still providing an
  anchor target.

### 7. Update Documentation and Knowledge
- Docs updated: audit, task contract, design memory, task board, MVP queue,
  next steps, system health, module confidence, and project state.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `/settings/api` shows a safety command summary before dense key controls.
- [x] First route-body panel links to create key, review keys, preview
      supervision, and route exposure.
- [x] Existing key lifecycle behavior remains intact.
- [x] Desktop, tablet, and mobile proofs show no horizontal overflow, console
      issues, failed requests, or unnamed visible controls.
- [x] Build, tests, and diff whitespace gates pass.

## Success Signal
- User or operator problem: owner cannot quickly judge whether agent access is
  safe before creating/copying a key.
- Expected product or reliability outcome: fewer unsafe broad-key handoffs and
  clearer MCP supervision review.
- How success will be observed: responsive signed-in smoke verifies command
  summary, key form, key list, capabilities, and route exposure.
- Post-launch learning needed: yes.

## Deliverable For This Stage

Verified implementation and source-of-truth evidence for `/settings/api`.

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
- Tests: `node --check public/app.js`; `npm run build`; `git diff --check`;
  `npm test` with
  `DATABASE_URL=postgresql://postgres:postgres@localhost:55470/companycore_test?schema=public`.
- Manual checks: Playwright signed-in `/settings/api` smoke at desktop
  `1366x900`, tablet `834x1112`, and mobile `390x844`; Playwright real
  create-key proof.
- Screenshots/logs:
  `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis004-final-desktop-settings-api.png`,
  `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis004-final-tablet-settings-api.png`,
  `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis004-final-mobile-settings-api.png`,
  and `C:\Users\wrobl\AppData\Local\Temp\companycore-v2vis004-create-key-settings-api.png`.
- High-risk checks: no horizontal overflow, no console issues, no failed
  requests, four command cards, zero unnamed visible controls, raw `cc_v1_`
  copy-once key visible after creation, and one active key row.
- Module confidence ledger updated: yes.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes, existing API key and manifest
  contracts reused.
- DB schema and migrations verified: yes, `npm test` ran migrations against
  disposable PostgreSQL.
- Loading state verified: yes, signed-in browser smoke loaded the route and
  preview.
- Error state verified: yes, existing error handling path unchanged and tests
  passed.
- Refresh/restart behavior verified: yes, built server on
  `http://127.0.0.1:3117` loaded `/settings/api`.
- Regression check performed: build, test, responsive browser smoke, and
  create-key proof.

## Result Report

V2VIS-004 is verified. `/settings/api` now presents agent-access safety before
key creation, while preserving existing key lifecycle behavior. V2VIS-005
should continue with `/settings/drive` import/scoping route-body polish.
