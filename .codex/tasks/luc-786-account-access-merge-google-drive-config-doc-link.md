# Task

## Header
- ID: LUC-786
- Title: Account Access mergeGoogleDriveConfig Missing-Doc-Link Proof
- Task Type: documentation/source-of-truth
- Current Stage: verification
- Status: DONE
- Owner: Documentation Steward
- Priority: P1
- Module Confidence Rows: Account access mergeGoogleDriveConfig doc-link confidence
- Iteration: 2026-07-12 Project Truth doc-link lane
- Operation Mode: EXECUTE
- Mission ID: LUC-786-ACCOUNT-ACCESS-MERGE-GOOGLE-DRIVE-CONFIG-DOC-LINK
- Mission Status: COMPLETE

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] The task aligns with Project Truth, app-completion, and Account access source-of-truth files.
- [x] `.agents/core/project-memory-index.md` and `.agents/state/module-confidence-ledger.md` were reviewed.
- [x] The task improves release confidence by clearing a concrete missing-doc-link row.

## Mission Block
- Mission objective: prove `src/integrations/google-drive/google-drive.auth.ts#mergeGoogleDriveConfig` with the smallest supported documentation-link evidence and link that proof into Project Truth.
- Release objective advanced: Roost Project Truth / app-completion confidence for Account access.
- Included slices: exact documentation relation, accepted Google Drive V2 task contract readback, generated architecture/app-completion/Project Truth refresh, and state updates.
- Explicit exclusions: product code, test code, schema, migration, live Google provider call, protected smoke, deploy, push, restart, production mutation, credential value access, and secret disclosure.
- Checkpoint cadence: add the exact doc relation, refresh generated evidence, update state, then route residual non-doc work.
- Stop conditions: protected action needed, architecture mismatch, or inability to clear the exact symbol locally without changing runtime behavior.
- Handoff expectation: close [LUC-786](/LUC/issues/LUC-786) when `missing_doc_link` clears; route any same-symbol non-doc follow-up to the proper owner from Project Truth.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, Paperclip wake payload | Task closure and source-of-truth updates | LUC-786 packet and issue disposition | Final issue update | COMPLETE |
| Documentation/Memory | Documentation Steward | Project Truth readback | `docs/architecture/relations/documentation-links.csv`, generated readbacks, source-of-truth state updates | Exact doc-link relation | `npm run architecture:refresh`, app-completion readback, Project Truth readback | COMPLETE |

## Context
[LUC-786](/LUC/issues/LUC-786) was dispatched from Project Truth for:

`Account access: mergeGoogleDriveConfig has app-completion risk missing_doc_link.`

The target helper is already represented in the accepted Google Drive V2 task contract, and the sibling Google Drive auth helper rows use the same documentation-link pattern. The missing piece is the exact generated function-path relation for the configuration merge helper.

## Goal
Clear the exact `mergeGoogleDriveConfig` missing-doc-link row without changing runtime behavior.

## Scope
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-786-account-access-merge-google-drive-config-doc-link.md`
- generated architecture/app-completion/Project Truth readback artifacts
- required source-of-truth state updates
- no runtime implementation changes

## Implementation Plan
1. Confirm the generated first gap is the exact `mergeGoogleDriveConfig` `missing_doc_link` row.
2. Confirm the accepted Google Drive V2 task contract documents the workspace Google Drive configuration merge behavior.
3. Add one documentation-link relation from the exact generated function path to `docs/planning/google-drive-v2-task-contracts.md`.
4. Refresh architecture/app-completion/Project Truth evidence.
5. Update source-of-truth state with validation and residual next gap.

## Acceptance Criteria
- [x] The exact generated function path is linked to a source-of-truth document.
- [x] Architecture refresh applies the new documentation relation.
- [x] App-completion readback no longer reports `mergeGoogleDriveConfig` as `missing_doc_link`.
- [x] Project Truth first gap advances away from `mergeGoogleDriveConfig` and is explained with exact evidence.
- [x] No runtime, provider, protected, deployment, credential, or secret behavior is changed.

## Definition Of Done
- [x] Local validation commands are recorded with pass/fail evidence.
- [x] Changed files are listed.
- [x] Residual risk and next owner/action are recorded.
- [x] Paperclip issue [LUC-786](/LUC/issues/LUC-786) receives a final disposition.

## Result Report
- Added `docs/architecture/relations/documentation-links.csv` row linking
  `src/integrations/google-drive/google-drive.auth.ts#mergeGoogleDriveConfig`
  to `docs/planning/google-drive-v2-task-contracts.md`.
- `npm run architecture:refresh` PASS; graph `454` nodes / `765` relations /
  `35` chains; evidence queue `0`; chain worklist `0`; all gates pass.
- Architecture-awareness refresh PASS generated `2026-07-12T17:41:34.026Z`
  with `2848` entities / `6828` relations / `16460` files and overrides
  `83/120`.
- App-completion refresh PASS generated `1243` items / `5` flows /
  `1150` missing test links / `26` missing doc links /
  `11` implemented-needs-proof / `0` blocked / `1187` known risk items.
- Project Truth apply PASS generated `2026-07-12T17:42:41.463Z` with public
  probe `pass`, critical runtime findings `0`, incomplete event chains `0`,
  operational gate gaps `0`, and total gaps `1187`.
- Target readback PASS: `docs/status/app-completion-index.json` no longer
  lists `mergeGoogleDriveConfig` in priority review; Project Truth first gap
  advanced away from `mergeGoogleDriveConfig`.
- New first gap:
  `src/integrations/google-drive/google-drive.auth.ts#normalizeTokenResponse`
  `missing_doc_link`, owned by Docs Memory Lead + Project Manager.
- No product code, test code, live Google provider call, protected smoke,
  deploy, restart, push, production mutation, credential value access, or
  secret disclosure occurred.
- Paperclip issue final-state proof: `PATCH /api/issues/$PAPERCLIP_TASK_ID`
  with `status=done` returned `200`, and the latest issue readback reports
  `status: done` with `completedAt: 2026-07-12T17:43:38.535Z`.
