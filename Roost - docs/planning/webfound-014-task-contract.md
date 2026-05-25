# WEBFOUND-014 - V2 Visual Implementation Plan

## Task Type

UX architecture / visual implementation planning.

## Current Stage

Planning complete.

## Deliverable For This Stage

Define the canonical V2 visual implementation plan before Company City, game-like UI, or gamification mechanics are implemented.

## Goal

Turn the verified WEBFOUND foundation and V2 readiness decision into an executable visual plan for the authenticated shell, Company City dashboard, command brief, status strip, route migration, responsive behavior, and proof expectations.

## Scope

- `docs/ux/v2-visual-implementation-plan-2026-05-14.md`
- `docs/planning/web-and-mcp-foundation-task-plan.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/*` queue and evidence files
- `docs/planning/mvp-next-commits.md`
- `docs/ux/design-memory.md`

## Implementation Plan

1. Define canonical V2 product frame and non-goals.
2. Define desktop, tablet, and mobile layout zones.
3. Define reusable shell components and state requirements.
4. Define Company City first-viewport behavior and evidence signals.
5. Define route migration order and implementation slices.
6. Define validation and screenshot proof expectations.
7. Update active queues and state to close the WEBFOUND queue.

## Acceptance Criteria

- The plan separates planning from implementation slices.
- The plan reuses verified WEBFOUND foundations.
- The plan defines desktop, tablet, and mobile behavior.
- The plan defines `loading`, `empty`, `error`, `success`, `blocked`, and `needs review` states.
- The plan defines implementation order and proof expectations.
- Native mobile, fake data, broad gamification, and generic decorative visuals remain out of scope.

## Definition of Done

- V2 visual implementation plan is added.
- WEBFOUND-014 is marked done in queue/state files.
- Active queue moves to the next non-WEBFOUND task.
- `git diff --check` passes.

## Result Report

Added `docs/ux/v2-visual-implementation-plan-2026-05-14.md`.

The plan defines the canonical V2 authenticated shell, Company City dashboard composition, command brief, status strip, responsive behavior, state model, route migration order, visual asset strategy, and validation gates. It explicitly keeps direct implementation split into future slices.

Validation:

- `git diff --check`: passed.
