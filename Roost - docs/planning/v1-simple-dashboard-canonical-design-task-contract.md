# Task

## Header
- ID: V1UX-CANON-001
- Title: Simple V1 Dashboard Canonical Design And Implementation Plan
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + Product Docs
- Depends on: UX100-W02 verification unblock before runtime implementation
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: APP-SHELL-001, UX100-W01, UX100-W02
- Requirement Rows: REQ-V1UX-CANON-001
- Quality Scenario Rows: QA-V1UX-CANON-001
- Risk Rows: RISK-V1UX-CANON-001
- Iteration: design planning
- Operation Mode: BUILDER
- Mission ID: V1UX-CANON
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed indirectly through the repository mission rules.
- [x] Missing or template-like state tables were not bootstrapped because this task creates a design plan only.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: define a simpler V1 owner dashboard and app shell that covers current backend capability without overwhelming the owner.
- Release objective advanced: make CompanyCore useful as a daily owner/client panel before the later Company City V2 direction.
- Included slices:
  - audit the current web IA and visual load
  - define a V1 sitemap/module map
  - define the canonical V1 dashboard screen
  - define Tailwind + DaisyUI design tokens and reusable component boundaries
  - define an implementation sequence for pixel-faithful delivery
- Explicit exclusions:
  - no runtime UI code changes in this planning slice
  - no backend/schema/API changes
  - no replacement of the long-term Company City V2 direction
- Checkpoint cadence: update the UX spec after concept image generation, then move to implementation only after user approval.
- Stop conditions: stop before code if the user changes the V1 navigation model, dashboard priorities, or visual direction.
- Handoff expectation: next agent can implement from the canonical spec and generated image without relying on chat memory.

## Context
CompanyCore already has rich backend and owner-console functionality: workspaces, operating areas, Company OS, tasks, relationships, Google Drive, ClickUp, API keys, and MCP tools. The current web shell exposes too much at once and still mixes technical routes, setup routes, and owner decisions. The user asked for a simpler V1 panel and dashboard that can later support Jarvis and Paperclip without becoming a button-heavy admin console.

## Goal
Create a canonical V1 design artifact and implementation plan for a simple, intuitive CompanyCore dashboard and shell.

## Scope
- Add design/planning documentation only.
- Allowed docs:
  - `docs/planning/v1-simple-dashboard-canonical-design-task-contract.md`
  - `docs/ux/v1-simple-dashboard-canonical-spec-2026-05-15.md`
  - `docs/ux/v1-simple-dashboard-canonical-audit-2026-05-15.md`
  - `docs/ux/assets/companycore-v1-simple-dashboard-canonical.png`
  - `docs/ux/assets/companycore-v1-ceo-dashboard-refined-canonical.png`
  - `docs/ux/assets/companycore-v1-apqc-executive-atlas-canonical.png`
  - `docs/ux/assets/companycore-v1-executive-atlas-awwwards-canonical.png`
  - `docs/ux/assets/companycore-v1-area-first-atlas-canonical.png`
  - `docs/ux/assets/companycore-v1-area-first-dashboard-desktop-canonical.png`
  - `docs/ux/assets/companycore-v1-area-first-dashboard-mobile-canonical.png`
- Source inputs:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `web/src/main.tsx`
  - `web/src/react-route-kit.tsx`
  - `docs/architecture/system-architecture.md`
  - `docs/ux/design-system-contract.md`
  - `docs/ux/web-app-ux100-audit-and-execution-plan-2026-05-15.md`

## Implementation Plan
1. Inspect current web app routes, shell, React route kit, backend-exposed capability map, and UX docs.
2. Define the target V1 sitemap around owner jobs instead of implementation routes.
3. Define the canonical dashboard screen with reusable shell, sidebar, decision brief, dashboard widgets, and linked module previews.
4. Generate one canonical dashboard image for V1.
5. Save the implementation plan and pixel-perfect workflow for a later code task.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues:
  - Current private routes expose many destinations and action buttons as equal-weight choices.
  - Vanilla and React surfaces have converged but still contain duplicated shell patterns and route-local command logic.
  - Dashboard has real signals but still competes with map, module cards, integration setup, and route command content.
  - The sidebar currently mixes company areas, workbenches, integrations, provider setup, API, MCP, and account items.
- Gaps:
  - No single simple V1 canonical dashboard image focused on daily owner use.
  - No concise V1 sitemap that tells implementers which modules are first-class and which routes are secondary.
  - No pixel-perfect implementation checklist for simplifying rather than expanding the UI.
- Inconsistencies:
  - Route names include both owner-language labels and implementation-language labels.
  - Some surfaces are still route/body specific instead of shell/component owned.
- Architecture constraints:
  - PostgreSQL and HTTP API remain source of truth.
  - MCP wraps HTTP routes and must stay permission/audit bounded.
  - The Company City V2 direction remains future scope, not this V1 simplification.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none for this stage
- Sources scanned: architecture, project state, task board, module confidence, current web source, UX docs
- Rows created or corrected: planning-only requirement/risk IDs in this task contract
- Assumptions recorded:
  - Safe: V1 can use the current backend capabilities without adding endpoints.
  - Safe: the later V2 city direction should be preserved as a future evolution.
  - Risky: exact implementation may need component extraction from both vanilla and React surfaces.
- Blocking unknowns: none for planning; code implementation should wait for user approval of the canonical image.
- Why it was safe to continue: no runtime behavior is changed in this stage.

### 2. Select One Priority Mission Objective
- Selected task: V1UX-CANON-001
- Priority rationale: a simplified canonical UI plan reduces the risk of continuing to add route-by-route polish on a crowded structure.
- Why other candidates were deferred: UX100-W02 runtime verification remains blocked by local API test environment; this task can progress safely as design/planning only.

### 3. Plan Implementation
- Files or surfaces to modify: docs and generated canonical image only.
- Logic: not applicable.
- Edge cases:
  - Do not hide backend-critical functions; demote advanced functions into module detail routes.
  - Do not create fake dashboard data; widgets must map to current API state.
  - Keep Jarvis/Paperclip as agent consumers of the same supervised API/MCP surface.

### 4. Execute Implementation
- Implementation notes: planning artifact and image will be created without changing runtime files.

### 5. Verify and Test
- Validation performed: `git diff --check` for documentation changes and
  visual review of the final area-first canonical image.
- Result: passed.

### 6. Self-Review
- Simpler option considered: only write a quick text plan.
- Technical debt introduced: no
- Scalability assessment: the spec decomposes shell and route components so later implementation can reduce duplication.
- Refinements made: V1 deliberately uses a calm client-panel dashboard instead of extending the V2 city metaphor.

### 7. Update Documentation and Knowledge
- Docs updated: this task contract, V1 canonical UX spec, V1 audit, UX design
  memory, task board, project state, planning queue, requirement matrix,
  quality scenarios, risk register, module confidence ledger, and next steps.
- Context updated: yes.
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] A V1 sitemap/module map exists and covers current backend capability.
- [x] A canonical dashboard image is generated and saved under `docs/ux/assets/`.
- [x] The implementation plan defines reusable shell/layout/component boundaries.
- [x] The plan defines Tailwind + DaisyUI tokens and icon strategy.
- [x] The plan defines pixel-perfect implementation and verification steps.

## Success Signal
- User or operator problem: the owner opens CompanyCore and knows what matters, what is blocked, and where to act without scanning dozens of buttons.
- Expected product or reliability outcome: future UI implementation can be scoped around one canonical shell and dashboard model.
- How success will be observed: implementation screenshots match the canonical image and route navigation feels smaller and clearer.
- Post-launch learning needed: yes

## Deliverable For This Stage
A design contract, canonical V1 UX spec, and generated dashboard image only.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new runtime structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Design spec is saved in `docs/ux/`.
- [x] Canonical image is saved in `docs/ux/assets/`.
- [x] Implementation plan is actionable and scoped.
- [x] No runtime code was changed in this planning task.
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
- Tests: `git diff --check` passed.
- Manual checks: source review of current web shell and route surfaces; visual
  review of the current desktop/mobile canonical implementation references.
- Screenshots/logs: generated canonical concept images under `docs/ux/assets/`.
- High-risk checks: no runtime files changed
- Coverage ledger updated: not applicable
- Module confidence ledger updated: yes, `V1UX-CANON-001`.
- Requirements matrix updated: yes, `REQ-V1UX-CANON-001`.
- Quality scenarios updated: yes, `QA-V1UX-CANON-001`.
- Risk register updated: yes, `RISK-V1UX-CANON-001`.
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: not applicable
- Endpoint and client contract match: not applicable
- DB schema and migrations verified: not applicable
- Loading state verified: not applicable
- Error state verified: not applicable
- Refresh/restart behavior verified: not applicable
- Regression check performed: documentation diff check only

## Product / Discovery Evidence
- Problem validated: yes
- User or operator affected: owner/operator, future Jarvis/Paperclip agent supervisors
- Existing workaround or pain: route-heavy console with too many equal-weight actions
- Smallest useful slice: canonical V1 dashboard and shell plan
- Success metric or signal: future implementation can reduce private nav to a compact owner-job IA and dashboard first viewport to one brief plus linked widgets
- Feature flag, staged rollout, or disable path: not applicable
- Post-launch feedback or metric check: yes

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: yes
- Feedback item IDs: V1UX-FB-001
- Feedback accepted: simplify V1 dashboard/client panel, reduce buttons, make sidebar departmental, plan component extraction
- Feedback needs clarification: none for concept stage
- Feedback conflicts: current V2 Company City direction is deferred, not rejected
- Feedback deferred or rejected: full V2 city implementation deferred
- Active task changed by feedback: yes
- New task created from feedback: yes
- Design memory updated: yes, area-first V1 company atlas pattern recorded.
- Learning journal updated: not applicable

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable
- Critical user journey: signed-in dashboard orientation
- SLI: not applicable in planning stage
- SLO: not applicable
- Error budget posture: not applicable
- Health/readiness check: not applicable
- Logs, dashboard, or alert route: not applicable
- Smoke command or manual smoke: future implementation should use signed-in browser proof
- Rollback or disable path: design-only

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable for design-only planning
