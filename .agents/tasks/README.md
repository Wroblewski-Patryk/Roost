# Agent Tasks

Use this folder for project-local task artifacts when the task needs more
detail than `.codex/context/TASK_BOARD.md`.

Rules:

- Start from `.codex/templates/task-template.md`.
- Keep one task artifact per execution slice.
- Update the task with validation evidence before marking it `DONE`.
- Keep the queue synchronized with `.agents/state/next-steps.md`,
  `.codex/context/TASK_BOARD.md`, and `docs/planning/mvp-next-commits.md`.
