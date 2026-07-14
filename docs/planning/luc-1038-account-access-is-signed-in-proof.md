# LUC-1038 Account Access isSignedIn Proof

Date: 2026-07-14
Issue: [LUC-1038](/LUC/issues/LUC-1038)
Stage: verification

## Task Contract

- Goal: prove the Account access `implemented_needs_proof` gap for
  `web/src/api/auth-token.ts#isSignedIn`.
- Task Type: QA verification / focused browser proof.
- Current Stage: verification.
- Deliverable For This Stage: exact local browser proof for signed-in and
  signed-out private-route gating, linked evidence for the function row,
  regenerated readback, and source-of-truth closure.

## Scope

Indexed gap:

- `web/src/api/auth-token.ts#isSignedIn`

Files updated:

- `scripts/luc-1038-account-access-is-signed-in-proof.mjs`
- `docs/planning/luc-1038-account-access-is-signed-in-proof.md`
- `docs/architecture/scanner-overrides.json`
- `docs/testing/test-map.csv`
- `docs/ux/evidence/luc-1038-is-signed-in-proof/`
- generated architecture and Project Truth status exports after refresh

Exclusions:

- No product runtime code, schema, migration, provider call, protected smoke,
  deploy, push, restart, credential access, or production mutation.

## Diagnosis

`isSignedIn` already had broad auth smoke lineage and a direct documentation
link, but current Project Truth still classified the exact helper as
`implemented_needs_proof`. The unresolved proof detail was the helper's actual
route-gating effect inside `web/src/main.tsx#PrivateRoute`:

- when `companycoreOwnerToken` exists, the requested private route must render
  authenticated UI and authorize dashboard data requests with the bearer token;
  and
- when that token is absent, the same private route must fail closed to the
  login surface and store the canonical pending private path instead of
  rendering the authenticated dashboard.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Web build | PASS | `npm run build:web` refreshed `public/react`. |
| Focused browser proof | PASS | `node scripts/luc-1038-account-access-is-signed-in-proof.mjs` served the built web bundle locally and exercised `/dashboard` with and without `companycoreOwnerToken`. |
| Signed-in private-route gate | PASS | `docs/ux/evidence/luc-1038-is-signed-in-proof/report.json` records the seeded session token, authenticated dashboard render on `/areas?area=00-ogolny&view=overview`, bearer auth on `/v1/auth/me`, `/v1/departments`, and `/v1/dashboard/command`, and no pending private-path write. |
| Signed-out private-route gate | PASS | The same report records `/dashboard` normalizing to `/areas?area=00-ogolny&view=overview`, opening the login surface with no token present, persisting `companycorePendingPrivatePath=/areas?area=00-ogolny&view=overview`, and not rendering the authenticated dashboard. |
| Screenshot artifacts | PASS | `desktop-signed-in-dashboard.png` and `desktop-signed-out-login.png` under `docs/ux/evidence/luc-1038-is-signed-in-proof/`. |
| Override JSON parse | PASS | `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` |
| Architecture-awareness refresh | PASS | Refresh generated a current graph and proof register with the exact helper marked `verified`. |
| App-completion refresh | PASS | Refreshed app-completion no longer reports `web/src/api/auth-token.ts#isSignedIn` in the priority queue as `implemented_needs_proof`. |
| Project Truth apply | PASS | Refreshed Project Truth removes the `isSignedIn` gap and advances to the next unrelated row. |
| Architecture status | PASS | `npm run architecture:status` returns `GREEN` with zero evidence queue and chain worklist items. |

## Acceptance Criteria

- [x] A reproducible local browser proof shows a seeded owner token allows the
  private dashboard route to render authenticated UI.
- [x] A reproducible local browser proof shows the same route fails closed to
  the login surface when the token is absent.
- [x] The proof records pending private-path behavior for the signed-out case.
- [x] Repo-owned evidence report and screenshots are saved under
  `docs/ux/evidence/luc-1038-is-signed-in-proof/`.
- [x] The exact helper row is linked to proof in scanner overrides/test map.
- [x] Refreshed app-completion and Project Truth readback no longer classify
  `web/src/api/auth-token.ts#isSignedIn` as `implemented_needs_proof`.

## Result Report

Status: `VERIFIED`.

This lane closed the remaining proof gap on the frontend signed-in-state helper
without changing product code. Local browser evidence now proves that
`isSignedIn` gates private-route rendering directly from the session token: a
present token renders the authenticated dashboard and a missing token fails
closed to login while preserving the requested private path.

Residual risk outside scope: sibling auth-token helpers `ownerToken` and
`setOwnerToken` still remain documentation-only debt and should be handled as
separate curation lanes rather than part of this proof issue.
