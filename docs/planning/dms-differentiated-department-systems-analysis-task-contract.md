# Task

## Header
- ID: DMS-V1-005
- Title: Differentiated Department Management Systems Analysis
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: DMS-BLUEPRINT-001, DMS-01-005B
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `DMS-ARCH-001`, `DMS-01-005A`
- Requirement Rows: `REQ-DMS-DIFF-001`
- Quality Scenario Rows: `QA-DMS-DIFF-001`
- Risk Rows: `RISK-DMS-DIFF-001`
- Iteration: 2026-05-16-DMS-V1-005
- Operation Mode: ARCHITECT
- Mission ID: V1-DMS-DIFFERENTIATED-SYSTEMS
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches architecture/planning work.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local document appearance.

## Mission Block
- Mission objective: change V1 DMS architecture from identical department screens to 12 differentiated department management systems within one CompanyCore shell.
- Release objective advanced: future web/backend tasks can implement each department as a focused management product without drifting into inconsistent mini-apps.
- Included slices: source review, differentiated system model, per-department functionality, desktop/mobile UX assumptions, shared-vs-specific component rules, implementation queue updates, state refresh.
- Explicit exclusions: runtime code changes, schema migrations, production deploy, final visual mockups.
- Checkpoint cadence: one planning commit after docs validate.
- Stop conditions: source-of-truth conflict, missing product decision that changes runtime authority, or unclear 12-department scope.
- Handoff expectation: next implementation tasks can select one department and build against the differentiated assumptions.

## Context
The current DMS blueprint already defines `00 Main` plus 12 departments, but the common view model can make the product feel like one generic area screen repeated many times. The owner now wants each operating department to become its own management system while remaining part of CompanyCore.

## Goal
Produce source-of-truth analysis and assumptions for 12 differentiated department management systems, including functional scope and web UX requirements for desktop and mobile.

## Scope
- `docs/architecture/department-management-systems-v1-blueprint.md`
- `docs/ux/v1-department-management-systems-view-map.md`
- `docs/planning/v1-department-systems-global-implementation-plan.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/core/project-memory-index.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/quality-attribute-scenarios.md`
- `.agents/state/risk-register.md`
- `.agents/state/next-steps.md`
- `.agents/state/delivery-map.md`

## Implementation Plan
1. Review current DMS architecture, UX map, and implementation plan.
2. Add differentiated system principles and shared shell vs department app boundaries.
3. Define each of the 12 department systems with functionality, desktop UX, mobile UX, primary workflows, data needs, and agent boundaries.
4. Refresh view map and implementation plan so future tasks target specialized department boards.
5. Validate docs with `git diff --check`, then update status and commit.

## Acceptance Criteria
- [x] Architecture states that departments share a shell but not one identical board.
- [x] Each of the 12 operating departments has differentiated functionality and UX assumptions.
- [x] Desktop and mobile requirements are explicit enough for frontend implementation tasks.
- [x] Planning queue points to differentiated specs before broad runtime work.
- [x] Source-of-truth state files are updated.

## Validation Evidence
- Tests: `git diff --check`.
- Source review: confirmed differentiated assumptions in architecture, UX view map, implementation plan, task board, next steps, project state, module confidence, requirements, quality, risk, delivery map, and memory index.
- Reality status: verified

## Result Report
- Task summary: Converted the V1 DMS planning assumption from identical department screens to 12 differentiated department management systems inside one CompanyCore shell.
- Files changed: DMS architecture, UX view map, implementation plan, task board, project state, memory index, next steps, requirements, quality, risk, module confidence, delivery map.
- How tested: source review and `git diff --check`.
- What is incomplete: runtime implementation remains department-by-department; no code changed in this planning slice.
- Next steps: plan the next department slice, preferably `03 Sales`, using the differentiated-system contract.
