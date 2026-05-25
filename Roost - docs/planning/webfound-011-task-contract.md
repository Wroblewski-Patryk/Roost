# Task

## Header
- ID: WEBFOUND-011
- Title: Agent Tool Surface In Canonical Shell
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Depends on: WEBFOUND-010
- Priority: P1
- Module Confidence Rows: MCL-WEB-SHELL, MCL-MCP, WEBFOUND-011
- Requirement Rows: REQ-WEBFOUND-008
- Quality Scenario Rows: QA-WEBFOUND-007
- Risk Rows: RISK-APP-AUDIT-007, RISK-WEBFOUND-003
- Iteration: 13
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
- [x] Missing state rows were not needed; active rows exist for the web/MCP foundation.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local appearance.

## Mission Block
- Mission objective: Make the MCP agent tool surface reachable from the canonical authenticated shell without a competing React navigation taxonomy.
- Release objective advanced: Owners can move from the main workspace shell to agent tool inspection and back through the same mental model used for integrations and API settings.
- Included slices: vanilla sidebar/topbar/module switcher entry, React shell navigation simplification, route smoke, documentation evidence.
- Explicit exclusions: replacing `/react-agent-tools` with a vanilla implementation, broader React route convergence, new MCP tool behavior.
- Checkpoint cadence: implement shell links, build/test, browser proof, update source-of-truth files.
- Stop conditions: `/react-agent-tools` cannot load from canonical entry, route navigation causes blank shell, or responsive proof fails.
- Handoff expectation: next task can run AI-ready MCP/API smoke after shell access is verified.

## Context
The owner can now see integration readiness and key impact in the canonical vanilla shell. The agent tool surface exists in React, but the shell did not expose it as a clear canonical destination, and React routes still advertised a separate React-specific navigation set.

## Goal
Connect `/react-agent-tools` to the canonical shell and reduce React header navigation to canonical CompanyCore destinations.

## Scope
- `public/index.html`
- `public/app.js`
- `web/src/react-route-kit.tsx`
- canonical planning, state, and UX docs touched by this task

## Implementation Plan
1. Add `Agent tools` to the canonical shell integrations navigation and topbar.
2. Add `Agent tools` to module search as a full-page React route, not as a vanilla SPA `data-link`.
3. Replace React shell's route preview nav with canonical CompanyCore destinations.
4. Validate build/test and browser route proof.
5. Update canonical state files.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: `/react-agent-tools` existed but was not a first-class canonical shell destination.
- Gaps: module switcher could not open React routes safely through the vanilla SPA router.
- Inconsistencies: React shell navigation exposed React preview routes instead of canonical owner destinations.
- Architecture constraints: Keep existing React route implementation; do not invent a second nav framework.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Sources scanned: `public/app.js`, `public/index.html`, `web/src/react-route-kit.tsx`, `src/app.ts`.
- Rows created or corrected: module confidence, requirement, quality, and risk rows updated after verification.
- Assumptions recorded: full-page navigation is the correct bridge for backend-served React routes.
- Blocking unknowns: none.
- Why it was safe to continue: backend already serves `/react-agent-tools` as a React app route.

### 2. Select One Priority Mission Objective
- Selected task: WEBFOUND-011.
- Priority rationale: It closes the remaining navigation drift before AI-ready smoke work.
- Why other candidates were deferred: WEBFOUND-012 depends on a reachable and understandable MCP tool surface.

### 3. Plan Implementation
- Files or surfaces to modify: vanilla shell links, module switcher route metadata, shared React shell.
- Logic: external module switcher rows use `window.location.assign`.
- Edge cases: active state, no SPA blank route, mobile topbar density.

### 4. Execute Implementation
- Implementation notes: Added canonical Agent tools links, module switcher
  external route handling, and canonical CompanyCore navigation inside the
  shared React shell.

### 5. Verify and Test
- Validation performed: `node --check public/app.js`, `npm run build`,
  `npm test`, and Playwright fallback route smoke.
- Result: pass.

### 6. Self-Review
- Simpler option considered: only add a link to API settings. Rejected because the user needs direct access to the actual tool manifest surface.
- Technical debt introduced: no intended.
- Scalability assessment: external module routes can be reused for future backend-served canonical React routes.
- Refinements made: React shell nav now removes old React preview labels and
  foregrounds canonical destinations.

### 7. Update Documentation and Knowledge
- Docs updated: task plan, task board, module confidence, requirements matrix,
  quality scenarios, risk register, next steps, MVP queue, system health,
  project state, delivery map, and project memory index.
- Context updated: yes.
- Learning journal updated: not applicable unless validation exposes a recurring pitfall.

## Acceptance Criteria
- [x] Owner can reach `/react-agent-tools` from canonical sidebar/topbar and module switcher.
- [x] `/react-agent-tools` keeps existing MCP tool behavior.
- [x] React shell header uses canonical CompanyCore destinations instead of a separate React route taxonomy.
- [x] Desktop, tablet, and mobile route smoke has no overflow, console errors, or relevant failed requests.

## Success Signal
- User or operator problem: agent tool inspection feels disconnected from the main app shell.
- Expected product or reliability outcome: MCP tool inspection becomes part of the same owner workflow as integration readiness and API key creation.
- How success will be observed: browser smoke starts in `/dashboard`, opens `/react-agent-tools`, and verifies canonical nav markers plus MCP tool content.
- Post-launch learning needed: yes

## Deliverable For This Stage
A verified shell route bridge for `/react-agent-tools` and updated canonical execution records.

## Constraints
- use existing systems and approved mechanisms
- do not add a parallel navigation framework
- do not change MCP manifest semantics
- do not open V2 visual/gameification work

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] No existing functionality is broken.
- [x] Feature works after reload/navigation.
- [x] Relevant source-of-truth docs are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changes to `DONE`.

## Validation Evidence
- Tests: `node --check public/app.js`; `npm run build`; `npm test` against disposable PostgreSQL on `localhost:55461`.
- Manual checks: Playwright fallback started at `/dashboard`, opened `/react-agent-tools` from the canonical sidebar, verified MCP tool markers, canonical React header destinations, absence of old React-only nav labels, and returned to `/settings/api`.
- Screenshots/logs: `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound011-desktop-1778789017817.png`; `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound011-tablet-1778789017817.png`; `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound011-mobile-1778789017817.png`.
- High-risk checks: no horizontal overflow at desktop `1366x900`, tablet `820x1000`, or mobile `390x844`; no console errors; no relevant failed requests. One transient full-navigation `net::ERR_ABORTED` was observed and excluded in the rerun because the browser cancelled a previous page request during intentional full-page navigation.
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
- Error state verified: existing React route state retained.
- Refresh/restart behavior verified: yes.
- Regression check performed: `npm test`.

## UX/UI Evidence
- Design source type: approved_snapshot
- Design source reference: existing authenticated shell, React route kit shell, WEBFOUND foundation docs.
- Fidelity target: structurally_faithful
- Evidence-driven UX review used: yes
- Primary user question answered within 3 seconds: yes, React route heading shows MCP tools visible to agents.
- Next action visibility: yes, canonical nav exposes API settings and integrations.
- Blocked-state visibility: yes, existing React state panel remains for signed-out/loading/error cases.
- Existing shared pattern reused: canonical sidebar sections, topbar actions, module switcher, React route kit Shell.
- New shared pattern introduced: no
- Design-memory update required: no
- Surface strategy checked: mobile | tablet | desktop
- State checks: loading | empty | error | success
- Responsive checks: desktop `1366x900`, tablet `820x1000`, mobile `390x844`.
- Accessibility checks: sidebar/topbar links retain visible labels; React nav has `aria-label="CompanyCore navigation"`.
- Parity evidence: structurally faithful to existing canonical shell and React route kit.

## Result Report
- Task summary: Agent tools is now reachable from the canonical shell and the React route header uses canonical destinations.
- Files changed: `public/app.js`, `public/index.html`, `web/src/react-route-kit.tsx`, `docs/planning/webfound-011-task-contract.md`, and canonical state docs.
- How tested: `node --check public/app.js`, `npm run build`, `npm test`, and Playwright fallback desktop/tablet/mobile route smoke.
- What is incomplete: AI-ready API/MCP smoke pack remains next.
- Next steps: WEBFOUND-012 AI-Ready Smoke Pack.
- Decisions made: Use full-page navigation for backend-served React routes from vanilla shell.
