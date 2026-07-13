# Task

## Header
- ID: LUC-742
- Title: Account Access Stored Google Drive Secret Missing-Doc-Link Proof
- Task Type: documentation/source-of-truth
- Current Stage: verification
- Status: DONE
- Owner: Documentation Steward
- Priority: P1
- Module Confidence Rows: Account access stored Google Drive secret doc-link confidence
- Iteration: 2026-07-12 Project Truth doc-link lane
- Operation Mode: EXECUTE
- Mission ID: LUC-742-ACCOUNT-ACCESS-STORED-GOOGLE-DRIVE-SECRET-DOC-LINK
- Mission Status: COMPLETE

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] The task aligns with Project Truth, app-completion, and Account access source-of-truth files.
- [x] `.agents/core/project-memory-index.md` and `.agents/state/module-confidence-ledger.md` were reviewed.
- [x] The task improves release confidence by clearing a concrete missing-doc-link row.

## Mission Block
- Mission objective: prove `src/integrations/google-drive/google-drive.auth.ts#getStoredGoogleDriveSecret` with the smallest supported documentation-link evidence and link that proof into Project Truth.
- Release objective advanced: Roost Project Truth / app-completion confidence for Account access.
- Included slices: exact documentation relation, accepted Google Drive V2 task contract readback, generated architecture/app-completion/Project Truth refresh, and state updates.
- Explicit exclusions: product code, test code, schema, migration, live Google provider call, protected smoke, deploy, push, restart, production mutation, credential value access, and secret disclosure.
- Checkpoint cadence: add the exact doc relation, refresh generated evidence, update state, then route residual non-doc work.
- Stop conditions: protected action needed, architecture mismatch, or inability to clear the exact symbol locally without changing runtime behavior.
- Handoff expectation: close [LUC-742](/LUC/issues/LUC-742) when `missing_doc_link` clears; route any same-symbol non-doc follow-up to the proper owner from Project Truth.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, Paperclip wake payload | Task closure and source-of-truth updates | LUC-742 packet and issue disposition | Final issue update | COMPLETE |
| Documentation/Memory | Docs Memory Lead + Project Manager | Project Truth readback | `docs/architecture/relations/documentation-links.csv`, generated readbacks, source-of-truth state updates | Exact doc-link relation | `npm run architecture:refresh`, app-completion readback, Project Truth readback | COMPLETE |

## Context
[LUC-742](/LUC/issues/LUC-742) was dispatched from Project Truth for:

`Account access: getStoredGoogleDriveSecret has app-completion risk missing_doc_link.`

The target helper is already represented in the accepted Google Drive V2 task contract, and the sibling Google Drive auth helper rows have the same documentation-link pattern. The missing piece is the exact generated function-path relation for the stored-secret helper.

## Goal
Clear the exact `getStoredGoogleDriveSecret` missing-doc-link row without changing runtime behavior.

## Scope
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-742-account-access-stored-google-drive-secret-doc-link.md`
- generated architecture/app-completion/Project Truth readback artifacts
- required source-of-truth state updates
- no runtime implementation changes

## Implementation Plan
1. Confirm the generated first gap is the exact `getStoredGoogleDriveSecret` `missing_doc_link` row.
2. Confirm the accepted Google Drive V2 task contract documents the stored workspace OAuth secret lookup and fallback behavior.
3. Add one documentation-link relation from the exact generated function path to `docs/planning/google-drive-v2-task-contracts.md`.
4. Refresh architecture/app-completion/Project Truth evidence.
5. Update source-of-truth state with validation and residual next gap.

## Acceptance Criteria
- [x] The exact generated function path is linked to a source-of-truth document.
- [x] Architecture refresh applies the new documentation relation.
- [x] App-completion readback no longer reports `getStoredGoogleDriveSecret` as `missing_doc_link`.
- [x] Project Truth first gap advances away from `getStoredGoogleDriveSecret` and is explained with exact evidence.
- [x] No runtime, provider, protected, deployment, credential, or secret behavior is changed.

## Definition Of Done
- [x] Local validation commands are recorded with pass/fail evidence.
- [x] Changed files are listed.
- [x] Residual risk and next owner/action are recorded.
- [x] Paperclip issue [LUC-742](/LUC/issues/LUC-742) receives a final disposition.

## Result Report
- Added `docs/architecture/relations/documentation-links.csv` row linking
  `src/integrations/google-drive/google-drive.auth.ts#getStoredGoogleDriveSecret`
  to `docs/planning/google-drive-v2-task-contracts.md`.
- Closure packet repair confirmed the affected evidence surfaces remain
  inspectable in the workspace:
  `docs/architecture/scanner-overrides.json`, generated `docs/graphs/`,
  `docs/status/app-completion-index.md`, `docs/status/app-completion-index.json`,
  `docs/status/project-truth-index.md`, and
  `docs/status/project-truth-index.json`.
- Rebuilt the scanner export with
  `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost`.
- Rebuilt app-completion with
  `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost`.
- Current app-completion readback now reports `1243` items / `5` flows /
  `1150` missing test links / `27` missing doc links / `11`
  implemented-needs-proof / `0` blocked / `1188` risk items.
- Applied Project Truth with
  `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-project-truth-indexes.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost --apply`.
- Current Project Truth readback PASS: public probe pass, runtime findings `0`,
  app-completion gaps `1188`, indexed gaps `200`, and the target
  `getStoredGoogleDriveSecret` symbol is no longer listed as a
  `missing_doc_link` gap.
- The current first routed gap is
  `src/integrations/google-drive/google-drive.auth.ts#mergeGoogleDriveConfig`
  `missing_doc_link`, followed by `normalizeTokenResponse` and
  `postGoogleOAuthToken` for the remaining Account access doc-link debt.
- Residual doc-link debt remains elsewhere in Account access and User
  configuration; no runtime code, provider behavior, or secret material
  changed.
- Attempted to locate the external GitHub issue thread for a final close/comment update, but the available repository handles `Wroblewski-Patryk/Roost` and `Wroblewski-Patryk/LUC` both returned GitHub `404 Not Found` for issue `742`. No external issue mutation was possible from this workspace, so the local board/task packet remains the source of truth for completion.
- Final issue-state proof: `PATCH /api/issues/$PAPERCLIP_TASK_ID` with
  `status=done` returned `200`, and the latest issue readback reports
  `status: done` with `completedAt: 2026-07-12T15:42:04.447Z`.
