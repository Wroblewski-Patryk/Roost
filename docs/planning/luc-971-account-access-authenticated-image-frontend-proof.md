# LUC-971 Account Access AuthenticatedImage Frontend Proof

Date: 2026-07-13
Issue: [LUC-971](/LUC/issues/LUC-971)
Stage: verification

## Task Contract

- Goal: add current frontend proof for the `AuthenticatedImage` auth surface in
  `08 Assets -> Files and folders`.
- Task Type: frontend verification / proof-link repair.
- Current Stage: verification.
- Deliverable For This Stage: current browser proof, linked evidence for the
  exact function entity, regenerated readback, and source-of-truth closure.

## Scope

Indexed gap:

- `web/src/features/departments/assets-route.tsx#AuthenticatedImage`

Files updated:

- `docs/planning/luc-971-account-access-authenticated-image-frontend-proof.md`
- `docs/architecture/scanner-overrides.json`
- `docs/ux/evidence/luc-971-authenticated-image-proof/`
- generated architecture and Project Truth status exports after refresh

Exclusions:

- No backend route changes, provider calls, production smoke, deploy, push,
  restart, credential reads, or runtime mutation.

## Diagnosis

The active `missing_test_link` row for `AuthenticatedImage` is confidence-model
debt, not a reproduced frontend defect. The Assets route already supports
authenticated image previews through `/v1/assets/files/:id/preview`, but the
current scanner exports did not link a direct proof packet to the exact
function entity.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Web build | PASS | `npm run build:web` completed successfully and produced current `public/react` assets. |
| Focused frontend browser proof | PASS | A one-off local Node server served `public/` with SPA fallback and Playwright Chromium opened `/areas?area=08-zasoby&view=files` on desktop and mobile with `sessionStorage.companycoreOwnerToken='proof-token'`. |
| Protected preview auth header | PASS | `docs/ux/evidence/luc-971-authenticated-image-proof/report.json` records `previewRequestCount=4` and every `/v1/assets/files/proof-image/preview` request carried `Authorization: Bearer proof-token`. |
| Assets packet auth header | PASS | The same report records every `/v1/assets/context`, `/v1/departments`, and `/v1/auth/me` request with `Authorization: Bearer proof-token`. |
| Authenticated image rendering | PASS | The proof waited for `img[alt=\"Proof Preview.png\"]` and verified rendered `src` values were `blob:` URLs created from the authenticated preview response. |
| Responsive overflow | PASS | The proof report records `desktopNoHorizontalOverflow=true` and `mobileNoHorizontalOverflow=true`. |
| Runtime errors | PASS | The proof report records no console errors and no page errors. |
| Screenshot artifacts | PASS | `docs/ux/evidence/luc-971-authenticated-image-proof/desktop-assets-authenticated-image.png` and `mobile-assets-authenticated-image.png`. |
| Override JSON parse | PASS | `node -e \"JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')\"` |
| Architecture-awareness refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `2868` entities / `6992` relations / `16464` files. |
| App-completion refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` regenerated the priority risk queue. `AuthenticatedImage` is absent from `docs/status/app-completion-index.json`, which is the correct success signal because that file stores only non-`ok` priority rows. |
| Project Truth apply | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` generated `2026-07-13T18:19:44.470Z` and the refreshed `docs/status/project-truth-index.json` no longer includes `web/src/features/departments/assets-route.tsx#AuthenticatedImage` in the gap list. |
| Architecture status | PASS | `npm run architecture:status` -> `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, all gates pass. |

## Acceptance Criteria

- [x] Current local frontend proof demonstrates `AuthenticatedImage` sends the
  owner bearer token to the preview endpoint.
- [x] Current local frontend proof demonstrates the image renders from the
  authenticated blob path in the Assets files view.
- [x] Browser proof artifacts are saved in the repository.
- [x] Regenerated readback no longer reports `AuthenticatedImage` as
  `missing_test_link`.

## Result Report

Status: `VERIFIED`.

The local browser run proved the `AuthenticatedImage` surface performs
authenticated preview fetches and renders the returned image blob on both
desktop and mobile without runtime errors or horizontal overflow. The scanner
override now links this proof packet directly to the function row, and the
refreshed app-completion / Project Truth readback cleared the original
`missing_test_link` classification for
`web/src/features/departments/assets-route.tsx#AuthenticatedImage`.
