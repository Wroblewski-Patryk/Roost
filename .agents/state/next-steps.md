# Next Steps

Last updated: 2026-05-15

## NOW

1. V1PROD-002 Deploy V1 canonical web layer and rerun parity.
   - Commit and deploy the current V1 canonical web layer.
   - Confirm public web/API `/health` report the deployed commit.
   - Recapture public home/login/register screenshots plus authenticated
     dashboard and selected-area screenshots against
     `docs/ux/v1-production-canonical-discrepancy-audit-2026-05-15.md`.
2. REACT-WEB-002 ClickUp setup React workflow.
   - Use the new `web/src/app-route-registry.ts` and shared React shell.
   - Rebuild ClickUp token discovery, workspace/list selection, save, and
     maintenance run controls inside the unified V1 settings module instead
     of keeping `/settings` as a ClickUp-only route.
3. REACT-WEB-003 Google Drive OAuth/folder-selection React workflow.
   - Use the same route registry and shell foundation.
   - Rebuild `/settings/drive` as a tab-aware unified settings entry for OAuth
     client save, authorize URL, authorization-code exchange, folder
     discovery, folder selection, import, mapping, and reconcile as React
     components against the existing Google Drive integration routes.
4. V1SETTINGS-002 Unified settings React implementation.
   - Use `docs/ux/v1-settings-canonical-spec-2026-05-15.md` plus the desktop
     and mobile canonical targets to converge General, Integrations,
     Knowledge, Tools, API, MCP, and Access & audit into one `/settings`
     module.

## NEXT

1. AGRUN-010 Upstream Agent Source Merge Execution.
   - Blocked until upstream write access or an approved fork/PR route exists.
2. Production push-to-running-image smoke after the next deploy.
   - Build metadata restoration is implemented locally; after deploy, compare
     public `/health` `build.commit` with the pushed commit before claiming
     auto-deploy proof.
3. V1AREA database-backed proof.
   - First unblock the host API gate by setting a valid local `DATABASE_URL`
   and running `npm run test:api`.
   - Then repeat the selected-area route proof against database-backed owner
   state.
4. V1AREA capability actions.
   - Add create/edit/filter actions only where an existing backend contract
     already supports the selected capability safely.

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
