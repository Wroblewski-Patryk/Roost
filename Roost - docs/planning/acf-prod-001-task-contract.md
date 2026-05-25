# ACF-PROD-001 Operating Model Data Completion Decision

Last updated: 2026-05-14

## Task Type

Product decision

## Current Stage

Done

## Deliverable For This Stage

Decision record for whether empty projects, storage locations, knowledge roots,
and automation definitions require artificial seed/import work before the
pre-V2 foundation can continue.

## Goal

Prevent the owner web shell and MCP foundation from being shaped around fake
or ambiguous data while still making empty operating containers understandable.

## Scope

- `docs/planning/open-decisions.md`
- `.agents/state/decision-register.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/next-steps.md`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/web-and-mcp-foundation-task-plan.md`

## Implementation Plan

1. Review the completion-audit finding about empty projects, storage
   locations, knowledge roots, and automation definitions.
2. Decide whether to seed placeholder data, import real data, or accept an
   explicit empty-ready state.
3. Update source-of-truth planning and decision files.
4. Keep follow-up work focused on real owner-created/imported data only.

## Acceptance Criteria

- Decision is recorded in canonical planning/decision sources.
- No fake seed data or placeholder runtime objects are introduced.
- Empty containers remain allowed but must be labeled as empty-ready states in
  future UI work.
- Next queue no longer treats ACF-PROD-001 as an unresolved blocker.

## Definition Of Done

- Decision source of truth updated.
- Task board and active queue updated.
- No code or database behavior changed.
- Follow-up risk is explicit.

## Result Report

- Decision: do not seed fake projects, storage locations, knowledge roots, or
  automation definitions before V2.
- Accepted state: empty containers are valid foundation-ready states when they
  have clear UI copy and can be populated by real imports or owner actions.
- Rationale: synthetic data would make the sidebar and MCP context look more
  complete than the company actually is, weakening operator trust and AI data
  quality.
- Follow-up: future work should add real owner flows/imports and useful empty
  states, not placeholder rows.

