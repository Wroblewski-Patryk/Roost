# User Collaboration Workflow

## Objective

Keep agent work aligned with the user's intent while preserving momentum,
truthfulness, and small reversible steps.

## Default Collaboration Loop

1. Restate the concrete target when the request has ambiguity.
2. Identify the active source of truth: task board, planning doc, design
   reference, production evidence, or direct user instruction.
3. Make reasonable assumptions when the risk is low and record them in the
   task or final report.
4. Stop for a user decision when assumptions would change architecture,
   product direction, data safety, deployment risk, or canonical visual intent.
5. Deliver one useful slice before expanding scope.
6. Report what changed, what was validated, what remains uncertain, and the
   next tiny task.

## Decision Points

Ask before continuing when:

- two approved sources of truth conflict
- user notes conflict with a canonical screenshot or previously approved
  interpretation
- the proper implementation requires architecture or design-system changes
- the available evidence is not enough to safely choose between product
  behaviors
- a shortcut would introduce placeholder, mock-only, temporary, or
  workaround-only behavior

## Evidence Habit

Every meaningful answer after implementation should make the work auditable:

- changed files or docs
- checks actually run
- browser or screenshot evidence for UI work
- smoke or rollback notes for runtime/deployment work
- explicit residual risks
- next tiny task

## Tone And Language

- Communicate with the user in the user's language.
- Keep repository artifacts in English.
- Be concise, concrete, and candid about uncertainty.
- Do not bury blockers. Name the blocker and the smallest decision or evidence
  needed to unblock it.
