# Task

## Header
- ID: V1SETTINGS-001
- Title: Unified V1 Settings Canonical Design
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: Frontend Builder + Product Docs
- Depends on: V1 web shell and route registry foundation
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Settings / Integrations / Agent access
- Requirement Rows: future settings requirements to be derived during implementation
- Quality Scenario Rows: UX clarity, mobile responsiveness, AI access safety
- Risk Rows: AI authority, provider integration scope, stale V0 settings routes
- Iteration: 1
- Operation Mode: BUILDER
- Mission ID: V1SETTINGS-CANONICAL-DESIGN
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was considered for scope; this was a
      bounded planning task, not a long-running implementation mission.
- [x] Missing or template-like state tables were not needed for this design
      artifact.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified at
      planning level.
- [x] The task improves release confidence by producing canonical settings
      targets before V0 route cleanup.

## Mission Block
- Mission objective: create a canonical desktop and mobile visual target for
  the unified settings module.
- Release objective advanced: V1 web UX convergence and cleanup of V0 settings
  routes.
- Included slices: UX analysis, information architecture, desktop/mobile
  canonical images, planning spec.
- Explicit exclusions: no runtime React implementation, no backend contract
  changes, no route removal.
- Checkpoint cadence: single planning checkpoint.
- Stop conditions: architecture mismatch, blocked product decision, or
  inability to produce readable canonical images.
- Handoff expectation: future implementation can use the spec and images as
  the target for `/settings` route consolidation.

## Context

The V1 web view index marks `/settings`, `/settings/drive`, and
`/settings/integrations` as V0 rebuild surfaces. `/settings/api` and
`/react-agent-tools` are V1 foundations. The user requested one clean settings
module that supports application settings, ClickUp and Google Drive
integrations, API access, MCP usage, and AI-agent layers for Paperclip and
Jarvis.

## Goal

Define a canonical settings direction that separates integration setup,
knowledge, tools, API keys, MCP, and audit without creating ten disconnected
views or one overloaded provider form.

## Scope

Allowed files:

- `docs/ux/v1-settings-canonical-spec-2026-05-15.md`
- `docs/ux/assets/companycore-v1-settings-canonical.html`
- `docs/ux/assets/companycore-v1-settings-desktop-canonical.png`
- `docs/ux/assets/companycore-v1-settings-mobile-canonical.png`
- `docs/ux/design-memory.md`
- `docs/ux/v1-web-view-index-2026-05-15.md`
- `.codex/context/TASK_BOARD.md`

## Implementation Plan
1. Inspect the V1 UX index, design system, existing canonical images, and
   current settings/agent routes.
2. Define a settings IA that supports humans and AI agents.
3. Produce deterministic desktop and mobile canonical images.
4. Record the route direction, layers, states, and implementation handoff.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: settings are split across provider-shaped V0 routes and separate
  V1 foundation surfaces.
- Gaps: no canonical unified settings UX target existed.
- Inconsistencies: ClickUp, Drive, API, and MCP appear as separate routes
  instead of a coherent owner/agent administration module.
- Architecture constraints: reuse React V1 shell, route registry, real
  backend contracts, and no fake provider data.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none for this planning scope
- Sources scanned: project state, task board, V1 web view index, design system,
  area detail spec, existing React settings routes.
- Rows created or corrected: none
- Assumptions recorded: settings should become one module with tab-aware entry
  points.
- Blocking unknowns: none for planning; implementation still needs exact route
  redirect behavior.
- Why it was safe to continue: the user requested design and canonical images,
  not runtime route changes.

### 2. Select One Priority Mission Objective
- Selected task: unified V1 settings canonical design.
- Priority rationale: it unblocks REACT-WEB-002, REACT-WEB-003, and future V0
  cleanup.
- Why other candidates were deferred: implementation would be premature before
  a canonical target exists.

### 3. Plan Implementation
- Files or surfaces to modify: UX spec, canonical assets, planning and memory
  docs.
- Logic: no runtime logic.
- Edge cases: mobile no-overflow, readable settings tabs, separation of
  OAuth/scope/import/map/verify.

### 4. Execute Implementation
- Implementation notes: created a deterministic HTML/CSS canonical mockup and
  rendered desktop/mobile PNGs with Playwright.

### 5. Verify and Test
- Validation performed: rendered both images and visually inspected them.
- Result: desktop and mobile images are readable and align with the V1 atlas
  shell direction.

### 6. Self-Review
- Simpler option considered: text-only IA without images.
- Technical debt introduced: no
- Scalability assessment: tab model supports future integrations and external
  applications without one route per tool.
- Refinements made: split AI-facing administration into knowledge, tools,
  access, and audit layers.

### 7. Update Documentation and Knowledge
- Docs updated: UX spec and canonical assets.
- Context updated: V1 web view index, task board, design memory.
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] Desktop canonical image exists.
- [x] Mobile canonical image exists.
- [x] Spec explains tabs, provider setup pattern, AI layers, and states.
- [x] Future implementation direction avoids ten disconnected settings views
      and one overloaded provider form.

## Success Signal
- User or operator problem: settings feel scattered and too technical for
  owner and AI administration.
- Expected product or reliability outcome: one settings module can govern
  integrations, knowledge, tools, API, MCP, and audit.
- How success will be observed: future implementation can replace V0 settings
  routes against these targets.
- Post-launch learning needed: yes

## Deliverable For This Stage

Planning artifacts and canonical desktop/mobile images only.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered
  behavior

## Definition of Done
- [x] Code builds without errors. Not applicable; no runtime code changed.
- [x] Feature works manually through the real UI, API, CLI, or operator path.
      Not applicable; planning image artifact only.
- [x] No mock, placeholder, fake, or temporary data/path remains in runtime.
- [x] Full data flow works across all relevant layers. Not applicable.
- [x] Backend and UI/client error handling exists where applicable. Not
      applicable.
- [x] No existing functionality is broken.
- [x] Feature works after restart, reload, or navigation refresh where
      applicable. Not applicable.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal, reliability, security, and rollback evidence are
      recorded when applicable.
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
- Tests: not applicable for planning artifact.
- Manual checks: desktop and mobile PNGs were opened and visually inspected.
- Screenshots/logs:
  `docs/ux/assets/companycore-v1-settings-desktop-canonical.png` and
  `docs/ux/assets/companycore-v1-settings-mobile-canonical.png`.
- High-risk checks: AI authority modeled through knowledge, tools, access, and
  audit separation.
- Coverage ledger updated: not applicable
- Module confidence ledger updated: no, no runtime module state changed.
- Requirements matrix updated: no, implementation requirements should be
  derived in the next build task.
- Quality scenarios updated: no
- Risk register updated: no
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: no, no runtime integration changed.
- Real API/service path used: not applicable
- Endpoint and client contract match: not applicable
- DB schema and migrations verified: not applicable
- Loading state verified: not applicable
- Error state verified: not applicable
- Refresh/restart behavior verified: not applicable
- Regression check performed: no runtime files changed.

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: owner, Jarvis, Paperclip, future AI agents and
  external applications.
- Existing workaround or pain: settings routes are provider-shaped or
  foundation-only instead of one coherent administration module.
- Smallest useful slice: canonical design and spec before implementation.
- Success metric or signal: one `/settings` module can replace or absorb the
  V0 settings routes.
- Feature flag, staged rollout, or disable path: not applicable for design.
- Post-launch feedback or metric check: yes

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: no
- Feedback item IDs: direct user request on 2026-05-15
- Feedback accepted: yes
- Feedback needs clarification: no for planning; implementation may need exact
  route compatibility decision.
- Feedback conflicts: none
- Feedback deferred or rejected: none
- Active task changed by feedback: yes
- New task created from feedback: yes
- Design memory updated: yes
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: no
- Critical user journey: owner configures integrations and agent access.
- SLI: not applicable for design.
- SLO: not applicable for design.
- Error budget posture: not applicable
- Health/readiness check: not applicable
- Logs, dashboard, or alert route: not applicable
- Smoke command or manual smoke: visual inspection.
- Rollback or disable path: keep existing settings routes until
  implementation and route-level proof pass.

## AI Testing Evidence
- `AI_TESTING_PROTOCOL.md` reviewed: no
- AI feature or agent authority changed: no runtime change; design separates
  knowledge, tools, access, and audit for future validation.
