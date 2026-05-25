# Unified Organizational Operating System Architecture Task Contract

Last updated: 2026-05-16

## Task Type

Architecture documentation and source-of-truth alignment.

## Current Stage

Release.

## Deliverable For This Stage

Committed architecture documentation update that aligns CompanyCore's existing
architecture with the unified human/AI workforce and organizational world-state
direction.

## Goal

Document CompanyCore as the unified organizational operating system for humans,
AI agents, tasks, departments, hierarchy, permissions, pipelines, resources,
API, and MCP without contradicting the existing CompanyCore-as-non-AI boundary.

## Scope

- `docs/architecture/unified-organizational-operating-system.md`
- `docs/architecture/README.md`
- `docs/architecture/architecture-source-of-truth.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/autonomous-company-operating-system.md`
- `docs/architecture/organizational-architecture-bridge.md`
- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/department-management-systems-v1-blueprint.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/README.md`
- `.agents/core/project-memory-index.md`
- `.agents/state/decision-register.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/risk-register.md`
- `.agents/state/module-confidence-ledger.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`

No runtime code, schema migration, API route, or UI implementation is in scope.

## Implementation Plan

1. Review current architecture, Prisma schema, capability/MCP manifest, task,
   workforce, pipeline, and department foundations.
2. Add a dedicated unified organizational operating-system architecture file.
3. Link the new file from architecture reading order and source-of-truth docs.
4. Update existing architecture summaries so the new direction extends current
   Company OS, DMS, task, and MCP contracts.
5. Record the decision, requirement, risk, module confidence, project state,
   and task-board evidence.
6. Run documentation validation and git diff checks.
7. Commit the scoped documentation change.

## Acceptance Criteria

- The architecture explicitly states that CompanyCore is organizational
  infrastructure and not AI.
- Humans and AI agents are described as unified organizational workforce
  entities.
- The target workforce model covers human profile, agent profile, hierarchy,
  rank, role, department, supervisor, workload, context access, and active
  status.
- Task architecture covers delegation, escalation, recursive subtasks,
  approvals, reporting, dependencies, procedures, attached context, history,
  and audit.
- Permissions and visibility are documented as rank/role/department/project
  context derived across frontend, API, MCP, resources, and read packets.
- MCP/API-first world-state exposure is documented.
- Missing abstractions are marked as future scoped gaps, not immediate broad
  implementation approval.
- Source-of-truth state files contain a recoverable pointer to the decision.

## Definition Of Done

- Architecture docs are updated and internally consistent.
- No runtime behavior changed.
- `git diff --check` passes.
- A commit is created for the documentation change.

## Result Report

Completed on 2026-05-16. Added the unified organizational operating-system
architecture and linked it from the canonical architecture set. Recorded the
new direction in decision, requirement, risk, module-confidence, project-state,
and task-board source-of-truth files. Validation: `git diff --check`.
