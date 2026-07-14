# LUC-1043 Account Access ownerToken Proof

Date: 2026-07-14
Issue: [LUC-1043](/LUC/issues/LUC-1043)
Stage: verification

## Task Contract

- Goal: prove the Account access `implemented_needs_proof` gap for
  `web/src/api/auth-token.ts#ownerToken`.
- Task Type: QA verification / focused browser proof.
- Current Stage: verification.
- Deliverable For This Stage: exact local browser proof that the frontend reads
  the session-scoped bearer token and sends it on both API and authenticated
  preview fetches, linked evidence for the function row, regenerated readback,
  and source-of-truth closure.

## Scope

Indexed gap:

- `web/src/api/auth-token.ts#ownerToken`

Files updated:

- `scripts/luc-1043-account-access-owner-token-proof.mjs`
- `docs/planning/luc-1043-account-access-owner-token-proof.md`
- `docs/architecture/scanner-overrides.json`
- `docs/testing/test-map.csv`
- `docs/ux/evidence/luc-1043-owner-token-proof/`
- generated architecture and Project Truth status exports after refresh

Exclusions:

- No product runtime code, schema, migration, provider call, protected smoke,
  deploy, push, restart, credential access, or production mutation.

## Diagnosis

`ownerToken` already had broad auth smoke lineage and the exact documentation
link in `docs/API.md`, but Project Truth still classified the helper as
`implemented_needs_proof`. The unresolved detail was current direct proof that
the helper reads the active `companycoreOwnerToken` value from session storage
and actually supplies it to the two frontend call paths that depend on it:

- `web/src/api/client.ts`, which attaches the bearer token to authenticated
  API reads such as `/v1/auth/me`, `/v1/departments`, and `/v1/assets/context`;
  and
- `web/src/features/departments/assets-route.tsx#AuthenticatedImage`, which
  reuses the same helper for protected `/v1/assets/files/:id/preview` fetches.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Web build | PASS | `npm run build:web` refreshed `public/react`. |
| Focused browser proof | PASS | `node scripts/luc-1043-account-access-owner-token-proof.mjs` served the built web bundle locally and exercised `/areas?area=08-zasoby&view=files` with `companycoreOwnerToken='proof-token'`. |
| API bearer auth from ownerToken | PASS | `docs/ux/evidence/luc-1043-owner-token-proof/report.json` records bearer-auth headers for `/v1/auth/me`, `/v1/departments`, and `/v1/assets/context` on desktop and mobile. |
| Authenticated preview bearer auth from ownerToken | PASS | The same report records authenticated `/v1/assets/files/proof-image/preview` requests with `Authorization: Bearer proof-token` on desktop and mobile. |
| Blob-backed image rendering | PASS | The report records `renderedBlobPreview=true` for both viewports, proving the authenticated preview fetch resolved into rendered `blob:` image URLs. |
| Screenshot artifacts | PASS | `desktop-owner-token-assets.png` and `mobile-owner-token-assets.png` under `docs/ux/evidence/luc-1043-owner-token-proof/`. |
| Responsive overflow | PASS | The report records `noHorizontalOverflow=true` for both desktop and mobile. |
| Runtime errors | PASS | The report records no console errors and no page errors. |
| Override JSON parse | PASS | `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` |
| Architecture-awareness refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `2026-07-14T04:09:26.784Z` with `2933` entities / `7221` relations / `16491` files and marks `function:ownertoken:cff9bd9e05` `verified` in `docs/graphs/architecture-proof-register.csv`. |
| App-completion refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `2026-07-14T04:09:42.591Z` with `1283` items / `5` flows / `1160` missing test links / `25` missing doc links / `8` implemented-needs-proof / `0` blocked / `1193` risk items and no longer reports `web/src/api/auth-token.ts#ownerToken` in the priority queue. |
| Project Truth apply | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` generated `2026-07-14T04:31:10.694Z` and advances the first Account access gap to `web/src/api/auth-token.ts#setOwnerToken` `missing_doc_link`. |
| Architecture status | PASS | `npm run architecture:status` returns `GREEN` with zero evidence queue and chain worklist items. |

## Acceptance Criteria

- [x] A reproducible local browser proof shows `ownerToken` supplies bearer auth
  to the shared frontend API client.
- [x] A reproducible local browser proof shows the same helper supplies bearer
  auth to the authenticated Assets preview fetch path.
- [x] Repo-owned evidence report and screenshots are saved under
  `docs/ux/evidence/luc-1043-owner-token-proof/`.
- [x] The exact helper row is linked to proof in scanner overrides/test map.
- [x] Refreshed app-completion and Project Truth readback no longer classify
  `web/src/api/auth-token.ts#ownerToken` as `implemented_needs_proof`.

## Result Report

Status: `VERIFIED`.

This lane closed the remaining proof gap on the frontend bearer-token read
helper without changing product code. Local browser evidence now proves that
`ownerToken` reads the current session token and propagates it into both
authenticated API reads and protected image-preview fetches from the live React
route.

Residual risk outside scope: sibling auth-token helper
`web/src/api/auth-token.ts#setOwnerToken` remains the first Account access
documentation-link gap and should be handled as a separate curation lane rather
than part of this proof issue.
