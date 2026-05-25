# Task

## Header
- ID: WEBFOUND-009
- Title: Integration readiness dashboard
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Depends on: WEBFOUND-008B
- Priority: P1
- Module Confidence Rows: MCL-WEB-SHELL, MCL-INTEGRATIONS, MCL-RELATIONSHIPS, MCL-MCP
- Requirement Rows: REQ-WEBFOUND-009
- Quality Scenario Rows: QA-WEB-UX-RESPONSIVE, QA-MCP-READINESS
- Risk Rows: RISK-WEBFOUND-009
- Iteration: 11
- Operation Mode: BUILDER
- Mission ID: WEBFOUND-MISSION-2026-05-14
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed in this mission wave.
- [x] `.agents/core/mission-control.md` was reviewed in this mission wave.
- [x] Missing state rows were bootstrapped earlier in the foundation mission.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence for the web/MCP foundation.

## Mission Block
- Mission objective: Make the authenticated web shell operationally useful before V2 by turning integration readiness into a clear owner dashboard.
- Release objective advanced: Web users and MCP operators can see integration, graph, data, and API readiness from one canonical settings surface.
- Included slices: integration summary, provider cards, graph readiness, MCP manifest/key readiness, responsive behavior, documentation evidence.
- Explicit exclusions: native mobile app, V2 strategic city/gameification UI, new backend integration providers.
- Checkpoint cadence: validate after the frontend slice, then update state docs.
- Stop conditions: frontend cannot derive readiness from existing APIs, build/test fails, or visual validation exposes unusable layout.
- Handoff expectation: record evidence and move the queue to the next smallest web/MCP foundation item.

## Context
The authenticated shell now has workspace navigation, area inventory, relationship graph API, and a graph-backed relationship center. The `/settings/integrations` screen still presented integration groups as a loose catalog instead of a readiness command surface.

## Goal
Make `/settings/integrations` the canonical owner-facing readiness dashboard for provider integrations, relationship evidence, operating-area data, and MCP/API access.

## Scope
- `public/app.js`
- `public/index.html`
- `public/styles.css`
- canonical planning, state, and UX docs touched by this task

## Implementation Plan
1. Reuse existing `/v1/connection`, relationship graph, API key, and operating-model client state.
2. Add derived readiness checks for ClickUp, Google Drive, relationship graph, and MCP agents.
3. Render readiness, provider groups, graph status, and MCP status in the existing integrations screen.
4. Validate syntax, build, tests, and real browser responsiveness.
5. Update canonical task and state files.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Integration UI did not answer what is ready, blocked, or next across graph and MCP.
- Gaps: `mcpManifest` was returned by the backend but not kept in frontend state.
- Inconsistencies: Relationship graph readiness lived on `/relationships`; integration setup did not surface that dependency.
- Architecture constraints: Use existing public web client and existing API contracts; no new backend route unless required.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Sources scanned: `public/app.js`, `public/index.html`, `public/styles.css`, prior WEBFOUND docs.
- Rows created or corrected: module confidence, requirement, quality, and risk rows updated after verification.
- Assumptions recorded: existing state is sufficient for a first readiness dashboard.
- Blocking unknowns: none.
- Why it was safe to continue: user explicitly approved execution, and this is a scoped frontend composition over existing contracts.

### 2. Select One Priority Mission Objective
- Selected task: WEBFOUND-009.
- Priority rationale: It connects integrations, relationship graph, and MCP readiness before expanding new features.
- Why other candidates were deferred: V2 visuals and native mobile are explicitly deferred.

### 3. Plan Implementation
- Files or surfaces to modify: existing integrations view, client state, CSS, planning docs.
- Logic: derive four readiness checks and expose graph/MCP details next to provider setup.
- Edge cases: signed-out state, no API keys, graph not loaded, empty Drive/ClickUp data.

### 4. Execute Implementation
- Implementation notes: Added frontend `mcpManifest` state, derived readiness
  checks for ClickUp, Google Drive, relationship graph, and MCP agents, added
  a relationship graph integration group, and added responsive readiness card
  styles.

### 5. Verify and Test
- Validation performed: `node --check public/app.js`, `npm run build`,
  `npm test`, and Playwright fallback browser smoke.
- Result: pass.

### 6. Self-Review
- Simpler option considered: only adding static copy. Rejected because it would not answer readiness from real workspace state.
- Technical debt introduced: no intended.
- Scalability assessment: new readiness items are derived helpers that can grow with more providers.
- Refinements made: Stored `mcpManifest` from `/v1/connection` so MCP
  readiness reflects the same backend manifest agents receive.

### 7. Update Documentation and Knowledge
- Docs updated: task plan, task board, module confidence, requirements matrix,
  quality scenarios, risk register, next steps, MVP queue, and design memory.
- Context updated: yes.
- Learning journal updated: not applicable unless validation exposes a recurring pitfall.

## Acceptance Criteria
- [x] `/settings/integrations` shows readiness for ClickUp, Google Drive, relationship graph, and MCP/API access.
- [x] The screen exposes next actions for setup, graph review, and agent API without adding a new backend path.
- [x] Desktop, tablet, and mobile layouts remain usable with no horizontal overflow.
- [x] Build, tests, and real browser smoke pass.

## Success Signal
- User or operator problem: owners cannot currently see whether integrations are ready for everyday use and MCP agents.
- Expected product or reliability outcome: a single settings surface explains ready/attention/blocked states.
- How success will be observed: browser smoke on `/settings/integrations` with fixture workspace data.
- Post-launch learning needed: yes

## Deliverable For This Stage
A verified frontend readiness dashboard and updated canonical execution records.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new backend providers or parallel integration architecture
- no placeholders or fake data in shipped behavior
- keep V2 gamification/city concepts deferred

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] No existing functionality is broken.
- [x] Feature works after reload/navigation.
- [x] Relevant source-of-truth docs are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changes to `DONE`.

## Validation Evidence
- Tests: `node --check public/app.js`; `npm run build`; `npm test` against disposable PostgreSQL on `localhost:55459`.
- Manual checks: Playwright fallback rendered `/settings/integrations` on `http://127.0.0.1:3109` with a real owner token, API key, integration settings, Drive files, and relationship graph fixtures.
- Screenshots/logs: `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound009-desktop-1778786342057.png`; `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound009-tablet-1778786342057.png`; `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound009-mobile-1778786342057.png`.
- High-risk checks: no horizontal overflow at desktop `1366x900`, tablet `820x1000`, or mobile `390x844`; no console errors; no failed requests.
- Module confidence ledger updated: yes.
- Requirements matrix updated: yes.
- Quality scenarios updated: yes.
- Risk register updated: yes.
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes.
- Loading state verified: yes.
- Error state verified: no new error path; existing API error handling retained.
- Refresh/restart behavior verified: yes, browser smoke reloaded at tablet and mobile sizes.
- Regression check performed: `npm test`.

## UX/UI Evidence
- Design source type: approved_snapshot
- Design source reference: existing implemented authenticated shell and UX audit from 2026-05-14.
- Canonical visual target: structurally faithful extension of the current shell.
- Fidelity target: structurally_faithful
- Evidence-driven UX review used: yes
- Primary user question answered within 3 seconds: yes, readiness dashboard is first panel.
- Next action visibility: yes, cards and setup rows link to ClickUp, Drive, graph review, and API settings.
- Blocked-state visibility: yes, readiness cards expose `ready`, `attention`, and `blocked` states.
- Existing shared pattern reused: panels, status cards, action rows, integration grid.
- New shared pattern introduced: integration readiness item.
- Design-memory update required: yes, completed.
- Surface strategy checked: desktop | tablet | mobile
- State checks: loading | empty | error | success
- Responsive checks: desktop `1366x900`, tablet `820x1000`, mobile `390x844`.
- Accessibility checks: readiness group has an `aria-label`, readiness cards are links with visible action labels, existing setup links remain keyboard reachable.
- Parity evidence: structurally faithful to existing shell panels and status-card language.

## Result Report
- Task summary: `/settings/integrations` is now a readiness dashboard for integrations, graph, and MCP access.
- Files changed: `public/app.js`, `public/index.html`, `public/styles.css`, `docs/planning/webfound-009-task-contract.md`, and canonical state/UX docs.
- How tested: `node --check public/app.js`, `npm run build`, `npm test`, and Playwright fallback desktop/tablet/mobile smoke.
- What is incomplete: `/settings/api` still needs stronger pre-creation workspace/scope/MCP clarity.
- Next steps: WEBFOUND-010 MCP Key Workspace Clarity.
- Decisions made: Reuse existing APIs and derive readiness client-side.
