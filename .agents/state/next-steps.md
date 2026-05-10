# Next Steps

Last updated: 2026-05-08

## NOW

UXA-015 React Canonical Route Switch Readiness is ready. After UXA-014, decide
whether a React route can safely become canonical or whether remaining
adapter/editor affordances need another slice.

## NEXT

UXA-016 React Route Shell Extraction. If UXA-015 keeps migration parallel,
extract shared React route helpers before adding a third workbench so
`web/src/main.tsx` does not keep growing as a monolith.

## LATER

1. AGRUN-007 Google Drive Owner Consent And First Import, blocked until real
   OAuth credentials and owner consent are available.
2. AGRUN-010 Upstream Agent Source Merge Execution, blocked until upstream
   write access or an approved fork/PR route exists.

## Selection Rules

- Pick one bounded mission objective for each autonomous iteration; use small
  checkpoint tasks inside that mission when useful.
- Prefer tasks that reduce blocker risk, regression risk, or unclear source of
  truth.
- Do not start new feature work when a P0/P1 regression or release blocker is
  unresolved.
- Keep this file synchronized with `.codex/context/TASK_BOARD.md` and
  `docs/planning/mvp-next-commits.md`.
