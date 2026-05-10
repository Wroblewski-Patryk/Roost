# Project Memory Index

Last updated: 2026-05-11

## Purpose

This file is the mandatory full-picture protocol for agents. It prevents the
project from drifting into repeated small fixes with no clear release progress.
Every non-trivial task must connect local code changes to the current product
state, architecture intent, module confidence, and the next release objective.

## Required Indexes

Agents must keep these indexes current enough that another Codex session can
continue from repository files alone:

- `.codex/context/PROJECT_STATE.md`: where the project is now, current phase,
  validation commands, deployment shape, and known runtime reality.
- `.codex/context/TASK_BOARD.md`: canonical task queue with `NOW`, `NEXT`,
  blockers, and done evidence.
- `.agents/core/mission-control.md`: mission block rules for multi-hour
  autonomous work.
- `.agents/state/module-confidence-ledger.md`: module-by-module confidence,
  working state, evidence, and next proof or fix.
- `.agents/state/system-health.md`: latest validation, broken journeys, stale
  checks, and environment state.
- `.agents/state/known-issues.md`: real unresolved defects, not vague concerns.
- `.agents/state/next-steps.md`: next executable tasks in priority order.
- `docs/architecture/`: current architecture truth.
- `docs/modules/` or module maps when present: implementation ownership and
  surface maps.
- `docs/planning/`: release plan and task sequencing.
- `docs/operations/`: release, deploy, smoke, rollback, and target-environment
  evidence.

## Architecture Refresh Protocol

When architecture, module boundaries, app flow, route ownership, data model,
runtime behavior, UX system, or deployment shape changes, the same task must
refresh the relevant indexes before it can be called done.

Minimum refresh checklist:

1. Update the canonical architecture or ADR file that owns the decision.
2. Update module maps or route/component/API ownership docs when affected.
3. Update `.codex/context/PROJECT_STATE.md` if phase, stack, deploy shape,
   validation commands, or runtime reality changed.
4. Update `.codex/context/TASK_BOARD.md` and `docs/planning/*` so the next
   task queue reflects the new architecture.
5. Update `.agents/state/module-confidence-ledger.md` for every affected
   module.
6. Update `.agents/state/system-health.md` when validation, smoke, deploy, or
   runtime status changed.
7. Record unresolved mismatches in `.agents/state/known-issues.md`.

Architecture changes left only in chat, commit messages, or scattered planning
notes are not accepted as source of truth.

## Module Confidence Ledger Protocol

Use `.agents/state/module-confidence-ledger.md` as the fast answer to:

- Which modules exist?
- Which user journeys does each module own?
- Does it work in the real app?
- What evidence proves that?
- What is blocked, broken, stale, or unverified?
- What is the next smallest proof or fix?

Before selecting a new implementation task, read the ledger and prefer work in
this order:

1. `BROKEN` or `FAIL` release-critical journeys.
2. `BLOCKED` release-critical journeys.
3. `IMPLEMENTED_NOT_VERIFIED` P0/P1 journeys.
4. `PARTIAL` journeys where evidence points to a real defect.
5. New features only after release-critical existing flows are stable or
   explicitly deferred.

Do not convert unknowns into features. First create a verification task. Create
a fix only when proof, code inspection, or a reproducible user journey shows a
real defect.

## Reality Language Rule

Agents must not report vague completion states such as "almost done", "close",
"should work", "looks good", or "probably fixed" without evidence.

Allowed completion language:

- `verified`: evidence exists and is recorded.
- `implemented, not verified`: code exists but proof is missing.
- `partially verified`: exact passing and missing scenarios are listed.
- `blocked`: exact blocker and next unblock action are listed.
- `failed`: fresh verification failed and the failure is recorded.

The user should not be the first tester of a core journey. If a task affects a
browser, mobile, API, auth, data, money, AI, or deployment flow, the agent must
run the relevant automated or manual journey proof where local access allows it.

## Real Journey Proof

For user-facing work, validation must prove the real journey, not just that code
compiled. Examples:

- create, edit, delete, and refresh the target entity when CRUD changed;
- navigate from the real entry point, not only direct route access;
- verify loading, empty, error, success, and blocked states when the action has
  those states;
- verify persistence after reload or service restart when data changes;
- verify mobile or responsive behavior when the surface is browser-facing;
- verify auth, ownership, and fail-closed behavior when data access matters.

If a journey cannot be exercised locally, record why, the residual risk, and the
next best proof. Do not mark the module as working.

## Full-Picture Mission Selection

Every autonomous run must start by answering:

- Where are we now?
- What is the final or current release objective?
- Which module or journey is the biggest blocker to that objective?
- What evidence do we already have?
- What mission or checkpoint would most increase release confidence?

Only then select one scoped mission or checkpoint. Small tasks are useful as
mission slices only when they are anchored to the release picture.

## Handoff Requirement

After substantial work, update the indexes and leave the next agent a clear
handoff:

- current objective;
- files and modules changed;
- evidence collected;
- module confidence changes;
- known broken or unverified journeys;
- next tiny task.
