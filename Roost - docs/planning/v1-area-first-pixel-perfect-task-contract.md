# Task

## Header
- ID: V1AREA-001
- Title: Area-First Dashboard Pixel-Perfect Implementation
- Task Type: feature
- Current Stage: verification
- Status: IMPLEMENTED_NOT_FULLY_VERIFIED
- Owner: Frontend Builder + QA/Test
- Depends on: approval of canonical desktop and mobile images; UX100-W02 verification unblock before merge if touching the same shell files
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: APP-SHELL-001, UX100-W01, UX100-W02
- Requirement Rows: REQ-V1AREA-001
- Quality Scenario Rows: QA-V1AREA-001
- Risk Rows: RISK-V1AREA-001
- Iteration: next implementation wave
- Operation Mode: BUILDER
- Mission ID: V1AREA
- Mission Status: IMPLEMENTED, PARTIALLY VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed in the design wave.
- [x] `.agents/core/mission-control.md` constraints are represented through the bounded mission block.
- [x] Missing or template-like state tables were not bootstrapped because this is a planning contract.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by replacing route-heavy UI with an area-first company control surface.

## Mission Block
- Mission objective: implement the V1 area-first Company Atlas dashboard so desktop and mobile match the canonical images.
- Release objective advanced: make CompanyCore usable as a CEO/company control plane rather than a module-heavy admin console.
- Included slices:
  - shared shell/frame
  - area-first sidebar/drawer
  - simplified header
  - desktop atlas layout
  - mobile dashboard layout
  - selected area tabs
  - right rail / Today priorities
  - screenshot fidelity validation
- Explicit exclusions:
  - no backend schema changes
  - no fake persistence for `+ Add view`
  - no deletion of existing backend routes
  - no full rebuild of every legacy workbench in the first commit
- Checkpoint cadence:
  - checkpoint 1: shell/frame
  - checkpoint 2: atlas + area overview
  - checkpoint 3: mobile parity
  - checkpoint 4: fidelity and real journey proof
- Stop conditions:
  - architecture mismatch with backend route ownership
  - unresolved dirty shell conflicts
  - inability to run minimum visual proof
- Handoff expectation: leave screenshot paths, validation commands, residual mismatches, and next area capability slice.

## Context
The accepted V1 direction is area-first. Users navigate LuckySparrow departments first, then use area-scoped capabilities such as Goals, Workflows, Tasks, Knowledge, Resources, Decisions, and AI.

## Goal
Build the real dashboard layout from:

- `docs/ux/assets/companycore-v1-area-first-dashboard-desktop-canonical.png`
- `docs/ux/assets/companycore-v1-area-first-dashboard-mobile-canonical.png`

## Scope
Allowed implementation surfaces:

- `web/src/*` React dashboard and route kit files
- `web/src/styles.css`
- `public/index.html`, `public/app.js`, `public/styles.css` only if the selected rollout path updates the production vanilla shell
- documentation updates in `docs/ux/`, `docs/planning/`, `.codex/context/`, and `.agents/state/`

Backend schema and route changes are out of scope.

## Implementation Plan
1. Inspect current shell ownership and choose React-first or vanilla-first rollout.
2. Implement shared area-first shell primitives.
3. Add area data adapter and canonical display names.
4. Implement desktop dashboard frame and selected `01 Strategia` state.
5. Implement mobile layout separately.
6. Add capability tab shells and honest empty/loading/error states.
7. Run visual fidelity and real journey proof.
8. Update source-of-truth docs and module confidence evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: current shell is still route/module-heavy and visually different across vanilla/React surfaces.
- Gaps: no implemented area-first shell, area subnav, or pixel-matched desktop/mobile layout.
- Inconsistencies: current area names differ from requested LuckySparrow target names.
- Architecture constraints: reuse existing HTTP/API/MCP boundaries; do not create duplicate backend concepts.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none
- Sources scanned: UX spec, implementation paths, current web source, architecture docs
- Rows created or corrected: this task contract
- Assumptions recorded:
  - Safe: V1 can map display labels over existing operating-area IDs.
  - Risky: full legacy shell replacement may collide with active UX100-W02 changes.
- Blocking unknowns: exact rollout route should be confirmed by local code inspection at implementation start.
- Why it was safe to continue: this task is planning-only until implementation begins.

### 2. Select One Priority Mission Objective
- Selected task: V1AREA-001
- Priority rationale: establishes the shell and UX foundation for all future area/workspace views.
- Why other candidates were deferred: additional area screens should wait until the shell is stable.

### 3. Plan Implementation
- Files or surfaces to modify: web shell/dashboard first, docs after proof.
- Logic: derive area state from existing connection/data sources.
- Edge cases:
  - unavailable integrations
  - empty areas
  - area names not yet matching target labels
  - mobile overflow
  - keyboard access for orbit nodes and tabs

### 4. Execute Implementation
- Implementation notes: pending future coding task.

### 5. Verify and Test
- Validation performed: planning docs `git diff --check`.
- Result: pending.

### 6. Self-Review
- Simpler option considered: static image-like dashboard only.
- Technical debt introduced: no in planning.
- Scalability assessment: area-first shell prevents sidebar growth as features expand.
- Refinements made: implementation is sliced to avoid a high-risk full rewrite.

### 7. Update Documentation and Knowledge
- Docs updated: implementation plan and task contract.
- Context updated: pending implementation.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [ ] Desktop `/dashboard` matches the canonical desktop image at `1366x900`.
- [ ] Mobile `/dashboard` matches the canonical mobile image at `390x844`.
- [ ] Sidebar is area-first and shows `01 Strategia` expanded with subviews.
- [ ] Header is simplified and does not show multiple competing global CTAs.
- [ ] Area capabilities are scoped to the selected area.
- [ ] No fake records or placeholder data are used as if real.
- [ ] Real journey proof covers selected area, tabs, priority, and mobile nav.

## Success Signal
- User or operator problem: the CEO can understand and operate the company by area instead of decoding app modules.
- Expected product or reliability outcome: future dashboard/workspace/area views can reuse one shell and component model.
- How success will be observed: signed-in desktop and mobile screenshots match canonical references and route actions use real backend data.
- Post-launch learning needed: yes

## Deliverable For This Stage
Verified implementation evidence for the V1 area-first dashboard and the
remaining release gate list.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new backend structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the browser-rendered UI.
- [x] No static screenshot is used as the UI.
- [x] Dashboard uses `/v1/connection` as the UI state source.
- [x] Error and empty states remain available through the existing dashboard
      state panel and honest empty/review area states.
- [x] No existing public JS route code is changed for the first slice.
- [x] Selected area and capability state work without a page reload.
- [x] Changes are documented.
- [x] Behavior is reproducible from evidence.
- [ ] `DEFINITION_OF_DONE.md` checked before release status changes to `DONE`.
      Runtime implementation is recorded as partially verified because the
      database-backed API gate still needs `DATABASE_URL`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in.
- [x] Risks and assumptions for this stage are stated clearly.

## Forbidden
- new systems without approval
- duplicated shell systems after rollout
- temporary bypasses
- architecture changes without explicit approval
- fake pixel-perfect via static screenshots

## Validation Evidence
- Tests: `npm run check:public-js`, `npm run build:server`,
  `npm run build:web`, `npm run validate`, and `git diff --check` passed.
- Manual checks: canonical desktop/mobile images reviewed with rendered
  screenshots through `view_image`.
- Screenshots/logs:
  - `docs/ux/evidence/v1-area-dashboard-desktop-1366x900.png`
  - `docs/ux/evidence/v1-area-dashboard-tablet-834x1112.png`
  - `docs/ux/evidence/v1-area-dashboard-mobile-390x844.png`
- High-risk checks: Playwright fallback verified built `/dashboard` with a
  controlled owner session and mocked `/v1/connection`; no overflow, no
  console/page errors, 13 area rows, 12 orbit nodes plus center, selected
  `01 Strategia`, desktop/mobile visibility rules, and five mobile nav items.
- 2026-05-15 fidelity pass: the implementation was tightened toward the
  accepted desktop/mobile canon by flattening the desktop topbar, switching the
  atlas map to circular icon nodes, reducing the first-viewport vertical drift,
  making area capability tabs underline-based, and shrinking the mobile orbit
  so the fixed mobile nav no longer visually fights the map. Browser plugin
  navigation worked, but its screenshot/snapshot returned blank/black in this
  local session; Playwright fallback supplied the visual evidence.
- 2026-05-15 executive panel pass: the selected-area panel now matches the
  canonical CEO overview structure more closely: area title and subtitle,
  underline capability tabs, health banner, four area signal tiles, Jarvis
  read-only readiness, primary strategy-review CTA, open-area link, and MECE
  accountability note. The right `Today` rail now uses canonical priority,
  strategy decision, AI handoff, proof, and source-chip groups.
- 2026-05-15 parity continuation pass: the desktop progressive path now uses
  the canonical icon/title/detail step anatomy, the desktop sidebar is denser
  so all 00-12 areas are visible in the first viewport, and the mobile shell
  now matches the canonical anatomy more closely with a full-width app bar,
  centered LuckySparrow title/status dot, shield guard icon, `Dzialy` heading,
  `Map` shortcut, four compact summary metrics, mobile-only atlas heading and
  breadcrumb, and a shorter atlas preview. Playwright fallback verified
  desktop `1366x900` and mobile `390x844` with no horizontal overflow and no
  console/page errors; refreshed screenshot evidence replaced the desktop and
  mobile files in `docs/ux/evidence/`.
- 2026-05-15 premium parity pass: the sidebar brand and user footer were
  polished into the final Company Atlas shell, atlas/cards received subtle
  non-distracting material accents, the desktop shell keeps the owner profile
  visible while showing all 00-12 areas, and mobile bottom navigation was
  shortened with extra page breathing room. Playwright fallback verified the
  latest built `/dashboard` bundle at desktop `1366x900` and mobile
  `390x844` with no horizontal overflow and no console/page errors; refreshed
  screenshot evidence replaced the desktop and mobile files.
- Coverage ledger updated: not applicable.
- Module confidence ledger updated: yes, `V1AREA-001`.
- Requirements matrix updated: yes, `REQ-V1AREA-001`.
- Quality scenarios updated: yes, `QA-V1AREA-001`.
- Risk register updated: yes, `RISK-V1AREA-001`.
- Reality status: partially verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: `/v1/connection` via existing React
  `useDashboardState` hook.
- Endpoint and client contract match: build and browser proof used the existing
  `ConnectionData` shape.
- DB schema and migrations verified: blocked locally because `npm run test:api`
  stopped at Prisma with missing `DATABASE_URL`.
- Loading state verified: existing dashboard loading/signed-out state retained.
- Error state verified: existing dashboard error/retry panel retained by code
  path; not browser-forced in this slice.
- Refresh/restart behavior verified: route renders from generated React bundle;
  selected UI state is local and resets intentionally on reload.
- Regression check performed: `npm run validate`, public JS syntax check, and
  responsive Playwright proof.

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: CEO/owner and future AI-assisted operators
- Existing workaround or pain: route-heavy dashboard and module-first navigation
- Smallest useful slice: area-first shell + dashboard frame
- Success metric or signal: user can select an area and continue through capabilities without opening a global module menu
- Feature flag, staged rollout, or disable path: recommended for implementation
- Post-launch feedback or metric check: yes

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: yes
- Feedback item IDs: V1AREA-FB-001
- Feedback accepted: area-first navigation, simplified header, expanded area sidebar, desktop/mobile canonical targets
- Feedback needs clarification: whether first code rollout should be React-first or vanilla-first
- Feedback conflicts: none
- Feedback deferred or rejected: full custom `+ Add view` persistence deferred until backend contract
- Active task changed by feedback: yes
- New task created from feedback: yes
- Design memory updated: pending implementation
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable.
- Critical user journey: signed-in dashboard orientation and selected-area
  navigation.
- SLI: not applicable.
- SLO: not applicable.
- Error budget posture: not applicable.
- Health/readiness check: `npm run validate` passed; database-backed
  `test:api` still requires local `DATABASE_URL`.
- Logs, dashboard, or alert route: not applicable.
- Smoke command or manual smoke: Playwright fallback route proof completed.
- Rollback or disable path: `/react-dashboard` still exists as a React entry
  point; `/dashboard` route can be moved back to the vanilla route list if
  production proof finds a release blocker.

## AI Testing Evidence
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable for planning; future AI tab must preserve MCP/API approval guardrails.

## Result Report

V1AREA-001 implemented the first V1 area-first dashboard slice.

Files changed:

- `src/app.ts`
- `web/src/main.tsx`
- `web/src/styles.css`
- generated `public/react/*`
- `docs/ux/evidence/v1-area-dashboard-*.png`
- source-of-truth state files for requirement, quality, risk, task board,
  module confidence, system health, project state, and next steps

What shipped:

- `/dashboard` now serves the React Company Atlas route.
- Desktop uses an area-first sidebar with canonical 00-12 LuckySparrow areas,
  expanded `01 Strategia`, contextual capability subviews, atlas board,
  selected-area panel, decision rail, and progressive path.
- Mobile uses a separate topbar, company summary, horizontal area selector,
  compact atlas, area capability panel, Today list, and five-item bottom nav.
- The dashboard reads workspace, areas, tables, capabilities, integration
  readiness, MCP visibility, and scope from `/v1/connection`.

Validation summary:

- Passed: `npm run check:public-js`, `npm run build:server`,
  `npm run build:web`, `npm run validate`, `git diff --check`.
- Passed: Playwright fallback visual/interaction proof at desktop/tablet/mobile
  with no overflow or console/page errors.
- Passed: 2026-05-15 follow-up fidelity proof at desktop `1366x900` and mobile
  `390x844`: no overflow, no console/page errors, canonical 71px desktop
  topbar, first content row starting at 87px, visible progressive path in the
  first desktop viewport, and five mobile nav items.
- Passed: 2026-05-15 executive panel proof at desktop `1366x900`, tablet
  `834x1112`, and mobile `390x844`: no overflow, no console/page errors,
  health banner present, four area-signal tiles present, Jarvis readiness card
  present, desktop/tablet capability tabs fit without horizontal overflow, and
  mobile uses intentional horizontal tab overflow.
- Passed: 2026-05-15 parity continuation proof at desktop `1366x900` and
  mobile `390x844`: no overflow, no console/page errors, full icon/detail
  progressive path visible on desktop, all 00-12 area rows visible in the
  desktop sidebar first viewport, and the mobile appbar/area strip/atlas
  anatomy aligned with the active canonical mobile reference.
- Passed: 2026-05-15 premium parity proof at desktop `1366x900` and mobile
  `390x844`: no overflow, no console/page errors, final sidebar footer and
  owner row visible, desktop first viewport remains complete, and the mobile
  fixed nav is shorter while the full-page path remains readable from overview
  to area detail.
- Follow-up completed on 2026-05-15: `npm run test:api` passed against
  workspace-local PostgreSQL on `127.0.0.1:55476`, and real backend
  Playwright proof verified selected-area routes with screenshots
  `docs/ux/evidence/v1-area-real-backend-selected-area-desktop.png` and
  `docs/ux/evidence/v1-area-real-backend-selected-area-mobile.png`.
