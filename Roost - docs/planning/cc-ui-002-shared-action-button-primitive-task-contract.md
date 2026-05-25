# Task

## Header
- ID: CC-UI-002
- Title: Shared Action/Button Primitive
- Task Type: refactor
- Current Stage: implementation
- Status: DONE
- Owner: Frontend Builder
- Depends on: `CC-UI-001`
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `CC-UI-002`
- Requirement Rows: `REQ-CC-UI-001`
- Quality Scenario Rows: `QA-CC-UI-001`
- Risk Rows: `RISK-CC-UI-001`
- Iteration: 1
- Operation Mode: BUILDER
- Mission ID: CC-LOOP-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: introduce the first shared CompanyCore action primitive.
- Release objective advanced: reduce page-local DaisyUI button duplication before `00`, `04`, and `08` runtime work.
- Included slices: add `CcButton`, adopt it in shared/local state actions, build and render-check it.
- Explicit exclusions: broad route migration, table/list primitive, visual redesign.
- Checkpoint cadence: one implementation checkpoint.
- Stop conditions: web build failure or behavior change in adopted surfaces.
- Handoff expectation: next task can build `CC-UI-003` table/list primitive and migrate more buttons incrementally.

## Context

`CC-UI-001` found direct DaisyUI `btn` usage across many route-local surfaces.
The owner asked for one reusable component model so future changes such as icon
placement, loading state, or disabled reasons can propagate consistently.

## Goal

Add a shared button/action component and adopt it in the smallest safe surfaces.

## Scope

- `web/src/components/cc-button.tsx`
- `web/src/react-route-kit.tsx`
- `web/src/main.tsx`
- planning/state files

## Implementation Plan

1. Add `CcButton` over DaisyUI `btn` classes with variant, size, icons,
   loading, disabled reason, href/button behavior, and accessible label props.
2. Adopt `CcButton` in `LocalNotice` and the generic `StatePanel`.
3. Validate with web build, static render check, browser route smoke, and diff hygiene.
4. Update task board and state ledgers.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: button markup is repeated directly across route files.
- Gaps: icon, loading, disabled reason, and anchor/button behavior were not centralized.
- Inconsistencies: future button changes would require many local edits.
- Architecture constraints: use DaisyUI theme and Tailwind utilities; avoid broad restyle.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: `web/src/main.tsx`, `web/src/react-route-kit.tsx`, `web/src/styles.css`.
- Rows created or corrected: module confidence and task board rows.
- Assumptions recorded: first adoption should be tiny and behavior-preserving.
- Blocking unknowns: none.
- Why it was safe to continue: component wraps existing DaisyUI classes and replaces equivalent anchors/buttons.

### 2. Select One Priority Mission Objective
- Selected task: `CC-UI-002`.
- Priority rationale: shared button primitive is the first runtime dependency for uncluttered management UI.
- Why other candidates were deferred: table/list primitive depends on the same shared-component direction but is larger.

### 3. Plan Implementation
- Files or surfaces to modify: component file plus two small call sites.
- Logic: use discriminated href/button behavior and keep default `type="button"` for button usage.
- Edge cases: disabled anchors drop `href`; loading disables action and shows DaisyUI spinner.

### 4. Execute Implementation
- Implementation notes: added `CcButton`; adopted in `LocalNotice` and generic `StatePanel`.

### 5. Verify and Test
- Validation performed:
  - `npm run build:web`
  - `npx tsx -e` static render of anchor button with icon
  - Playwright smoke for `/auth/login` on local Express dev server
  - `git diff --check`
- Result: passed. Browser route smoke found no console/page errors and no horizontal overflow.

### 6. Self-Review
- Simpler option considered: leave DaisyUI classes direct and document only.
- Technical debt introduced: no.
- Scalability assessment: the component can grow with additional variants and adoption without changing route behavior.
- Refinements made: default button type prevents accidental submit behavior.

### 7. Update Documentation and Knowledge
- Docs updated: task contract, task board, state files.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] A shared `CcButton` component exists.
- [x] The component supports variants, sizes, icons, loading, disabled reason, href/button behavior, and accessible labels.
- [x] At least one shared route-kit surface and one local web surface adopt the primitive without behavior changes.
- [x] Web build and render checks pass.

## Success Signal
- User or operator problem: future department screens reuse one action primitive instead of direct button copies.
- Expected product or reliability outcome: safer, consistent button behavior across management surfaces.
- How success will be observed: future UI changes can migrate more buttons to `CcButton`.
- Post-launch learning needed: yes.

## Deliverable For This Stage

Runtime shared button primitive plus minimal adoption.

## Definition of Done
- [x] Code builds without errors.
- [x] No existing functionality is broken by changed scope.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `npm run build:web`; `npx tsx -e "..."` render check.
- Manual checks: Playwright route smoke for local `/auth/login`.
- Screenshots/logs: browser smoke output reported no console/page errors and no horizontal overflow.
- High-risk checks: no provider/API/schema behavior changed.
- Module confidence ledger updated: yes.
- Module confidence rows closed or changed: `CC-UI-002`.
- Requirements matrix updated: yes.
- Requirement rows closed or changed: `REQ-CC-UI-001`.
- Quality scenarios updated: yes.
- Quality scenario rows closed or changed: `QA-CC-UI-001`.
- Risk register updated: yes.
- Risk rows closed or changed: `RISK-CC-UI-001`.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: not applicable.
- Endpoint and client contract match: not applicable.
- DB schema and migrations verified: not applicable.
- Loading state verified: static render covers loading-capable component API; route-level loading adoption remains future.
- Error state verified: unchanged state panel route behavior.
- Refresh/restart behavior verified: local Express dev server served the built React app route.
- Regression check performed: web build and route smoke.

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable.
