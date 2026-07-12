# LUC-567 Account Access Google Drive Authorization-Code Exchange Proof

Date: 2026-07-12
Issue: [LUC-567](/LUC/issues/LUC-567)
Task Type: QA verification / automated proof-link repair
Current Stage: verification
Status: VERIFIED
Owner: QA/Test
Mission ID: LUC-567-ACCOUNT-ACCESS-GOOGLE-DRIVE-AUTHORIZATION-CODE-EXCHANGE-PROOF

## Task Contract

- Goal: prove the Project Truth Account access `missing_test_link` gap for
  `src/integrations/google-drive/google-drive.auth.ts#exchangeGoogleDriveAuthorizationCode`.
- Scope: focused automated test for the Google Drive OAuth authorization-code
  exchange helper, scanner override proof link for the exact symbol row,
  architecture refresh/status evidence, and source-of-truth state updates.
- Implementation Plan:
  1. Confirm the issue targets a symbol-level missing-test-link row.
  2. Add the smallest no-network automated test that proves the helper posts
     the authorization code exchange request and normalizes the provider token
     response.
  3. Link the test to the exact `path#symbol` row in
     `docs/architecture/scanner-overrides.json`.
  4. Run focused validation and architecture readback.
  5. Record evidence and residual risk.
- Acceptance Criteria:
  - The exact helper has a current automated test/proof link.
  - The test covers token endpoint URL, POST method, form body, client id,
    client secret, authorization code, redirect URI, grant type, access token,
    refresh token, token type, scope, and expiry normalization.
  - No live Google provider call, credential value access, production mutation,
    deploy, push, restart, or protected smoke occurs.
  - Project Truth/app-completion generated indexes are refreshed or a precise
    refresh blocker/follow-up is recorded.
- Definition of Done:
  - Test command and result are recorded.
  - Scanner override links the test to the exact symbol row.
  - Source-of-truth state is updated.
  - Residual Project Truth/app-completion readback status is explicit.

## Diagnosis

The dispatched gap is a function-level proof-link gap, not a fresh runtime
defect. The Google Drive auth file row is already verified by the
[LUC-538](/LUC/issues/LUC-538) file-level proof packet, and
`buildGoogleDriveAuthorizationUrl` is already verified by the focused
[LUC-546](/LUC/issues/LUC-546) no-network test. The remaining first gap points
to the exact function row
`src/integrations/google-drive/google-drive.auth.ts#exchangeGoogleDriveAuthorizationCode`.

## Implementation

- Extended `src/tests/google-drive-auth.test.ts` with a no-network Node test
  for `exchangeGoogleDriveAuthorizationCode`.
- The test stubs `globalThis.fetch`, records the outgoing token exchange
  request, returns a synthetic Google OAuth token payload, and verifies the
  normalized OAuth secret returned by the helper.
- Updated `docs/architecture/scanner-overrides.json` with:
  - a verified entity override for
    `src/integrations/google-drive/google-drive.auth.ts#exchangeGoogleDriveAuthorizationCode`
  - a test relation from `src/tests/google-drive-auth.test.ts` to that function
    row.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Issue context | PASS | Heartbeat context confirmed [LUC-567](/LUC/issues/LUC-567) targets `Account access: exchangeGoogleDriveAuthorizationCode has app-completion risk missing_test_link`. |
| Override JSON parse | PASS | `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` |
| TypeScript server build | PASS | `npm run build:server` completed successfully. |
| Focused automated proof | PASS | `node --test dist/tests/google-drive-auth.test.js` passed `2/2` tests. |
| Repo architecture refresh | PASS | `npm run architecture:refresh` passed all gates; graph `454` nodes / `765` relations / `35` chains; evidence queue `0`; chain worklist `0`; all gates pass. |
| Paperclip architecture-awareness scanner | PASS | `node scripts/build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` generated `2026-07-12T00:31:53.311Z`, `2827` entities / `6716` relations / `16451` files; overrides `75/111` applied. |
| App-completion refresh | PASS | `node scripts/build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` generated `1243` items / `5` flows / `1158` missing test links / `25` missing doc links / `11` implemented-needs-proof / `0` blocked / `1194` known risk items. |
| Project Truth apply/readback | PASS | `node scripts/build-project-truth-indexes.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost --apply` generated `2026-07-12T00:32:00.083Z`; public probe `pass`; critical runtime findings `0`; incomplete event chains `0`; operational gate gaps `0`; first gap moved from `missing_test_link` to `missing_doc_link` for the same symbol. |
| Follow-up routing | PASS | [LUC-570](/LUC/issues/LUC-570) created for Documentation Steward to clear the remaining exact-symbol `missing_doc_link` readback. |

## Acceptance Criteria

- [x] The dispatched `exchangeGoogleDriveAuthorizationCode` missing-test-link
  row has direct automated proof.
- [x] The proof is no-network and does not require live Google credentials.
- [x] The exact symbol row is linked in scanner overrides.
- [x] Generated Project Truth/app-completion indexes are refreshed or a precise
  refresh limitation is recorded.
- [x] No production, provider, deploy, push, restart, or protected-smoke action
  occurred.

## Result Report

Status: `VERIFIED`.

The exact Account access `missing_test_link` for
`exchangeGoogleDriveAuthorizationCode` now has focused automated proof and an
explicit scanner override relation. No product repair, duplicate protected API
suite, browser proof, live Google provider call, credential read, deploy,
restart, push, or production mutation was needed.

Residual risk: generated Project Truth now reports the same symbol as
`missing_doc_link`, not `missing_test_link`. That is a Documentation Steward
lane, and follow-up [LUC-570](/LUC/issues/LUC-570) was created with the current
readback evidence.
