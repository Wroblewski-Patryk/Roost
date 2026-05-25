# Existing Project Adoption Playbook

## Purpose

Use this playbook when applying this template to an existing repository. The
goal is to give agents enough stable context to work safely without pretending
the existing codebase already follows every template rule.

## Adoption Principle

Adopt in layers. Do not replace working project truth with template assumptions.

The template should first document what is real, then add guardrails, then move
work into the standard task loop.

## Phase 0: Snapshot And Protection

Before changing project instructions:

- record current branch and working tree status
- identify uncommitted user changes and avoid staging them accidentally
- list existing source-of-truth files such as README, architecture docs,
  release docs, runbooks, and test commands
- identify active deployment surface, if any
- record whether the repository has production users, customer data, secrets,
  payments, AI behavior, or background jobs

Output:

- short adoption note in `docs/planning/` or `.codex/context/PROJECT_STATE.md`
- explicit list of files that must not be overwritten

## Phase 1: Minimal Agent Context

Add or update only the context files needed for agents to navigate safely:

- `AGENTS.md`
- `.agents/workflows/general.md`
- `.agents/workflows/documentation-governance.md`
- `.agents/workflows/subagent-orchestration.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`

Required facts:

- real stack and package managers
- real validation commands
- real app entry points
- real deployment target or "not confirmed"
- real docs source of truth
- active branch and release posture

Do not add aspirational rules that the repository cannot satisfy yet. Put gaps
on the task board instead.

## Phase 2: Governance Fit Check

Compare the repository against template governance:

- language policy
- repository structure policy
- working agreements
- no temporary solutions rule
- Definition of Done
- integration checklist
- deployment gate
- security baseline

For each mismatch, choose one outcome:

- adopt now because the repo already supports it
- adapt because the repo needs a stack-specific version
- defer with a tracked task
- reject because it does not fit this product

Output:

- `docs/governance/template-adoption-decision-log.md` when adoption is large
- task-board entries for deferred gaps

## Phase 3: First Safe Work Queue

Create a small, executable queue before asking agents to build features.

The first queue should prefer:

- validation command repair
- docs/source-of-truth reconciliation
- missing smoke checks
- test harness stabilization
- small bug fixes with clear evidence

Avoid starting with:

- broad rewrites
- architecture migration
- visual redesign
- production deploy changes
- AI behavior changes

Those can come after context and validation are stable.

## Phase 4: Agent Role Activation

Activate roles only when they have enough context:

- Planner: after `PROJECT_STATE.md` and `TASK_BOARD.md` are factual
- Documentation: after canonical docs are identified
- Builder: after validation commands are known
- QA/Test: after test commands and target flows are known
- Security: after data, auth, secrets, and trust boundaries are mapped
- Ops/Release: after deploy target and rollback surface are known

Subagents may help with exploration only when ownership is read-only and
bounded. Write-capable subagents should wait until file ownership is explicit.

## Phase 5: Adoption Done Criteria

Template adoption is complete when:

- agents know where project truth lives
- validation commands are real or explicitly blocked
- task board has a small actionable `NOW` queue
- docs explain current reality and known gaps
- deployment posture is known or explicitly unconfirmed
- subagent delegation has ownership rules
- no template path points back to `!template` or sibling repositories
- first implementation task can be executed without re-discovering the whole
  repository

## Common Failure Modes

- copying template docs without replacing placeholders
- treating missing validation as acceptable background noise
- allowing multiple agents to edit the same files
- starting with feature work before the project state is factual
- keeping decisions only in chat or task summaries
- adding a new plan without activating the first executable task
- describing deployment as real before smoke and rollback are known
