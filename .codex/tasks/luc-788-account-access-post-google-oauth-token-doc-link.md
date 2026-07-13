# Task

## Header
- ID: LUC-788
- Title: Account Access postGoogleOAuthToken Missing-Doc-Link Proof
- Task Type: documentation/source-of-truth
- Current Stage: verification
- Status: DONE
- Owner: Documentation Steward
- Priority: P1
- Module Confidence Rows: Account access postGoogleOAuthToken doc-link confidence
- Iteration: 2026-07-12 Project Truth doc-link lane
- Operation Mode: EXECUTE
- Mission ID: LUC-788-ACCOUNT-ACCESS-POST-GOOGLE-OAUTH-TOKEN-DOC-LINK
- Mission Status: COMPLETE

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] The task aligns with Project Truth, app-completion, and Account access source-of-truth files.
- [x] `.agents/core/project-memory-index.md` and `.agents/state/module-confidence-ledger.md` were reviewed.
- [x] The task improves release confidence by clearing a concrete missing-doc-link row.

## Mission Block
- Mission objective: prove `src/integrations/google-drive/google-drive.auth.ts#postGoogleOAuthToken` with the smallest supported documentation-link evidence and link that proof into Project Truth.
- Release objective advanced: Roost Project Truth / app-completion confidence for Account access.
- Included slices: exact documentation relation, accepted Google Drive V2 task contract readback, generated architecture/app-completion/Project Truth refresh, and state updates.
- Explicit exclusions: product code, test code, schema, migration, live Google provider call, protected smoke, deploy, push, restart, production mutation, credential value access, and secret disclosure.
- Checkpoint cadence: add the exact doc relation, refresh generated evidence, update state, then route residual non-doc work.
- Stop conditions: protected action needed, architecture mismatch, or inability to clear the exact symbol locally without changing runtime behavior.
- Handoff expectation: close [LUC-788](/LUC/issues/LUC-788) when `missing_doc_link` clears; route any same-symbol non-doc follow-up to the proper owner from Project Truth.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, Paperclip wake payload | Task closure and source-of-truth updates | LUC-788 packet and issue disposition | Final issue update | COMPLETE |
| Documentation/Memory | Documentation Steward | Project Truth readback | `docs/architecture/relations/documentation-links.csv`, generated readbacks, source-of-truth state updates | Exact doc-link relation | `npm run architecture:refresh`, app-completion readback, Project Truth readback | COMPLETE |

## Context
[LUC-788](/LUC/issues/LUC-788) was dispatched from Project Truth for:

`Account access: postGoogleOAuthToken has app-completion risk missing_doc_link.`

The target helper already has focused no-network proof from [LUC-778](/LUC/issues/LUC-778), and the sibling Google Drive auth helper rows use the same documentation-link pattern. The missing piece is the exact generated function-path relation for the OAuth token POST helper that sends client credentials, posts the token request, and maps rejected responses to fail-closed integration errors.

## Goal
Clear the exact `postGoogleOAuthToken` missing-doc-link row without changing runtime behavior.

## Scope
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-788-account-access-post-google-oauth-token-doc-link.md`
- generated architecture/app-completion/Project Truth readback artifacts
- required source-of-truth state updates
- no runtime implementation changes

## Implementation Plan
1. Confirm the generated first gap is the exact `postGoogleOAuthToken` `missing_doc_link` row.
2. Confirm the accepted Google Drive V2 task contract documents token exchange behavior closely enough to cover token POST request behavior, credential usage, and invalid-token mapping.
3. Add one documentation-link relation from the exact generated function path to `docs/planning/google-drive-v2-task-contracts.md`.
4. Refresh architecture/app-completion/Project Truth evidence.
5. Update source-of-truth state with validation and residual next gap.

## Acceptance Criteria
- [x] The exact generated function path is linked to a source-of-truth document.
- [x] Architecture refresh applies the new documentation relation.
- [x] App-completion readback no longer reports `postGoogleOAuthToken` as `missing_doc_link`.
- [x] Project Truth first gap advances away from `postGoogleOAuthToken` and is explained with exact evidence.
- [x] No runtime, provider, protected, deployment, credential, or secret behavior is changed.

## Definition Of Done
- [x] Local validation commands are recorded with pass/fail evidence.
- [x] Changed files are listed.
- [x] Residual risk and next owner/action are recorded.
- [x] Paperclip issue [LUC-788](/LUC/issues/LUC-788) receives a final disposition.

## Result Report
- Added `docs/architecture/relations/documentation-links.csv` row linking
  `src/integrations/google-drive/google-drive.auth.ts#postGoogleOAuthToken`
  to `docs/planning/google-drive-v2-task-contracts.md`.
- `npm run architecture:refresh` PASS; graph `454` nodes / `765` relations /
  `35` chains; evidence queue `0`; chain worklist `0`; all gates pass.
- Architecture-awareness refresh PASS generated `2026-07-12T17:52:17.179Z`
  with `2850` entities / `6838` relations / `16460` files and overrides
  `83/120`.
- App-completion refresh PASS generated `1243` items / `5` flows /
  `1150` missing test links / `24` missing doc links /
  `11` implemented-needs-proof / `0` blocked / `1185` known risk items.
- Project Truth apply PASS generated `2026-07-12T17:52:31.095Z` with public
  probe `pass`, critical runtime findings `0`, incomplete event chains `0`,
  operational gate gaps `0`, and total gaps `1185`.
- Target readback PASS: `docs/status/app-completion-index.json` no longer
  lists `postGoogleOAuthToken` in priority review, and Project Truth first
  gap advanced away from `postGoogleOAuthToken`.
- New first gap:
  `src/integrations/google-drive/google-drive.auth.ts#refreshGoogleDriveOAuth`
  `missing_test_link`, owned by Test Automation Engineer + QA Regression Lead.
- Final issue-state proof: `PATCH /api/issues/$PAPERCLIP_TASK_ID` with
  `status=done` returned `200`, and the latest issue readback reports
  `status: done` with `completedAt: 2026-07-12T17:54:07.738Z`.
- No product code, test code, live Google provider call, protected smoke,
  deploy, restart, push, production mutation, credential value access, or
  secret disclosure occurred.
