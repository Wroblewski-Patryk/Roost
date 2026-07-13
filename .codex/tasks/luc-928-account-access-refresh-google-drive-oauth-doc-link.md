# Task

## Header
- ID: LUC-928
- Title: Account access refreshGoogleDriveOAuth Missing-Doc-Link Proof
- Task Type: documentation/source-of-truth
- Current Stage: verification
- Status: DONE
- Owner: Documentation Steward
- Depends on: LUC-893
- Priority: P1
- Module Confidence Rows: Account access refreshGoogleDriveOAuth doc-link confidence
- Iteration: 2026-07-13 Project Truth doc-link lane
- Operation Mode: EXECUTE
- Mission ID: LUC-928-ACCOUNT-ACCESS-REFRESH-GOOGLE-DRIVE-OAUTH-DOC-LINK
- Mission Status: COMPLETE

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] The task aligns with Project Truth, app-completion, and Account access source-of-truth files.
- [x] `.agents/core/project-memory-index.md` and `.agents/state/module-confidence-ledger.md` were reviewed.
- [x] The task improves release confidence by clearing a concrete missing-doc-link row.

## Mission Block
- Mission objective: prove `src/integrations/google-drive/google-drive.auth.ts#refreshGoogleDriveOAuth` with the smallest supported documentation-link evidence and link that proof into Project Truth.
- Release objective advanced: Roost Project Truth / app-completion confidence for Account access.
- Included slices: exact documentation relation, accepted Google Drive V2 task contract readback, generated architecture/app-completion/Project Truth refresh, and state updates.
- Explicit exclusions: product code, test code, schema, migration, live Google provider call, protected smoke, deploy, push, restart, production mutation, credential value access, and secret disclosure.
- Checkpoint cadence: add the exact doc relation, refresh generated evidence, update state, then route the next non-doc gap.
- Stop conditions: protected action needed, architecture mismatch, or inability to clear the exact symbol locally without changing runtime behavior.
- Handoff expectation: close [LUC-928](/LUC/issues/LUC-928) when `missing_doc_link` clears; route any next non-doc follow-up to the proper owner from Project Truth.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, Paperclip wake payload | Task closure and source-of-truth updates | LUC-928 packet and issue disposition | Final issue update | COMPLETE |
| Documentation/Memory | Documentation Steward | Project Truth readback | `docs/architecture/relations/documentation-links.csv`, generated readbacks, source-of-truth state updates | Exact doc-link relation | Architecture/app-completion/Project Truth refresh | COMPLETE |

## Context
[LUC-928](/LUC/issues/LUC-928) was dispatched from Project Truth for:

`Account access: refreshGoogleDriveOAuth has app-completion risk missing_doc_link.`

The target helper already has focused no-network proof from [LUC-893](/LUC/issues/LUC-893), and the sibling Google Drive auth helper rows use the same documentation-link pattern. The missing piece is the exact generated function-path relation for the OAuth refresh helper that exchanges a refresh token, preserves workspace OAuth client credentials, and persists the refreshed secret.

## Goal
Clear the exact `refreshGoogleDriveOAuth` missing-doc-link row without changing runtime behavior.

## Scope
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-928-account-access-refresh-google-drive-oauth-doc-link.md`
- generated architecture/app-completion/Project Truth readback artifacts
- required source-of-truth state updates
- no runtime implementation changes

## Implementation Plan
1. Confirm the generated first gap is the exact `refreshGoogleDriveOAuth` `missing_doc_link` row.
2. Confirm the accepted Google Drive V2 task contract documents refresh-token exchange, persisted refreshed OAuth material, and workspace credential reuse closely enough to cover the helper.
3. Add one documentation-link relation from the exact generated function path to `docs/planning/google-drive-v2-task-contracts.md`.
4. Refresh architecture/app-completion/Project Truth evidence.
5. Update source-of-truth state with validation and the next gap.

## Acceptance Criteria
- [x] The exact generated function path is linked to a source-of-truth document.
- [x] Architecture refresh applies the new documentation relation.
- [x] App-completion readback no longer reports `refreshGoogleDriveOAuth` as `missing_doc_link`.
- [x] Project Truth first gap advances away from `refreshGoogleDriveOAuth` and is explained with exact evidence.
- [x] No runtime, provider, protected, deployment, credential, or secret behavior is changed.

## Definition Of Done
- [x] Local validation commands are recorded with pass/fail evidence.
- [x] Changed files are listed.
- [x] Residual risk and next owner/action are recorded.
- [x] Paperclip issue [LUC-928](/LUC/issues/LUC-928) receives a final disposition.

## Result Report
- Added `docs/architecture/relations/documentation-links.csv` row linking
  `src/integrations/google-drive/google-drive.auth.ts#refreshGoogleDriveOAuth`
  to `docs/planning/google-drive-v2-task-contracts.md`.
- Architecture-awareness refresh PASS generated `2026-07-13T16:04:02.061Z`
  with `2858` entities / `6899` relations / `16460` files and now includes
  the exact `document -> refreshGoogleDriveOAuth` relation from the curated
  documentation-links file.
- App-completion refresh PASS now reports `1243` items / `5` flows /
  `1148` missing test links / `25` missing doc links /
  `10` implemented-needs-proof / `0` blocked / `1183` known risk items.
- Project Truth apply PASS generated `2026-07-13T16:04:45.806Z` with public
  probe `pass`, runtime/event/ops gaps `0`, and first gap advanced to
  `src/integrations/integration-settings.service.ts#parseGoogleDriveOAuthSecret`
  `missing_doc_link`.
- Target readback PASS: the generated app-completion and Project Truth outputs
  no longer use `refreshGoogleDriveOAuth` as the first `missing_doc_link`.
- No product code, test code, live Google provider call, protected smoke,
  deploy, restart, push, production mutation, credential value access, or
  secret disclosure occurred.
