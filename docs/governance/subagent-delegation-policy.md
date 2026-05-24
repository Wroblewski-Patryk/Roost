# Subagent Delegation Policy (Codex)

## Goal

Use subagents to increase throughput while preserving one accountable owner for
quality, integration, and final task closure.

The main chat acts as the coordinator. Subagents are bounded contributors. A
delegated report is evidence, not approval. The coordinator owns the final
decision that work is done.

## Coordinator Responsibilities

- keep the critical path, task framing, and final integration local
- decide whether delegation is useful before spawning subagents
- assign explicit ownership, constraints, and validation expectations
- prevent overlapping write scopes and duplicate investigations
- continue useful non-overlapping work while subagents run
- review subagent findings or diffs before trusting them
- run or require parent-level validation after integration
- update canonical state once from the main thread
- close the task only after every required subagent result is integrated,
  rejected, or converted into a tracked follow-up

## When to Delegate

- independent side tasks that can run in parallel
- bounded implementation slices with clear file or module ownership
- read-only exploration that can map risk while the coordinator frames the next
  local step
- targeted verification, QA, security, or UX review after a change is ready to
  inspect
- documentation sync that does not touch the same files as active code work

## When Not to Delegate

- urgent blocking tasks needed for the very next local step
- tasks that are tightly coupled and hard to split safely
- tasks with unclear ownership or acceptance criteria
- tasks where several workers would edit the same shared file or route registry
- tasks where the cost of integrating reports is higher than doing the work
  locally

## Delegation Rules

- assign explicit file, module, or responsibility ownership to each subagent
- avoid overlapping write scopes across parallel workers
- tell write-capable subagents that other agents may be active and that they
  must not revert or overwrite unrelated edits
- do not duplicate work between the coordinator and subagents
- give each subagent a concrete output contract and validation path
- keep shared state files, task closure, and final source-of-truth updates with
  the coordinator unless explicitly assigned otherwise
- integrate returned changes with review, conflict checks, and follow-up
  verification

## Coordination Rules

- prefer parallel workers only for independent subtasks
- keep one in-progress critical path at a time
- wait for subagents only when their result blocks the next parent-level step
- treat subagent confidence as provisional until the coordinator checks it
- if a subagent reports risk, overlap, or uncertainty, pause that lane and
  decide whether to narrow, reassign, or convert it into a follow-up task
- do not mark the parent task `DONE` while a required delegated lane is still
  unresolved

## Required Subagent Brief

Every delegated task should define:

1. objective
2. owned files, modules, or read-only responsibility
3. non-goals and forbidden files
4. known active parallel work, if any
5. required validations or evidence
6. expected output summary

## Required Subagent Report

Every delegated result should report:

1. objective completed or blocked
2. files changed, or confirmation that the task was read-only
3. validations run
4. findings, residual risks, and uncertainty
5. next suggested step

## Parent Completion Gate

Before declaring the parent task complete, the coordinator must verify:

- every delegated lane is complete, intentionally rejected, or tracked as a
  follow-up
- changed files do not conflict with each other or with user edits
- parent-level acceptance criteria are satisfied
- relevant lint, typecheck, tests, build, smoke, visual QA, or logical checks
  have run, or their absence is recorded as residual risk
- task board, project state, module confidence, and learning journal updates
  are synchronized when applicable

## Learning Preservation

Subagents do not get to hide useful learning in their private context. When a
subagent discovers a reusable rule, recurring mistake, environment pitfall,
architecture constraint, or validation lesson, the coordinator must decide
where to persist it:

- `.codex/context/LEARNING_JOURNAL.md` for recurring agent or tooling pitfalls
- `.agents/state/*` for active project memory and next work
- `docs/architecture/`, `docs/operations/`, `docs/security/`, or `docs/ux/`
  for durable source-of-truth changes
- `docs/planning/*` or `.codex/context/TASK_BOARD.md` for executable follow-up
  work
