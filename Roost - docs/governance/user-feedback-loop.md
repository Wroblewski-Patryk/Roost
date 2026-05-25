# User Feedback Loop

## Purpose

Use this loop when the user gives feedback during app creation or product
iteration. The goal is to turn user comments, visual notes, corrections,
preferences, and "make it feel more like..." guidance into small, traceable,
architecture-safe tasks.

Feedback is not chat decoration. If it changes product behavior, visual
direction, architecture, copy, workflow, validation, or priority, it must become
repo memory.

## When To Use

Use this loop when the user:

- comments on a screenshot, preview, design, or running app
- asks for visual, UX, copy, interaction, or information-architecture changes
- corrects product behavior or workflow assumptions
- says something should feel more premium, simpler, calmer, denser, faster, or
  closer to a reference
- changes priority during implementation
- points out a bug, mismatch, or missing state
- gives broad taste feedback that will affect future screens

For tiny one-off corrections, update the active task. For reusable guidance,
also update `docs/ux/design-memory.md` or `.codex/context/LEARNING_JOURNAL.md`.

## Feedback Intake

Capture each meaningful feedback item with:

- Source: user message, screenshot, review, QA, metric, incident, or support.
- Target: screen, route, component, workflow, API, data model, docs, or deploy
  path.
- Type: bug | UX | visual | copy | product | architecture | performance |
  security | deployment | priority.
- Severity: P0 | P1 | P2.
- Requested change:
- Why it matters:
- Evidence:
- Decision state: accepted | needs clarification | conflicts | deferred |
  rejected.

Use `.codex/templates/user-feedback-item-template.md` for durable feedback
items when the feedback is too important to leave only in a task note.

## Classification

Classify feedback before implementation:

- Bug: current behavior contradicts expected behavior.
- Product correction: the product should do something different.
- UX correction: the workflow, hierarchy, state, or action clarity should
  change.
- Visual correction: layout, spacing, density, color, imagery, motion, or
  polish should change.
- Copy correction: labels, tone, wording, localization, or error messages
  should change.
- Architecture correction: source of truth, module boundaries, runtime shape,
  or integration ownership should change.
- Priority correction: the next task or release order should change.

If feedback changes architecture, security posture, data ownership, deployment
shape, or a previously approved visual spec, stop and ask for explicit
confirmation before coding.

## Decision Flow

1. Restate the feedback in one concrete sentence.
2. Identify the affected source of truth.
3. Check for conflicts with:
   - `docs/architecture/`
   - `.codex/context/PROJECT_STATE.md`
   - active task contract
   - `docs/ux/design-memory.md`
   - canonical screenshot, mockup, or approved visual target
   - deployment/security constraints
4. Decide:
   - implement now inside the active task
   - create a new tiny task
   - update docs or design memory only
   - ask the user to choose between conflicting directions
   - defer with a clear reason
5. Record the result in the task, queue, design memory, learning journal, or
   open decisions.

## Implementation Rules

- Do not bundle unrelated feedback into one large patch.
- Do not reinterpret broad taste feedback as permission to redesign unrelated
  screens.
- Convert subjective feedback into observable acceptance criteria.
- For visual feedback, capture or reference before/after screenshots when
  possible.
- For workflow feedback, verify loading, empty, error, success, and blocked
  states if they are affected.
- For repeated feedback, update reusable memory instead of solving it again
  from scratch.
- For rejected or deferred feedback, record why, so future agents do not
  re-open it accidentally.

## Where Feedback Lives

| Feedback kind | Durable home |
| --- | --- |
| Active task detail | `.codex/templates/task-template.md` task artifact |
| Next implementation slice | `.codex/context/TASK_BOARD.md`, `docs/planning/mvp-next-commits.md`, `.agents/state/next-steps.md` |
| Product behavior truth | `docs/product/` or `docs/architecture/` |
| Visual direction or reusable pattern | `docs/ux/design-memory.md` |
| Canonical visual mismatch | `docs/ux/canonical-visual-implementation-workflow.md` task evidence |
| Recurring agent mistake | `.codex/context/LEARNING_JOURNAL.md` |
| Unresolved choice | `docs/planning/open-decisions.md` |
| Release or deploy concern | `docs/operations/` |

## Acceptance Criteria Pattern

Rewrite feedback into testable language:

- Instead of: "make it cleaner"
  Use: "reduce equal-weight panels, make the primary action dominant, and keep
  the first viewport focused on the user's next decision."
- Instead of: "this is wrong"
  Use: "the status should read from the canonical order state, not local UI
  state, and the empty/error states should explain recovery."
- Instead of: "more premium"
  Use: "increase spacing consistency, reduce noisy borders, use approved brand
  tokens, and verify desktop/mobile screenshots against the visual direction
  brief."

## Closure Report

When feedback is implemented, report:

- feedback item addressed
- files changed
- before/after evidence when UI changed
- validation run
- memory or docs updated
- remaining feedback or mismatches
- next tiny task

## Anti-Patterns

- Treating feedback as optional because it arrived mid-task.
- Fixing the visible symptom while ignoring source-of-truth drift.
- Applying a visual preference globally without checking other screens.
- Losing user-approved deviations from a screenshot or mockup.
- Saying "done" without showing what feedback was accepted, deferred, or still
  open.
- Turning one comment into a broad redesign without a task contract.
