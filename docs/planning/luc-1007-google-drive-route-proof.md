# LUC-1007 Google Drive Route Proof

## Task Contract

- Task Type: integration verification / backend route-mount proof
- Current Stage: verification
- Deliverable For This Stage: fresh local proof that the Google Drive route
  mounted from `src/app.ts` works on the current workspace state, plus
  refreshed readbacks for the exact `/google-drive` gap

## Goal

Close the `Unclassified user workflow` app-completion gap for
`api_endpoint:use-google-drive:2b5bd7ccd8` by recording fresh local proof that
the `src/app.ts` protected mount serves the existing Google Drive integration
route family correctly.

## Scope

- `src/app.ts`
- `src/modules/google-drive/google-drive.routes.ts`
- `src/tests/api.test.ts`
- `docs/planning/luc-1007-google-drive-route-readback.md`
- `docs/architecture/scanner-overrides.json`
- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`
- `docs/status/project-truth-index.json`
- `docs/status/project-truth-index.md`

## Exclusions

- No product feature logic changes
- No production deploy, protected smoke, live Google account mutation, or
  secret work
- No attempt to clear unrelated Google Drive helper `missing_test_link` or
  `missing_doc_link` rows outside the exact route mount

## Verification Method

1. Use the smallest supported local API proof path for this repo:
   `npm run test:api:local`.
2. Rely on the existing `CompanyCore v1 protected API flow` coverage in
   `src/tests/api.test.ts`, which exercises the mounted Google Drive API family
   served through the protected mounts created in `src/app.ts`, including:
   `GET /v1/google-drive/files`,
   `GET /v1/google-drive/files/:id/content`,
   `PATCH /v1/google-drive/files/:id/scope`,
   `PATCH /v1/google-drive/files/:id/description`,
   `POST /v1/google-drive/docs`,
   `PATCH /v1/google-drive/docs/:id`,
   `POST /v1/google-drive/sheets`, and
   `PUT /v1/google-drive/sheets/:id/values`.
3. Refresh architecture-awareness, app-completion, and project-truth indexes so
   the exact `src/app.ts#/google-drive` row reflects the linked proof state.

## Acceptance Criteria

- Fresh local API proof passes on the current workspace state.
- `docs/status/app-completion-index.json` no longer reports
  `api_endpoint:use-google-drive:2b5bd7ccd8` as either `missing_test_link` or
  `missing_doc_link`.
- `docs/status/project-truth-index.json` no longer lists the `/google-drive`
  unclassified workflow gap.
- Any remaining Google Drive debt is called out precisely.

## Evidence

- `npm run test:api:local` PASS on the current workspace state.
- Existing `src/tests/api.test.ts` protected API flow covers the mounted
  Google Drive route family served through `src/app.ts` and
  `src/modules/google-drive/google-drive.routes.ts`.
- `docs/planning/luc-1007-google-drive-route-readback.md` records the protected
  `/google-drive` mount plus the mounted `/v1/google-drive` endpoint family.
- Architecture-awareness refresh PASS generated `2026-07-14T00:40:45.243Z`
  with `2895` entities / `7121` relations / `16476` files.
- App-completion refresh PASS generated after the exact documentation-link row
  landed with `1254` items / `1132` missing test links / `28` missing doc
  links / `8` implemented-needs-proof / `0` blocked / `1168` known risk items,
  and no longer reports `src/app.ts#/google-drive`.
- Project Truth apply PASS generated `2026-07-14T00:41:50.830Z` and no longer
  reports `src/app.ts#/google-drive`; the first remaining gap is
  `src/modules/workspaces/workspaces.routes.ts#requireUserAuth`
  `missing_test_link`.

## Result Report

Focused local proof and readback are now both linked to
`src/app.ts#/google-drive`. The exact route-gap moved from
`missing_test_link` to `missing_doc_link` after the first proof-only refresh,
which confirmed runtime proof was already sufficient and the remaining debt was
documentation linkage only. Adding the paired readback artifact plus the exact
`docs/architecture/relations/documentation-links.csv` row cleared the exact
`/google-drive` gap from both app-completion and Project Truth without changing
runtime code or touching live Google state.
