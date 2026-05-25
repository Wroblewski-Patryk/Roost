# UX Direction Task Contracts

This file records UX direction and design-decision tasks that are not runtime
implementation work, but still change the product source of truth.

## UXD-001 Company City UX Direction Decision

## Header
- ID: UXD-001
- Title: Company City UX Direction Decision
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: Frontend Builder
- Depends on: user-approved generated dashboard snapshot
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: not applicable
- Requirement Rows: not applicable
- Quality Scenario Rows: UX visual direction and responsive surface quality
- Risk Rows: UX drift risk
- Iteration: UX direction capture
- Operation Mode: ARCHITECT
- Mission ID: UXD-CITY-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are represented for this documentation
      slice.
- [x] No runtime implementation step was mixed into the planning stage.
- [x] Exactly one priority task was selected.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] Missing or template-like state tables were not relevant to this slice.
- [x] Affected UX source-of-truth files were identified.
- [x] The task improves future UX consistency and reduces design drift.

## Mission Block
- Mission objective: capture the accepted Company City visual direction as
  durable product memory.
- Release objective advanced: future dashboard, map, and mobile UX work can
  start from an approved visual thesis instead of generic dashboard patterns.
- Included slices: decision register, visual direction brief, design-system
  contract, design memory, task board, project state, and planning queue.
- Explicit exclusions: no runtime code, no route changes, no asset packaging,
  no production implementation.
- Checkpoint cadence: single documentation checkpoint.
- Stop conditions: stop before implementation and preserve current active
  runtime queue.
- Handoff expectation: future frontend tasks must turn this direction into a
  detailed implementation spec before coding.

## Context

The user approved a generated cinematic-realistic dashboard direction showing
CompanyCore as a classic architectural company city/campus. The dashboard
concept includes `GENERAL` as the central intake and orchestration district,
12 connected company departments, a command brief, a bottom value journey, and
light strategy-game feeling.

## Goal

Record the accepted UX/UI direction so future work can develop CompanyCore as a
strategic company-city map across web desktop, web tablet, web mobile, native
mobile, and native tablet.

## Scope

- `.agents/state/decision-register.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/ux-direction-task-contracts.md`
- `docs/ux/design-memory.md`
- `docs/ux/design-system-contract.md`
- `docs/ux/pattern-gallery.md`
- `docs/ux/visual-direction-brief.md`

## Implementation Plan
1. Inspect existing UX direction, design memory, task board, and project state.
2. Add the accepted Company City direction as a durable decision.
3. Update UX source-of-truth docs with visual, responsive, and gamification
   guidance.
4. Record the task as completed documentation/planning work.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Existing UX direction emphasized an operational cockpit but did not
  yet contain the approved cinematic company-city metaphor.
- Gaps: Future agents could continue building flat management dashboards unless
  the new direction was recorded.
- Inconsistencies: None found that blocked capture; the city direction extends
  management-first UX rather than replacing it.
- Architecture constraints: No runtime architecture change.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: project memory index, project state, task board, visual
  direction brief, design memory, design-system contract, pattern gallery, and
  planning queue.
- Assumptions recorded: the supplied image is the approved snapshot for visual
  direction, not a pixel-final implementation spec.
- Blocking unknowns: none for documentation capture.
- Why it was safe to continue: the user explicitly requested saving the
  direction and description for future development.

### 2. Select One Priority Mission Objective
- Selected task: UXD-001 Company City UX Direction Decision.
- Priority rationale: source-of-truth capture prevents UX drift before
  implementation starts.
- Why other candidates were deferred: active runtime queue remains unchanged.

### 3. Plan Implementation
- Files or surfaces to modify: UX, planning, decision, and context docs only.
- Logic: preserve management-first rules while adding the city/value-journey
  metaphor and evidence-backed gamification rules.
- Edge cases: avoid implying that gamification can be fake or disconnected from
  real company evidence.

### 4. Execute Implementation
- Implementation notes: recorded the Company City Map, `GENERAL` intake
  district, 12 operational districts, command brief, value journey, responsive
  web/native mobile expectations, and light gamification rules.

### 5. Verify and Test
- Validation performed: documentation review by file inspection and git diff.
- Result: source-of-truth docs now contain the accepted direction; no runtime
  validation required.

### 6. Self-Review
- Simpler option considered: only updating design memory.
- Technical debt introduced: no.
- Scalability assessment: the decision is broad enough to guide future screens
  while requiring implementation specs before coding.
- Refinements made: kept dense CRUD/workbench screens quieter so the city
  metaphor does not harm operational clarity.

### 7. Update Documentation and Knowledge
- Docs updated: yes.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] The approved Company City direction is recorded as a durable decision.
- [x] UX docs explain desktop, tablet, mobile web, native mobile, and native
      tablet implications.
- [x] Light gamification is constrained to real evidence-backed company
      progress.

## Success Signal
- User or operator problem: future UX work needs a memorable product metaphor
  and visual thesis.
- Expected product or reliability outcome: designers and agents can build
  consistent dashboard, map, and mobile surfaces.
- How success will be observed: future implementation specs cite this direction
  and preserve the Company City mental model.
- Post-launch learning needed: yes, after a real dashboard prototype exists.

## Deliverable For This Stage

Durable UX direction capture only.

## Definition of Done
- [x] Code build not applicable; no code changed.
- [x] Runtime/manual feature proof not applicable; no UI, API, CLI, or operator
      behavior changed.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

Runtime-focused DoD items are intentionally not applicable because this task
changed documentation and direction only.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: not run; documentation-only UX direction capture.
- Manual checks: reviewed changed docs after patching.
- Screenshots/logs: user-approved generated dashboard snapshot in chat.
- Reality status: verified.

## UX/UI Evidence
- Design source type: approved_snapshot.
- Design source reference: user-approved generated Company City dashboard image
  in the 2026-05-14 chat.
- Canonical visual target: cinematic-realistic Company City Map.
- Fidelity target: style_inspired until a future implementation spec defines
  pixel-close assets.
- Existing shared pattern reused: management-first UX rule and command center
  pairing.
- New shared pattern introduced: Company City strategic map.
- Design-memory update required: yes.
- Surface strategy checked: mobile, tablet, desktop.
- Responsive checks: documentation-only; runtime checks deferred.
- Parity evidence: user approval of the generated direction.

## Result Report
- Task summary: Captured the accepted Company City UX/UI direction.
- Files changed: decision register, UX docs, project state, task board,
  planning queue, and this task contract.
- How tested: documentation review; no runtime tests applicable.
- What is incomplete: no implemented dashboard redesign yet.
- Next steps: create a detailed dashboard implementation spec with responsive
  states before coding.
- Decisions made: CompanyCore should use a cinematic-realistic company-city
  metaphor with light evidence-backed gamification.

---

## UXD-002 Company City Dashboard V2 Target Spec

## Header
- ID: UXD-002
- Title: Company City Dashboard V2 Target Spec
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: Frontend Builder
- Depends on: UXD-001 Company City UX Direction Decision
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: not applicable
- Requirement Rows: not applicable
- Quality Scenario Rows: UX visual direction, responsive dashboard quality
- Risk Rows: UX drift risk, generated-reference mismatch risk
- Iteration: UX direction capture
- Operation Mode: ARCHITECT
- Mission ID: UXD-CITY-002
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are represented for this documentation
      slice.
- [x] No runtime implementation step was mixed into the planning stage.
- [x] Exactly one priority task was selected.
- [x] The task is aligned with repository source-of-truth documents.
- [x] Affected UX source-of-truth files were identified.
- [x] The task improves future UX consistency and reduces generated-image
      drift.

## Mission Block
- Mission objective: create and capture a clearer Dashboard V2 target for the
  Company City direction.
- Release objective advanced: future dashboard and responsive UI work can start
  from a stable visual target and element inventory.
- Included slices: generated visual target asset, dashboard spec, decision
  register, design memory, visual direction brief, pattern gallery, project
  state, task board, and planning queue.
- Explicit exclusions: no runtime implementation, no route changes, no
  production dashboard replacement.
- Checkpoint cadence: single documentation checkpoint.
- Stop conditions: stop before coding and preserve current active runtime
  queue.
- Handoff expectation: future implementation must create a scoped dashboard
  task and compare screenshots against the V2 target.

## Context

Generated UI images can drift in labels, counts, and component details. The
user requested a Dashboard V2 target plus a table-like inventory so future
changes to sidebar, footer, map, panels, and other shared UI elements can be
tracked and implemented consistently.

## Goal

Create a clearer Dashboard V2 target and record the exact intended structure of
the dashboard so future visual or implementation work has a single source of
truth.

## Scope

- `docs/ux/assets/company-city-dashboard-v2-target.png`
- `docs/ux/company-city-dashboard-v3-spec.md`
- `docs/ux/design-memory.md`
- `docs/ux/visual-direction-brief.md`
- `docs/ux/pattern-gallery.md`
- `.agents/state/decision-register.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/ux-direction-task-contracts.md`

## Implementation Plan
1. Generate a refined Dashboard V2 visual target from the accepted Company City
   direction.
2. Save the selected reference asset under `docs/ux/assets/`.
3. Write a table-driven spec that corrects generated-image drift and defines
   zones, districts, components, responsive behavior, interactions, and visual
   rules.
4. Link the spec from durable UX and planning source-of-truth files.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: The accepted direction existed, but there was no stable dashboard V2
  element inventory.
- Gaps: Future work could drift if each generated image redefined labels,
  sidebar items, footer/status behavior, or department counts.
- Inconsistencies: The previous concept contained extra districts such as
  Growth or Operations; the V2 written spec corrects this to `GENERAL` plus
  exactly 12 operating districts.
- Architecture constraints: No runtime architecture change.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: UX direction docs, design memory, canonical visual workflow,
  task board, and project state.
- Assumptions recorded: the generated asset is a visual target, while the
  written spec wins when labels or structure drift.
- Blocking unknowns: none for planning-stage capture.
- Why it was safe to continue: the user explicitly requested this target and
  inventory before implementation.

### 2. Select One Priority Mission Objective
- Selected task: UXD-002 Company City Dashboard V2 Target Spec.
- Priority rationale: the element inventory prevents UX drift before coding.
- Why other candidates were deferred: active runtime queue remains unchanged.

### 3. Plan Implementation
- Files or surfaces to modify: UX docs, planning docs, decision/context files,
  and one reference asset.
- Logic: preserve the accepted Company City metaphor while recording corrected
  product structure.
- Edge cases: generated visual details must not override the canonical 12-area
  model.

### 4. Execute Implementation
- Implementation notes: generated the V2 target, copied it into
  `docs/ux/assets/`, and wrote the dashboard spec.

### 5. Verify and Test
- Validation performed: viewed the saved image asset and ran `git diff --check`.
- Result: image asset exists; documentation changes have no whitespace errors.

### 6. Self-Review
- Simpler option considered: only saving the generated image.
- Technical debt introduced: no.
- Scalability assessment: the table-driven spec can absorb future user changes
  to sidebar, footer, map, and panels without losing the product model.
- Refinements made: added known reference corrections so implementation follows
  product truth rather than imperfect generated labels.

### 7. Update Documentation and Knowledge
- Docs updated: yes.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Dashboard V2 reference image is saved in the repository.
- [x] A table-driven spec defines the current target view.
- [x] The spec identifies the written source of truth when generated visuals
      drift.
- [x] Durable UX memory and planning files reference the target.

## Success Signal
- User or operator problem: future UI changes need a stable target to avoid
  visual drift.
- Expected product or reliability outcome: dashboard implementation and future
  visual changes can be reviewed against the same element inventory.
- How success will be observed: future dashboard tasks cite
  `docs/ux/company-city-dashboard-v3-spec.md`.
- Post-launch learning needed: yes, after prototype implementation and
  screenshot comparison.

## Deliverable For This Stage

Dashboard V2 visual target plus element inventory, not runtime implementation.

## Definition of Done
- [x] Code build not applicable; no code changed.
- [x] Runtime/manual feature proof not applicable; no UI, API, CLI, or operator
      behavior changed.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `git diff --check` passed without whitespace errors; it reported only
  existing LF/CRLF warnings.
- Manual checks: opened
  `docs/ux/assets/company-city-dashboard-v2-target.png` with `view_image`.
- Screenshots/logs: saved Dashboard V2 reference asset.
- Reality status: verified.

## UX/UI Evidence
- Design source type: approved_snapshot.
- Design source reference:
  `docs/ux/assets/company-city-dashboard-v2-target.png`.
- Canonical visual target: Company City Dashboard V2.
- Fidelity target: structurally_faithful for first implementation.
- Evidence-driven UX review used: partial; full review deferred to
  implementation.
- Existing shared pattern reused: Company City Map, command center pairing,
  management-first UX.
- New shared pattern introduced: table-driven Dashboard V2 target spec.
- Design-memory update required: yes.
- Surface strategy checked: mobile, tablet, desktop.
- Responsive checks: documentation-only; runtime checks deferred.
- Parity evidence: saved reference asset plus written correction/spec table.

## Result Report
- Task summary: Generated and documented the Dashboard V2 target.
- Files changed: UX asset, dashboard spec, design memory, visual direction,
  pattern gallery, decision register, project state, task board, planning
  queue, and this task contract.
- How tested: image viewed; documentation diff check passed.
- What is incomplete: no implemented dashboard redesign yet.
- Next steps: create a scoped implementation task for the dashboard shell,
  city canvas, overlays, command brief, value journey, and responsive variants.
- Decisions made: written spec wins over generated image drift.

---

## UXD-003 Company City Dashboard V3 Department Model

## Header
- ID: UXD-003
- Title: Company City Dashboard V3 Department Model
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: Frontend Builder
- Depends on: user-provided department list, UXD-002
- Priority: P1
- Mission ID: UXD-CITY-003
- Mission Status: VERIFIED

## Context

The user provided the canonical CompanyCore department taxonomy:

| ID | Department |
| --- | --- |
| 00 | Ogolny |
| 01 | Strategia |
| 02 | Produkt |
| 03 | Sprzedaz |
| 04 | Operacje |
| 05 | Relacje |
| 06 | Kadry |
| 07 | Finanse |
| 08 | Zasoby |
| 09 | Technologia |
| 10 | Prawo |
| 11 | Innowacje |
| 12 | Zarzadzanie |

## Goal

Supersede the V2 department labels with the user's universal 13-area company
model and generate the first department drill-down target for `12 Zarzadzanie`.

## Scope

- `docs/ux/assets/company-city-dashboard-v3-target.png`
- `docs/ux/assets/company-city-management-department-v1-target.png`
- `docs/ux/company-city-dashboard-v3-spec.md`
- `docs/ux/design-memory.md`
- `docs/ux/visual-direction-brief.md`
- `.agents/state/decision-register.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/ux-direction-task-contracts.md`

## Implementation Plan
1. Generate Dashboard V3 using the user's canonical department model.
2. Generate the `12 Zarzadzanie` department drill-down target.
3. Save both assets under `docs/ux/assets/`.
4. Update the dashboard spec and durable UX/project memory.

## Acceptance Criteria
- [x] Dashboard V3 uses `00 Ogolny` plus departments `01` through `12`.
- [x] `12 Zarzadzanie` has a dedicated drill-down target.
- [x] The written spec names V3 as the current source of truth.
- [x] V2 is marked historical or superseded where needed.

## Validation Evidence
- Tests: `git diff --check` run after the documentation pass; no whitespace
  errors, only existing LF/CRLF warnings.
- Manual checks: opened both saved target assets with `view_image`.
- Reality status: verified.

## Result Report
- Task summary: Captured Dashboard V3 around the user's department taxonomy and
  added the first department-detail target.
- Files changed: UX assets, dashboard spec, design memory, visual direction,
  decision register, project state, task board, planning queue, and this task
  contract.
- How tested: image preview and documentation diff check.
- What is incomplete: no runtime implementation yet.
- Next steps: use Dashboard V3 and the `12 Zarzadzanie` target for the first
  implementation or deeper UX iteration.
- Decisions made: Dashboard V3 supersedes V2 for department labels and future
  prompts.
