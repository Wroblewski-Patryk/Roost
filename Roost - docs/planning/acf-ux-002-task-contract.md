# Task

## Header
- ID: ACF-UX-002
- Title: Canonical Authenticated Shell And Company City Dashboard
- Task Type: design
- Current Stage: planning
- Status: BLOCKED
- Owner: Frontend Builder + Product Docs
- Depends on: ACF-UX-001
- Priority: P1
- Coverage Ledger Rows: APP-AUDIT-001
- Module Confidence Rows: APP-AUDIT-001; ACF-UX-001; APP-SHELL-001
- Requirement Rows: REQ-APP-UX-003
- Quality Scenario Rows: QA-APP-UX-003
- Risk Rows: RISK-APP-AUDIT-007
- Iteration: application completion finish queue
- Operation Mode: ARCHITECT
- Mission ID: ACF-UX-002
- Mission Status: SUPERSEDED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the architecture/planning nature of this slice.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed through the operating
      system startup contract.
- [x] Missing or template-like state tables were confirmed not blocking.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by closing the approved Company City
      dashboard mismatch and shell IA gap.

## Supersession Note

On 2026-05-14, the user clarified that Company City V3, strategy-game visuals,
gamification, and native mobile app work belong to V2. The immediate objective
is the web/backend/MCP foundation described in
`docs/architecture/web-and-mcp-foundation-before-v2.md` and
`docs/planning/web-and-mcp-foundation-task-plan.md`.

This task remains as historical planning evidence, but runtime implementation
should start from WEBFOUND-001 through WEBFOUND-004 instead of this Company
City shell task.

## Mission Block
- Mission objective: Create one canonical logged-in web shell and dashboard
  direction for mobile, tablet, and desktop so future route work shares the
  same navigation and command model.
- Release objective advanced: Application completion finish queue and
  owner-grade UX readiness.
- Included slices: authenticated shell IA audit, sidebar redesign direction,
  responsive shell contract, dashboard Company City implementation plan,
  documentation updates.
- Explicit exclusions: no runtime UI implementation in this planning stage; no
  backend/API/schema changes; no production deploy.
- Checkpoint cadence: update source-of-truth docs before coding starts; run
  browser proof after implementation starts.
- Stop conditions: if the user rejects the Company City direction, record a
  supersession decision before implementation.
- Handoff expectation: next agent can implement from
  `docs/ux/authenticated-shell-layout-audit-2026-05-14.md` and
  `docs/ux/company-city-dashboard-v3-spec.md`.

## Context

APP-AUDIT-001 found that the canonical dashboard does not yet implement the
approved Company City direction. The user also reported that the main sidebar
feels odd and asked for a detailed post-login web layout audit across mobile,
tablet, and desktop.

## Goal

Define a canonical authenticated web layout for CompanyCore that makes the app
feel like one company operating system rather than disconnected route groups.

## Scope

- `docs/ux/authenticated-shell-layout-audit-2026-05-14.md`
- `docs/ux/design-system-contract.md`
- `docs/ux/design-memory.md`
- `docs/ux/pattern-gallery.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/delivery-map.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/quality-attribute-scenarios.md`
- `.agents/state/risk-register.md`
- `.agents/state/next-steps.md`

## Implementation Plan
1. Inspect existing architecture, UX docs, screenshots, and shell code.
2. Produce an evidence-backed audit for the authenticated shell and sidebar.
3. Record canonical layout assumptions in UX source-of-truth files.
4. Queue the next implementation slice without changing runtime behavior.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: vanilla and React routes use different authenticated shell models;
  sidebar is route/job-family based rather than command/company based;
  dashboard still does not implement Company City V3.
- Gaps: no single documented canonical shell for all private routes; no
  implementation task that treats sidebar, topbar, command brief, status strip,
  and dashboard map together.
- Inconsistencies: React route horizontal nav conflicts with vanilla sidebar
  mental model.
- Architecture constraints: React migration is accepted, but canonical vanilla
  route switches require parity evidence.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Missing or template-like files: none blocking this planning stage.
- Sources scanned: UX docs, app audit, shell HTML/CSS/JS, React route kit,
  production screenshot artifacts.
- Rows created or corrected: requirement, quality, risk, module confidence, and
  visual slice rows for authenticated shell canonicalization.
- Assumptions recorded: React should become the canonical shell implementation
  path, while vanilla routes remain transitional until parity is proven.
- Blocking unknowns: final user approval before coding the visual direction.
- Why it was safe to continue: this stage changes documentation and planning
  truth only.

### 2. Select One Priority Mission Objective
- Selected task: ACF-UX-002.
- Priority rationale: the user explicitly requested this UX/UI audit and the
  application audit already identifies the Company City mismatch as P1.
- Why other candidates were deferred: security/CORS remains the release queue
  NOW item, but this planning artifact does not change runtime security posture.

### 3. Plan Implementation
- Files or surfaces to modify: UX docs and state/planning ledgers only.
- Logic: define shell zones, responsive behavior, sidebar IA, component
  contract, implementation slices, and acceptance criteria.
- Edge cases: mobile must not become a shrunk desktop; tablet needs its own
  layout; all metrics/badges must map to real state.

### 4. Execute Implementation
- Implementation notes: created the authenticated shell audit and recorded
  reusable layout decisions.

### 5. Verify and Test
- Validation performed: source and screenshot review; no runtime changes.
- Result: audit and planning rows are ready for implementation follow-up.

### 6. Self-Review
- Simpler option considered: dashboard-only repaint.
- Technical debt introduced: no.
- Scalability assessment: shell-first work reduces route-level duplication and
  prevents future React/vanilla IA divergence.
- Refinements made: positioned sidebar redesign as command/company/workbench
  lanes rather than a longer static route list.

### 7. Update Documentation and Knowledge
- Docs updated: UX audit, design system, design memory, pattern gallery,
  planning/state files.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Audit identifies current shell/sidebar issues across desktop, tablet, and
      mobile.
- [x] Canonical authenticated shell zones and component contract are recorded.
- [x] Next implementation slice has testable acceptance criteria.

## Success Signal
- User or operator problem: the sidebar feels odd and the logged-in app does
  not yet behave like one coherent CompanyCore operating system.
- Expected product or reliability outcome: future private routes reuse one
  shell, one command model, and one responsive navigation strategy.
- How success will be observed: implementation screenshots match the canonical
  shell contract and Company City dashboard spec.
- Post-launch learning needed: yes.

## Deliverable For This Stage

Planning and source-of-truth documentation only.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered
  behavior

## Definition of Done
- [ ] Code builds without errors.
- [ ] Feature works manually through the real UI, API, CLI, or operator path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [ ] Full data flow works across all relevant layers.
- [ ] Backend and UI/client error handling exists where applicable.
- [x] No existing functionality is broken.
- [ ] Feature works after restart, reload, or navigation refresh where
      applicable.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal, reliability, security, and rollback evidence are recorded
      when applicable.
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
- Tests: not run; docs/planning-only stage.
- Manual checks: reviewed current screenshots and source files.
- Screenshots/logs:
  `C:\Users\wrobl\AppData\Local\Temp\companycore-full-audit-20260514-180653`.
- High-risk checks: no runtime behavior changed.
- Coverage ledger updated: not applicable.
- Module confidence ledger updated: yes.
- Module confidence rows closed or changed: APP-SHELL-001 added.
- Requirements matrix updated: yes.
- Requirement rows closed or changed: REQ-APP-UX-003 added.
- Quality scenarios updated: yes.
- Quality scenario rows closed or changed: QA-APP-UX-003 added.
- Risk register updated: yes.
- Risk rows closed or changed: RISK-APP-AUDIT-007 added.
- Reality status: implemented, not verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: not applicable.
- Endpoint and client contract match: not applicable.
- DB schema and migrations verified: not applicable.
- Loading state verified: not applicable.
- Error state verified: not applicable.
- Refresh/restart behavior verified: not applicable.
- Regression check performed: source-of-truth review only.

## Product / Discovery Evidence
- Problem validated: yes.
- User or operator affected: owner/operator after login.
- Existing workaround or pain: sidebar feels odd and private routes use
  inconsistent shell models.
- Smallest useful slice: canonical shell and dashboard planning before coding.
- Success metric or signal: one private shell in screenshots and reduced
  route-level navigation divergence.
- Feature flag, staged rollout, or disable path: not applicable for planning.
- Post-launch feedback or metric check: yes.

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: yes.
- Feedback item IDs: ACF-UX-002 user prompt 2026-05-14.
- Feedback accepted: yes.
- Feedback needs clarification: implementation approval before coding.
- Feedback conflicts: none.
- Feedback deferred or rejected: none.
- Active task changed by feedback: yes.
- New task created from feedback: yes.
- Design memory updated: yes.
- Learning journal updated: not applicable.

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable.
- Critical user journey: owner signs in and navigates the private company
  operating system.
- SLI: route shell render without console errors, overflow, or inaccessible
  navigation controls after implementation.
- SLO: all priority private shell breakpoints pass screenshot/focus smoke.
- Error budget posture: not applicable.
- Health/readiness check: no runtime change.
- Logs, dashboard, or alert route: not applicable.
- Smoke command or manual smoke: future `owner-console:ux-smoke` plus targeted
  shell screenshot pass.
- Rollback or disable path: keep old routes until canonical shell parity is
  proven.

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable.
- Memory consistency scenarios: not applicable.
- Multi-step context scenarios: not applicable.
- Adversarial or role-break scenarios: not applicable.
- Prompt injection checks: not applicable.
- Data leakage and unauthorized access checks: not applicable.
- Result: not applicable.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: not applicable.
- Data classification: owner private workspace UI.
- Trust boundaries: no runtime change.
- Permission or ownership checks: not applicable.
- Abuse cases: misleading badges or fake gamification must not be introduced.
- Secret handling: no secret handling changes.
- Security tests or scans: not applicable.
- Fail-closed behavior: no backend behavior changed.
- Residual risk: implementation still needs accessibility and focus proof.

## Architecture Evidence (required for architecture-impacting tasks)
- Architecture source reviewed: `docs/architecture/`, UX system docs, React
  migration contract.
- Fits approved architecture: yes.
- Mismatch discovered: yes, shell IA divergence between vanilla and React.
- Decision required from user: yes, before runtime implementation.
- Approval reference if architecture changed: not applicable in planning stage.
- Follow-up architecture doc updates: implement or explicitly supersede Company
  City dashboard direction.

## UX/UI Evidence (required for UX tasks)
- Design source type: approved_snapshot.
- Design source reference:
  `docs/ux/assets/company-city-dashboard-v3-target.png`.
- Canonical visual target: `docs/ux/company-city-dashboard-v3-spec.md`.
- Fidelity target: structurally_faithful.
- Evidence-driven UX review used: yes.
- Primary user question answered within 3 seconds: planned.
- Next action visibility: planned through `CommandBriefPanel`.
- Blocked-state visibility: planned through sidebar badges and command brief.
- Stitch used: no.
- Stitch artifact reference (if used): not applicable.
- Experience-quality bar reviewed: yes.
- Visual-direction brief reviewed: yes.
- Existing shared pattern reused: Company City Map, semantic sidebar sections,
  compact private mobile topbar, command center pairing, workbench rows.
- New shared pattern introduced: yes, canonical authenticated shell contract.
- Design-memory entry reused: Company City Strategic Map; Semantic Sidebar
  Sections; Compact Private Mobile Topbar.
- Design-memory update required: yes.
- Pattern-gallery reference: App Shell; Company City Map; Dashboard.
- Visual gap audit completed: yes.
- Background or decorative asset strategy: approved Company City raster/canvas
  for dashboard and map-led surfaces; quieter workbench interiors.
- Canonical asset extraction required: yes for implementation.
- Screenshot comparison pass completed: no, planning stage only.
- Remaining mismatches: current dashboard and React routes do not share the
  canonical shell.
- Anti-patterns checked: yes.
- Screen-quality checklist reviewed: yes.
- UI scorecard used: previous audit scorecard reused as baseline.
- Surface strategy checked: mobile | tablet | desktop.
- State checks: loading | empty | error | success planned for implementation.
- Feedback locality checked: yes.
- Raw technical errors hidden from end users: not applicable.
- Responsive checks: desktop | tablet | mobile through existing screenshots.
- Input-mode checks: touch | pointer | keyboard planned for implementation.
- Accessibility checks: focus/overflow proof required after coding.
- Parity evidence: screenshot references from APP-AUDIT-001.

## Deployment / Ops Evidence (required for runtime or infra tasks)
- Deploy impact: none.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: future shell smoke planned.
- Rollback note: no runtime change.
- Observability or alerting impact: none.
- Staged rollout or feature flag: not applicable.
- `DEPLOYMENT_GATE.md` reviewed: not applicable.

## Review Checklist (mandatory)
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Operation mode was selected according to task type.
- [x] Current stage is declared and respected.
- [x] Deliverable for the current stage is complete.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Integration checklist evidence is attached where applicable.
- [x] AI testing evidence is attached where applicable.
- [x] Deployment gate evidence is attached where applicable.
- [x] Definition of Done evidence is attached.
- [x] Relevant validations were run or deferred with reason.
- [x] Docs or context were updated if repository truth changed.
- [x] Learning journal was updated if a recurring pitfall was confirmed.

## Result Report
- Task summary: Planned the canonical authenticated shell and Company City
  dashboard implementation from an evidence-backed UX audit.
- Files changed: UX audit, design system, design memory, pattern gallery,
  planning/state/context docs.
- How tested: documentation/source/screenshot review; no runtime changes.
- What is incomplete: runtime UI implementation and screenshot parity proof.
- Next steps: implement the canonical shell and dashboard slice after user
  approval and release-priority reconciliation.
- Decisions made: shell must be command/company/workbench oriented and should
  converge vanilla and React private routes under one model.

## Notes

The implementation should not become a broad redesign of every route. Close the
shared shell first, then migrate/polish route content inside that frame.
