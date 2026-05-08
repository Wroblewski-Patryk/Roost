# Next Steps

Last updated: 2026-05-08

## NOW

UXA-010 React Dashboard Component Migration is ready. Migrate the dashboard
command surface into reusable React components, starting with app-shell-safe
primitives for command panel, attention rows, module launcher, notifications,
and table foundation.

## NEXT

After UXA-010, migrate the highest-value table/workbench primitive into React
with DaisyUI table foundations and existing local-feedback behavior.

## LATER

1. AGRUN-007 Google Drive Owner Consent And First Import, blocked until real
   OAuth credentials and owner consent are available.
2. AGRUN-010 Upstream Agent Source Merge Execution, blocked until upstream
   write access or an approved fork/PR route exists.

## Selection Rules

- Pick exactly one task for each autonomous iteration.
- Prefer tasks that reduce blocker risk, regression risk, or unclear source of
  truth.
- Do not start new feature work when a P0/P1 regression or release blocker is
  unresolved.
- Keep this file synchronized with `.codex/context/TASK_BOARD.md` and
  `docs/planning/mvp-next-commits.md`.
