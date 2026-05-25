# Project Control System

Last updated: YYYY-MM-DD

## Purpose

Use this document to help agents and maintainers understand the real project
state before choosing work.

Large autonomous builds can look unfinished forever when historical tasks,
future ideas, external blockers, evidence gaps, and real implementation gaps
are mixed together. The control system separates those categories before any
agent starts coding.

## Control Stack

Read these files in this order and adapt the list to the real project:

1. `.codex/context/PROJECT_STATE.md`
2. `.codex/context/TASK_BOARD.md`
3. `docs/planning/mvp-next-commits.md`
4. `docs/planning/mvp-execution-plan.md`
5. `docs/operations/project-control-system.md`
6. latest function coverage ledger or audit, when present
7. latest code-surface or module index, when present
8. `.agents/state/current-focus.md`
9. `.agents/state/known-issues.md`
10. `.agents/state/module-confidence-ledger.md`
11. `.agents/state/system-health.md`
12. `docs/planning/open-decisions.md`

Architecture still lives in `docs/architecture/`. The control stack does not
replace architecture; it explains current project state against it.

## Truth Categories

Every feature, task, route, model, integration, workflow, or UI surface must
fit exactly one primary category before work starts.

| Category | Meaning | Action |
| --- | --- | --- |
| Implemented and verified | Code exists and has current local or target-environment evidence. | Do not reopen unless there is a regression or approved expansion. |
| Implemented, needs evidence | Code exists, but proof is indirect, old, local-only, or incomplete. | Write a smoke or verification task first. Create implementation work only if proof fails. |
| Local implementation gap | Approved architecture requires behavior that is missing locally. | Create one narrow vertical implementation task. |
| External blocker | Progress needs credentials, provider consent, repository permission, infrastructure access, or user decision. | Keep visible as blocked work; do not create local workaround behavior. |
| Future expansion | Valuable, but outside the approved current release boundary. | Queue only after explicit lane or version selection. |
| Historical evidence | Completed work retained for traceability. | Do not treat it as active work. |

## Daily Decision Loop

Before coding:

1. Read the active queue in `TASK_BOARD.md`.
2. Confirm the same next task appears in `docs/planning/mvp-next-commits.md`.
3. Check whether the task comes from a function coverage ledger, module
   confidence ledger, user request, or open decision.
4. If it is an evidence gap, write a verification task before changing runtime
   code.
5. If it is an implementation gap, define one vertical slice with UI, logic,
   API, data, tests, docs, events/audit, and operations where relevant.
6. If it is blocked externally, do not work around it locally.
7. After completion, update the ledger, task board, project state, and system
   health.

## Evidence Rules

Evidence must identify what was proven.

Good evidence:

- route, command, job, or UI flow exercised
- actor type and permission boundary used
- database, API, or service readback checked
- event and audit side effects checked for command actions
- desktop/mobile checked for UI work when relevant
- target-environment proof separated from local proof

Weak evidence:

- "build passes" for a feature that needs behavior proof
- screenshot without action/readback proof
- code inspection only for a high-risk lifecycle action
- production health check used as proof for a private workflow
- old planning closure used as proof for current behavior

## Required Gap Registers

Use the smallest set that fits the project:

- function coverage ledger or audit for user-visible and operator-visible
  capability status
- module confidence ledger for module and journey confidence
- code-surface or module index for ownership and route coverage
- task board for active, blocked, and next work
- system health for latest validation and runtime evidence
- open decisions for product, architecture, risk, or UX questions

If future work introduces a major new surface, add it to the relevant index or
ledger in the same task.

## Anti-Loop Rules

- Do not turn every partial ledger row into feature work.
- Verify first; implement only after a real defect is observed.
- Do not reopen implemented-and-verified work because an old checklist is still
  unchecked.
- Do not add provider-specific workflow logic directly to generic processes
  when the architecture requires adapters or capability boundaries.
- Do not expose direct database writes to agents.
- Do not expand future product surfaces until active evidence tasks are passed,
  blocked, or explicitly deferred.

## Success Signal

The control system is working when a fresh agent can answer these questions in
under 10 minutes from repository files:

1. What is complete?
2. What is implemented but needs proof?
3. What is genuinely missing?
4. What is blocked externally?
5. What is the next single task?
6. Which file proves that this next task is legitimate?
7. Which validation path proves completion?
