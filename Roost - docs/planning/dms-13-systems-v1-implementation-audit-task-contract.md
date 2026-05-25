# DMS 13 Systems V1 Implementation Audit Task Contract

## Task Type

Planning / architecture handoff.

## Current Stage

analysis

## Deliverable For This Stage

A source-backed V1 implementation audit for `00 Main` plus the 12 operating
department management systems.

## Goal

Define how all 13 CompanyCore department systems should be implemented for V1
using the backend, tables, APIs, web shell, Google Drive index, Company OS
records, and Paperclip/MCP safety boundaries that already exist. The audit must
also identify missing backend structures and the safest first implementation
slice for each department.

## Scope

- `docs/planning/dms-13-systems-v1-implementation-audit.md`
- `docs/planning/v1-department-systems-global-implementation-plan.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/core/project-memory-index.md`
- `.agents/state/delivery-map.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/quality-attribute-scenarios.md`
- `.agents/state/risk-register.md`
- `.agents/state/next-steps.md`

Runtime code, schema migrations, API behavior, and UI components are out of
scope for this planning slice.

## Implementation Plan

1. Review the current DMS blueprint, UX view map, global implementation plan,
   API documentation, Prisma model list, task board, and state ledgers.
2. Map each department system to existing backend foundations, current web
   readiness, required V1 views, missing backend gaps, agent boundaries, and a
   first implementation slice.
3. Record a cross-system implementation order that starts from read-only,
   source-backed packets before any write or automation authority.
4. Refresh planning and agent state indexes so future implementation tasks
   start from the audit instead of chat-only context.

## Acceptance Criteria

- The audit covers exactly 13 systems: `00 Main` plus `01` through `12`.
- Each system includes purpose, existing backend reuse, current web readiness,
  V1 web/mobile expectation, backend gaps, Paperclip role, blocked actions, and
  first implementation slice.
- The audit distinguishes already implemented/read-only systems from systems
  that still need backend read packets.
- The global implementation plan and state files point future work to the
  audit.
- No runtime behavior or schema is changed in this planning task.

## Definition Of Done

- Documentation is written in English.
- `git diff --check` passes.
- The task is recorded in the task board, project state, memory index,
  delivery map, requirement matrix, quality scenarios, risk register, module
  confidence ledger, and next steps.

## Result Report

Completed in this task:

- Added the 13-system V1 implementation audit with per-system backend/web/AI
  readiness and first-slice recommendations.
- Updated the active DMS implementation plan and source-of-truth ledgers.

Validation:

- `git diff --check`
