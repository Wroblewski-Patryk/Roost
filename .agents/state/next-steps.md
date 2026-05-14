# Next Steps

Last updated: 2026-05-14

## NOW

No local Company OS workflow recovery task is currently ready. Google Drive
production deployment and folder discovery are verified; the remaining import
gate is owner folder selection listed under `LATER`.

## NEXT

V2WEB-AGENT-024 is complete. Workflow recovery has backend lineage, web
controls, clean collection fetches, mock UI proof, and real-backend UI proof
against a disposable Docker Compose stack.

## LATER

1. AGRUN-007 Google Drive Owner Consent And First Import, blocked until the
   owner selects the Drive folder roots CompanyCore may import. Production now
   runs commit `c5878d95a47f17745f65689c08e9e317a6465777`; OAuth is active,
   protected Google Drive smoke passes, and owner folder discovery returned
   172 folders with `selectedFolderCount=0`.
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
