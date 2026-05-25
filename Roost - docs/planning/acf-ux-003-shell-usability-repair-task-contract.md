# Task

## Header
- ID: ACF-UX-003
- Title: Authenticated Shell Usability Repair
- Task Type: UX/UI implementation
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + UX
- Depends on: V2VIS-001
- Priority: P1
- Iteration: 2026-05-14.4
- Operation Mode: BUILDER
- Mission ID: ACF-UX-003
- Mission Status: VERIFIED

## Goal
Repair the authenticated web layout so the sidebar and topbar support company
management instead of behaving like a route directory.

## Scope
- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `web/src/react-route-kit.tsx`
- UX and state documentation touched by the shell behavior change

## Implementation Plan
1. Reframe sidebar lanes around command, company areas, workbenches,
   integrations/agents, and workspace controls.
2. Compact the topbar into a command bar with clearer route context and
   persistent status signals.
3. Improve area/resource sidebar labels and counts so they communicate
   operational state.
4. Bring the React route shell closer to the same canonical navigation model.
5. Run syntax/build/tests and responsive browser proof for desktop, tablet,
   and mobile.

## Acceptance Criteria
- [x] Sidebar copy and grouping express command/company/workbench/integration/workspace roles.
- [x] Topbar is lower-density and exposes command search plus real status.
- [x] React routes no longer feel like a separate app shell.
- [x] Desktop, tablet, and mobile render without horizontal overflow.
- [x] Existing route navigation and workspace switch/create behavior still works.
- [x] Documentation and state files record the reusable shell pattern.

## Definition of Done
- [x] Code builds without errors.
- [x] Relevant tests pass or an explicit blocker is recorded.
- [x] Real browser proof covers desktop, tablet, and mobile.
- [x] No new placeholder data or temporary UI path is introduced.
- [x] Source-of-truth docs and state files are updated.

## Result Report
- Reframed the vanilla sidebar into a command/company/workbench/integration
  rail, added meaningful icons and labels, compacted the topbar into a command
  bar, added desktop status chips, removed the duplicated dashboard page title,
  and aligned the React route header language with the same CompanyCore shell
  model.
- Validation: `node --check public/app.js`, `npm run build`, and `npm test`
  passed against disposable PostgreSQL on `localhost:55467`.
- Browser proof: Playwright fallback registered local owners and verified
  `/dashboard` plus `/react-agent-tools` at desktop `1366x900`, tablet
  `834x1112`, and mobile `390x844`; no horizontal overflow, no console issues,
  no failed requests, mobile drawer opened without overflow, and final
  mobile/tablet topbar height was `65px`.
