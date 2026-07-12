# LUC-620 Account Access Google OAuth Client Doc Link

- Task Type: documentation/source-of-truth
- Current Stage: verification
- Deliverable For This Stage: exact documentation-link relation and generated
  readback for the `getGoogleOAuthClient` Project Truth `missing_doc_link` row.
- Operation Mode: Execute
- Mission ID: LUC-620-GOOGLE-OAUTH-CLIENT-DOC-LINK
- Module Confidence Rows: Account access / Google Drive OAuth client resolver
  documentation evidence.

## Goal

Clear the Account access Project Truth doc-link gap for
`src/integrations/google-drive/google-drive.auth.ts#getGoogleOAuthClient`
without changing runtime behavior.

## Scope

- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-620-account-access-google-oauth-client-doc-link.md`
- generated architecture/app-completion/Project Truth readback artifacts
- required source-of-truth state updates

## Out Of Scope

- Product code, test code, schema, migration, provider calls, browser proof,
  protected smoke, deploy, push, restart, production mutation, credential value
  access, or secret disclosure.

## Implementation Plan

1. Confirm the generated first gap is the exact `getGoogleOAuthClient`
   `missing_doc_link` row.
2. Confirm the accepted Google Drive V2 task contract documents workspace OAuth
   client credential storage and fallback behavior.
3. Add one documentation-link relation from the exact generated function path to
   `docs/planning/google-drive-v2-task-contracts.md`.
4. Refresh architecture/app-completion/Project Truth evidence.
5. Update source-of-truth state with validation and residual next gap.

## Acceptance Criteria

- [x] The exact generated function path is linked to a source-of-truth
  document.
- [x] Architecture refresh applies the new documentation relation.
- [x] App-completion readback no longer reports `getGoogleOAuthClient` as
  `missing_doc_link`.
- [x] Project Truth first gap advances away from `getGoogleOAuthClient`.
- [x] No runtime, provider, protected, deployment, credential, or secret
  behavior is changed.

## Definition Of Done

- [x] Local validation commands are recorded with pass/fail evidence.
- [x] Changed files are listed.
- [x] Residual risk and next owner/action are recorded.
- [x] Paperclip issue [LUC-620](/LUC/issues/LUC-620) receives a final
  disposition.

## Result Report

- Added `docs/architecture/relations/documentation-links.csv` row linking
  `src/integrations/google-drive/google-drive.auth.ts#getGoogleOAuthClient`
  to `docs/planning/google-drive-v2-task-contracts.md`.
- `npm run architecture:refresh` PASS; graph `454` nodes / `765` relations /
  `35` chains; evidence queue `0`; chain worklist `0`; all gates pass.
- Architecture-awareness refresh PASS generated `2026-07-12T03:57:25.133Z`
  with `2836` entities / `6761` relations / `16451` files and overrides
  `78/114`.
- App-completion refresh PASS generated `1243` items / `5` flows /
  `1155` missing test links / `24` missing doc links /
  `11` implemented-needs-proof / `0` blocked / `1190` known risk items.
- Project Truth apply PASS generated `2026-07-12T03:57:51.354Z` with public
  probe `pass`, critical runtime findings `0`, incomplete event chains `0`,
  operational gate gaps `0`, and total gaps `1190`.
- Target readback PASS: `docs/status/app-completion-index.json` no longer
  lists `getGoogleOAuthClient` in priority review; Project Truth first gap
  advanced away from `getGoogleOAuthClient`.
- New first gap:
  `src/integrations/google-drive/google-drive.auth.ts#getStoredGoogleDriveSecret`
  `missing_test_link`, owned by Test Automation Engineer + QA Regression Lead.
- No product code, test code, live Google provider call, protected smoke,
  deploy, restart, push, production mutation, credential value access, or
  secret disclosure occurred.
