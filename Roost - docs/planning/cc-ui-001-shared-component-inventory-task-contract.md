# Task

## Header
- ID: CC-UI-001
- Title: Shared Component Inventory For CompanyCore Management UI
- Task Type: research
- Current Stage: planning
- Status: DONE
- Owner: Frontend Builder + Product Docs
- Depends on: `docs/planning/companycore-00-04-08-operating-loop-plan.md`
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `CC-UI-001`
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
- Mission objective: prepare the `00 Main -> 04 Operations -> 08 Assets` loop for reusable Tailwind/DaisyUI implementation.
- Release objective advanced: reduce UI duplication risk before new department surfaces are added.
- Included slices: inspect current web component patterns and record the shared primitive contract.
- Explicit exclusions: runtime component extraction, visual redesign, browser proof.
- Checkpoint cadence: one docs checkpoint.
- Stop conditions: architecture conflict, unclear shared UI boundary, or runtime change requirement.
- Handoff expectation: next agent can implement `CC-UI-002` without redoing the inventory.

## Context

The owner requested a functional company-management tool where each department
uses common components instead of adding local clutter. Current web UI already
uses Tailwind and DaisyUI, but several repeated panels and tables live inside
`web/src/main.tsx`.

## Goal

Create a durable inventory and next-step contract for shared CompanyCore UI
primitives.

## Scope

- `web/src/main.tsx`
- `web/src/react-route-kit.tsx`
- `web/src/styles.css`
- `docs/planning/cc-ui-001-shared-component-inventory.md`
- planning/state files that reference the active queue

## Implementation Plan

1. Inspect existing shared and route-local UI components.
2. Identify repeated table, button, card, badge, notice, tab, and form patterns.
3. Define shared primitive contracts and adoption order.
4. Update planning and state evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: `web/src/main.tsx` contains many route-local table, state, card, and board components.
- Gaps: shared `DataTable` lacks pagination, loading/error state, mobile card fallback, and row-action conventions.
- Inconsistencies: direct DaisyUI `btn`, `badge`, and table classes are used across routes without one CompanyCore wrapper.
- Architecture constraints: Tailwind and DaisyUI theme remain the approved foundation.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: `web/src/main.tsx`, `web/src/react-route-kit.tsx`, `web/src/styles.css`, `package.json`.
- Rows created or corrected: module/requirement/risk/quality rows updated by this mission.
- Assumptions recorded: shared primitives should be introduced before more department runtime UI.
- Blocking unknowns: none for planning.
- Why it was safe to continue: no runtime behavior changed.

### 2. Select One Priority Mission Objective
- Selected task: `CC-UI-001`.
- Priority rationale: shared UI primitives are the foundation for the owner-requested `00`, `04`, and `08` work.
- Why other candidates were deferred: runtime department work should wait until duplication risk is mapped.

### 3. Plan Implementation
- Files or surfaces to modify: planning docs and state only.
- Logic: record existing reuse points and gaps.
- Edge cases: avoid declaring runtime components complete without code.

### 4. Execute Implementation
- Implementation notes: added the shared component inventory and adoption order.

### 5. Verify and Test
- Validation performed: `git diff --check`.
- Result: passed.

### 6. Self-Review
- Simpler option considered: only adding queue notes.
- Technical debt introduced: no.
- Scalability assessment: the primitive list is narrow enough to implement incrementally and broad enough for all departments.
- Refinements made: separated planning inventory from runtime extraction.

### 7. Update Documentation and Knowledge
- Docs updated: `docs/planning/cc-ui-001-shared-component-inventory.md`, task/state docs.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Repeated web UI patterns are identified from current source files.
- [x] Required shared primitives are listed with implementation contracts.
- [x] Adoption order prioritizes `00 Main`, `04 Operations`, and `08 Assets`.

## Success Signal
- User or operator problem: future screens should feel like one management system.
- Expected product or reliability outcome: fewer local component variants and cleaner responsive behavior.
- How success will be observed: later runtime tasks can reuse one button/table/card/status layer.
- Post-launch learning needed: yes.

## Deliverable For This Stage

Planning inventory and next runtime implementation tasks.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it

## Definition of Done
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `git diff --check`.
- Manual checks: source inspection of current web UI surfaces.
- Screenshots/logs: not applicable.
- High-risk checks: no runtime behavior changed.
- Module confidence ledger updated: yes.
- Module confidence rows closed or changed: `CC-UI-001`.
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
- Loading state verified: not applicable.
- Error state verified: not applicable.
- Refresh/restart behavior verified: not applicable.
- Regression check performed: docs-only diff check.

## Product / Discovery Evidence
- Problem validated: yes.
- User or operator affected: owner and future operators using company management screens.
- Existing workaround or pain: page-local UI variants in `web/src/main.tsx`.
- Smallest useful slice: shared component inventory.
- Success metric or signal: next runtime primitive tasks are explicit.
- Feature flag, staged rollout, or disable path: not applicable.
- Post-launch feedback or metric check: yes.

## User Feedback Evidence
- `docs/governance/user-feedback-loop.md` reviewed: not applicable.
- Feedback item IDs: owner request in current thread.
- Feedback accepted: CompanyCore UI must reuse shared Tailwind/DaisyUI components.
- Feedback needs clarification: none.
- Feedback conflicts: none.
- Feedback deferred or rejected: runtime extraction deferred to `CC-UI-002`/`CC-UI-003`.
- Active task changed by feedback: yes.
- New task created from feedback: yes.
- Design memory updated: not applicable.
- Learning journal updated: not applicable.

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable.
- Critical user journey: reusable responsive management UI.
- SLI: not applicable.
- SLO: not applicable.
- Error budget posture: not applicable.
- Health/readiness check: not applicable.
- Logs, dashboard, or alert route: not applicable.
- Smoke command or manual smoke: not applicable.
- Rollback or disable path: docs-only revert.

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable.
