# Mission Control

Last updated: 2026-05-11

## Purpose

This file supersedes any older wording that says an agent must always finish
after exactly one tiny task. Agents may work for several hours inside one
bounded mission, as long as progress remains visible, recoverable, and proven.

The goal is not smallness for its own sake. The goal is controlled forward
motion from current reality toward the release objective.

## Mission Block

A mission block is a bounded work session that may contain multiple small tasks
when they belong to one coherent objective.

Every mission must define current project state, target outcome, release
objective, owned modules/files, included and excluded tasks, validation gates,
checkpoint cadence, stop conditions, and expected handoff artifact.

## Work Unit Rules

- Use one mission objective, not one random tiny task.
- Split the mission into small checkpoints, not isolated chat-sized fixes.
- Keep file ownership explicit when subagents or parallel work are used.
- Do not mix unrelated modules just because the agent has time.
- Do not start a second mission until the current mission has a status update,
  evidence, or a clear blocked handoff.
- If the mission uncovers a higher-priority P0 defect, record it in the module
  confidence ledger and either switch with explanation or stop for a decision.

## Checkpoint Cadence

For long-running work, update repository state after initial analysis, each
meaningful implementation slice, each validation pass or failure, before
changing direction, and before ending the session.

Checkpoint notes must answer what changed, what was proven, what failed or
stayed unknown, which module confidence rows changed, what remains in this
mission, and whether the release objective moved forward.

## Mission Status Vocabulary

- `PLANNED`
- `IN_PROGRESS`
- `CHECKPOINTED`
- `VERIFIED`
- `PARTIALLY_VERIFIED`
- `BLOCKED`
- `FAILED`
- `SUPERSEDED`

Never use "almost done", "close", or "should work" as a status.

## Evidence Requirements

Each mission must produce durable task board, project state, module confidence,
validation, real journey, residual-risk, and next-action evidence when those
surfaces are affected.

## Relationship To Tiny Tasks

Tiny tasks are mission slices, not the operating goal. Use a mission block when
a module needs end-to-end closure, a UI flow needs implementation plus proof, or
a release confidence gap spans code, docs, and tests.

## Handoff

Record mission status, completed slices, changed files/modules, evidence links,
module confidence changes, blockers, decisions needed, and the next recommended
mission or checkpoint.
