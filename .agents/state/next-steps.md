# Next Steps

Last updated: 2026-05-15

## NOW

1. Restore Google Drive OAuth usability for Jarvis.
   - Restore the matching production `INTEGRATION_SECRET_KEY` for the existing
     encrypted Google Drive OAuth material, or complete owner Google Drive
     OAuth re-consent from `/settings/drive`.
   - Rerun CompanyCore protected content refresh and Jarvis Docs/Sheets
     creation/readback smoke before resuming unrelated work.

## NEXT

1. AGRUN-010 Upstream Agent Source Merge Execution.
   - Blocked until upstream write access or an approved fork/PR route exists.
2. Production push-to-running-image smoke after the next deploy.
   - Build metadata restoration is implemented locally; after deploy, compare
     public `/health` `build.commit` with the pushed commit before claiming
     auto-deploy proof.
3. V1AREA-001 Area-first dashboard implementation.
   - Ready task contract:
     `docs/planning/v1-area-first-pixel-perfect-task-contract.md`.
   - Implementation plan:
     `docs/planning/v1-area-first-pixel-perfect-implementation-plan.md`.
   - Canonical desktop/mobile references:
     `docs/ux/assets/companycore-v1-area-first-dashboard-desktop-canonical.png`
     and
     `docs/ux/assets/companycore-v1-area-first-dashboard-mobile-canonical.png`.
   - Readiness review:
     `docs/ux/v1-area-first-web-readiness-review-2026-05-15.md`.

## LATER

1. ACF-UX-002 Company City Dashboard / Gamified Strategic Map.
   - Deferred to V2 readiness gate.
2. ACF-OPS-001 Auto-Deploy Proof Or Manual Path Acceptance.
3. ACF-QA-001 Lint And Split Test Gates.
4. AGRUN-010 Upstream Agent Source Merge Execution, blocked until upstream
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
