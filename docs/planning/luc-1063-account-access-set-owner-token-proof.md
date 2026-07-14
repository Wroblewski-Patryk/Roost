# LUC-1063 Account Access setOwnerToken Proof

Date: 2026-07-14
Issue: [LUC-1063](/LUC/issues/LUC-1063)
Stage: verification

## Task Contract

- Goal: prove the Account access `implemented_needs_proof` gap for
  `web/src/api/auth-token.ts#setOwnerToken`.
- Task Type: QA verification / focused browser proof.
- Current Stage: verification.
- Deliverable For This Stage: exact local browser proof that the frontend writes
  the session-scoped bearer token after auth success and workspace selection,
  linked evidence for the function row, regenerated readback, and
  source-of-truth closure.

## Scope

Indexed gap:

- `web/src/api/auth-token.ts#setOwnerToken`

Files updated:

- `scripts/luc-1063-account-access-set-owner-token-proof.mjs`
- `docs/planning/luc-1063-account-access-set-owner-token-proof.md`
- `docs/architecture/scanner-overrides.json`
- `docs/testing/test-map.csv`
- `docs/ux/evidence/luc-1063-set-owner-token-proof/`
- generated architecture and Project Truth status exports after refresh

Exclusions:

- No product runtime code, schema, migration, provider call, protected smoke,
  deploy, push, restart, credential access, or production mutation.

## Diagnosis

`setOwnerToken` already had broad auth smoke lineage and the exact
documentation link in `docs/API.md`, but Project Truth still classified the
helper as `implemented_needs_proof`. The unresolved detail was current direct
proof that the helper writes the active bearer token into session storage from
its two real frontend call sites:

- `web/src/features/auth/auth-pages.tsx`, which stores the token returned by
  successful `/v1/auth/login` or `/v1/auth/register` before private-route
  recovery; and
- `web/src/layout/shell.tsx#selectWorkspace`, which stores the replacement
  token returned by `/v1/workspaces/:id/actions/select` before reloading the
  dashboard under the new workspace context.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Web build | PASS | `npm run build:web` refreshed `public/react`. |
| Focused browser proof | PASS | `node scripts/luc-1063-account-access-set-owner-token-proof.mjs` served the built web bundle locally and exercised both auth success and workspace selection through the live React route. |
| Auth success writes session token | PASS | `docs/ux/evidence/luc-1063-set-owner-token-proof/report.json` records `storedTokenMatches=true` after sign-in and subsequent bearer-auth `/v1/auth/me`, `/v1/departments`, and `/v1/dashboard/command` requests with `Authorization: Bearer login-proof-token`. |
| Workspace selection writes replacement token | PASS | The same report records `storedTokenMatchesNewWorkspaceToken=true` after selecting `workspace-2`, the select POST uses `Authorization: Bearer workspace-initial-token`, and the post-reload `/v1/auth/me`, `/v1/departments`, and `/v1/dashboard/command` requests use `Authorization: Bearer workspace-switched-token`. |
| Screenshot artifacts | PASS | `desktop-login-set-owner-token.png` and `desktop-workspace-select-set-owner-token.png` under `docs/ux/evidence/luc-1063-set-owner-token-proof/`. |
| Responsive overflow | PASS | The report records `noHorizontalOverflow=true` for both proof scenarios. |
| Runtime errors | PASS | The report records no console errors and no page errors. |
| Override JSON parse | PASS | `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` |
| Architecture-awareness refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `2026-07-14T06:11:45.434Z` with `2952` entities / `7247` relations / `16496` files and marks `function:setownertoken:7303fbe684` `verified` in `docs/graphs/architecture-proof-register.csv`. |
| App-completion refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `1283` items / `5` flows / `1159` missing test links / `25` missing doc links / `8` implemented-needs-proof / `0` blocked / `1192` risk items and no longer reports `web/src/api/auth-token.ts#setOwnerToken` in the priority queue. |
| Project Truth apply | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` generated `2026-07-14T06:11:52.343Z` and advances the first gap to the unrelated Dashboard overview `src/app.ts#/dashboard` `missing_test_link` row. |
| Architecture status | PASS | `npm run architecture:status` returns `GREEN` with zero evidence queue and chain worklist items (`454` nodes / `765` relations / `35` chains). |

## Acceptance Criteria

- [x] A reproducible local browser proof shows `setOwnerToken` writes the auth
  response token before private-route recovery.
- [x] A reproducible local browser proof shows `setOwnerToken` writes the
  workspace-selection token before the dashboard reloads into the new
  workspace context.
- [x] Repo-owned evidence report and screenshots are saved under
  `docs/ux/evidence/luc-1063-set-owner-token-proof/`.
- [x] The exact helper row is linked to proof in scanner overrides/test map.
- [x] Refreshed app-completion and Project Truth readback no longer classify
  `web/src/api/auth-token.ts#setOwnerToken` as `implemented_needs_proof`.

## Result Report

Status: `VERIFIED`.

This lane closed the remaining proof gap on the frontend session-token write
helper without changing product code. Local browser evidence now proves that
`setOwnerToken` persists the fresh bearer token for both successful sign-in and
workspace switching before the next authenticated route load.

Residual risk outside scope: the next Project Truth gap is the unrelated
Dashboard overview `src/app.ts#/dashboard` `missing_test_link` row and should
be selected as a separate QA lane rather than broadening this auth-token proof
issue.
