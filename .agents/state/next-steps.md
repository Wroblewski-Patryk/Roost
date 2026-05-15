# Next Steps

Last updated: 2026-05-15

## NOW

1. Restore Google Drive OAuth usability for Jarvis.
   - Commit `fb6aca9` is deployed and lets `/settings/drive` repair OAuth even
     when old Google Drive ciphertext cannot be decrypted.
   - The current Jarvis container key is registered in CompanyCore and passes
     protected Google Drive smoke.
   - Complete owner Google Drive OAuth re-consent from `/settings/drive`, then
     rerun Jarvis Docs/Sheets creation/readback smoke.

## NEXT

1. REACT-WEB-002 ClickUp setup React workflow.
   - Rebuild the former `/settings` ClickUp token discovery, workspace/list
     selection, save, and maintenance run controls as React components against
     the existing `/v1/integration-settings/clickup*` contracts.
2. REACT-WEB-003 Google Drive OAuth/folder-selection React workflow.
   - Rebuild OAuth client save, authorize URL, authorization-code exchange,
     folder discovery, folder selection, import, and reconcile as React
     components against the existing Google Drive integration routes.
3. AGRUN-010 Upstream Agent Source Merge Execution.
   - Blocked until upstream write access or an approved fork/PR route exists.
4. Production push-to-running-image smoke after the next deploy.
   - Build metadata restoration is implemented locally; after deploy, compare
     public `/health` `build.commit` with the pushed commit before claiming
     auto-deploy proof.
5. V1AREA follow-up verification and route convergence.
   - First unblock the host API gate by setting a valid local `DATABASE_URL`
     and running `npm run test:api` for the new `/dashboard` routing.
   - Then start V1AREA-002 as a narrow `/areas` route convergence or
     capability-detail polish slice using the same area-first component model.

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
