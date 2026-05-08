# Next Steps

Last updated: 2026-05-08

## NOW

UXA-013 React Workbench Canonical Route Decision is ready. Decide whether the
task workbench can replace the canonical `/tasks-adapter` route now or should
remain a parallel React preview until one more workbench proves parity.

## NEXT

UXA-014 React Workbench Second Route Candidate. Migrate one additional
workbench route only after UXA-013 decides the canonical route strategy.

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
