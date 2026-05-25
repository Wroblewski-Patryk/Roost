# V1 Project Control System

Last updated: 2026-05-11

## Purpose

This document defines how CompanyCore agents and maintainers should understand
the real project state before choosing work.

It exists because a large autonomous build can look unfinished forever if
historical tasks, future ideas, external blockers, evidence gaps, and real
implementation gaps are mixed together.

## Control Stack

Read these files in this order:

1. `.codex/context/PROJECT_STATE.md`
2. `.codex/context/TASK_BOARD.md`
3. `docs/planning/mvp-next-commits.md`
4. `docs/planning/v1-architecture-control-map.md`
5. `docs/operations/v1-function-coverage-audit.md`
6. `docs/operations/v1-function-coverage-ledger.csv`
7. `docs/operations/v1-code-surface-index.md`
8. `.agents/state/current-focus.md`
9. `.agents/state/known-issues.md`
10. `.agents/state/system-health.md`

Architecture still lives in `docs/architecture/`. The control stack does not
replace architecture; it explains the current project state against it.

## Truth Categories

Every feature, task, route, model, integration, or UI surface must fit exactly
one primary category before work starts.

| Category | Meaning | Action |
| --- | --- | --- |
| Implemented and verified | Code exists and has current local or target evidence. | Do not reopen unless there is a regression or approved expansion. |
| Implemented, needs evidence | Code exists, but the current proof is indirect, old, local-only, or incomplete. | Write a smoke or verification task first. Create an implementation task only if proof fails. |
| Local implementation gap | Approved architecture requires behavior that is missing locally. | Create one narrow vertical implementation task. |
| External blocker | Progress needs credentials, provider consent, repository permission, or infrastructure access. | Keep visible in blocked work; do not call it a local V1 gap. |
| V2 expansion | Valuable, but outside the approved V1 completion boundary. | Queue only after explicit V2 lane selection. |
| Historical evidence | Completed work retained for traceability. | Do not treat it as active work. |

## Daily Decision Loop

Before coding:

1. Read the active queue in `TASK_BOARD.md`.
2. Confirm the same next task appears in `docs/planning/mvp-next-commits.md`.
3. Check whether the task is derived from the function coverage ledger or an
   explicit user request.
4. If it is an evidence gap, write a verification task before changing runtime
   code.
5. If it is an implementation gap, define one vertical slice with API, DB, UI,
   MCP/agent, events/audit, tests, and docs where relevant.
6. If it is blocked externally, do not work around it locally.
7. After completion, update the ledger, task board, project state, and system
   health.

## Evidence Rules

Evidence must identify what was proven.

Good evidence:

- route, command, or UI flow exercised
- actor type and permission boundary used
- database or API readback checked
- event and audit side effects checked for Company OS actions
- desktop/mobile checked for UI work when relevant
- target-environment proof separated from local proof

Weak evidence:

- "build passes" for a feature that needs behavior proof
- screenshots without action/readback proof
- code inspection only for a high-risk lifecycle action
- production health check used as proof for a private workflow

## Required Gap Registers

The current minimum set is:

- function coverage ledger:
  `docs/operations/v1-function-coverage-ledger.csv`
- human-readable coverage audit:
  `docs/operations/v1-function-coverage-audit.md`
- code-surface index:
  `docs/operations/v1-code-surface-index.md`
- blocked external work:
  `.codex/context/TASK_BOARD.md`
- system health and validation evidence:
  `.agents/state/system-health.md`

If future work introduces a major new surface, add it to the code-surface
index and ledger in the same task.

## What Is Still Missing From The Control System

These are project-control improvements, not proof that V1 runtime is missing:

1. A small set of end-to-end evidence smokes for the highest-risk implemented
   flows.
2. A target-environment MCP smoke after final runtime service keys are created
   or rotated.
3. A multi-workspace isolation regression scenario before security-sensitive
   releases.
4. Google Drive target-safe content, write, or changes-reconcile proof when
   those become active product scope. The numbered department-root OAuth and
   first import proof is complete as of AGRUN-007.
5. A V2 lane decision before opening broad new product work.

## Anti-Loop Rules

- Do not turn every `PARTIAL` ledger row into feature work.
- Verify first; implement only after a real defect is observed.
- Do not add provider-specific workflow logic directly to processes or
  pipelines. Use `ToolAdapter` and `IntegrationCapability`.
- Do not expose direct database writes to agents. MCP must stay a wrapper over
  the HTTP API and capability boundary.
- Do not expand V2 product surfaces until the active evidence tasks are either
  passed, blocked, or explicitly deferred.

## Success Signal

The control system is working when a new agent can answer these questions in
under 10 minutes from repository files:

1. What is complete?
2. What is implemented but needs proof?
3. What is blocked externally?
4. What is the next single task?
5. Which file proves that this next task is legitimate?
6. Which validation command proves completion?
