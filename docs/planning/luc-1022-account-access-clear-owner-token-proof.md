# LUC-1022 Account Access clearOwnerToken Proof

Date: 2026-07-14
Issue: [LUC-1022](/LUC/issues/LUC-1022)
Stage: verification

## Task Contract

- Goal: prove the Account access `implemented_needs_proof` gap for
  `web/src/api/auth-token.ts#clearOwnerToken`.
- Task Type: QA verification / focused browser proof.
- Current Stage: verification.
- Deliverable For This Stage: exact local browser proof for sign-out and
  auth-reset token clearing, linked evidence for the function row, regenerated
  readback, and source-of-truth closure.

## Scope

Indexed gap:

- `web/src/api/auth-token.ts#clearOwnerToken`

Files updated:

- `scripts/luc-1022-account-access-clear-owner-token-proof.mjs`
- `docs/planning/luc-1022-account-access-clear-owner-token-proof.md`
- `docs/architecture/scanner-overrides.json`
- `docs/testing/test-map.csv`
- `docs/ux/evidence/luc-1022-clear-owner-token-proof/`
- generated architecture and Project Truth status exports after refresh

Exclusions:

- No product runtime code, schema, migration, provider call, protected smoke,
  deploy, push, restart, credential access, or production mutation.

## Diagnosis

`clearOwnerToken` already had test and documentation relations from the broader
[LUC-5561](/LUC/issues/LUC-5561) auth smoke plus
[LUC-1018](/LUC/issues/LUC-1018) doc-link closure, but Project Truth still
classified the exact helper as `implemented_needs_proof`. The unresolved proof
detail was the helper's explicit fail-closed behavior:

- user-initiated sign-out removes `companycoreOwnerToken` before returning to
  the public route; and
- auth-reset on `invalid_token` removes the same session token so the next
  private-route load falls back to login instead of reusing stale bearer auth.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Web build | PASS | `npm run build:web` refreshed `public/react`. |
| Focused browser proof | PASS | `node scripts/luc-1022-account-access-clear-owner-token-proof.mjs` served the built web bundle locally and exercised sign-out plus invalid-token auth reset. |
| Sign-out token clearing | PASS | `docs/ux/evidence/luc-1022-clear-owner-token-proof/report.json` records a signed-in dashboard load, user-menu sign-out click, redirect to `/`, and `sessionStorage.companycoreOwnerToken === null`. |
| Auth-reset token clearing | PASS | The same report records `/v1/dashboard/command` returning `401 invalid_token`, the request using `Authorization: Bearer proof-token`, token removal from session storage, and the next `/dashboard` load falling back to the login surface with `companycorePendingPrivatePath=/dashboard`. |
| Screenshot artifacts | PASS | `desktop-sign-out-cleared.png` and `desktop-auth-reset-login.png` under `docs/ux/evidence/luc-1022-clear-owner-token-proof/`. |
| Override JSON parse | PASS | `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` |
| Architecture-awareness refresh | PASS | Refresh generated a current graph and proof register with the exact helper marked `verified`. |
| App-completion refresh | PASS | Refreshed app-completion no longer reports `web/src/api/auth-token.ts#clearOwnerToken` in the priority queue as `implemented_needs_proof`. |
| Project Truth apply | PASS | Refreshed Project Truth removes the `clearOwnerToken` gap and advances to the next unrelated row. |
| Architecture status | PASS | `npm run architecture:status` returns `GREEN` with zero evidence queue and chain worklist items. |

## Acceptance Criteria

- [x] A reproducible local browser proof shows sign-out clears
  `companycoreOwnerToken`.
- [x] A reproducible local browser proof shows `invalid_token` auth reset clears
  `companycoreOwnerToken` and returns the next private-route load to login.
- [x] Repo-owned evidence report and screenshots are saved under
  `docs/ux/evidence/luc-1022-clear-owner-token-proof/`.
- [x] The exact helper row is linked to proof in scanner overrides/test map.
- [x] Refreshed app-completion and Project Truth readback no longer classify
  `web/src/api/auth-token.ts#clearOwnerToken` as `implemented_needs_proof`.

## Result Report

Status: `VERIFIED`.

This lane closed the remaining proof gap on the frontend auth-token reset
helper without changing product code. Local browser evidence now proves the
exact session-storage removal path for both explicit sign-out and automatic
auth reset on invalid bearer auth, and refreshed generated truth no longer
reports `clearOwnerToken` as needing proof.

Residual risk outside scope: sibling auth-token helpers `isSignedIn`,
`ownerToken`, and `setOwnerToken` still remain `missing_doc_link` rows and
should be handled as separate documentation lanes rather than part of this
proof issue.
