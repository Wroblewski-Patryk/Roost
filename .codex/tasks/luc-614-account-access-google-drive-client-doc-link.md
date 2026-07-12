# LUC-614 Account Access Google Drive Client Doc Link

- Task Type: Documentation / Project Truth curation
- Current Stage: verification
- Deliverable For This Stage: exact-symbol documentation-link readback for the Account access `missing_doc_link` gap.

## Goal

Prove and clear the Project Truth Account access `missing_doc_link` row for
`src/integrations/google-drive/google-drive.auth.ts#getGoogleDriveClientForWorkspace`
without changing runtime behavior or contacting Google.

## Scope

- `.codex/tasks/luc-614-account-access-google-drive-client-doc-link.md`
- `docs/architecture/relations/documentation-links.csv`
- Generated/readback status artifacts from architecture-awareness,
  app-completion, and Project Truth refreshes
- Supporting source-of-truth state updates

Out of scope: product code, test code, live Google provider calls, protected
smoke, deploy, restart, push, production mutation, credential value access, and
secret disclosure.

## Implementation Plan

1. Confirm the active Project Truth gap targets the exact
   `getGoogleDriveClientForWorkspace` generated function row.
2. Reuse the accepted Google Drive V2 task contract as the documentation source
   because it documents OAuth runtime hardening, access-token freshness before
   provider calls, workspace OAuth client credential behavior, and Google Drive
   provider client usage.
3. Add the exact function path to the curated documentation-link relation CSV.
4. Refresh architecture-awareness, app-completion, and Project Truth outputs.
5. Run local architecture status and diff hygiene checks and record the
   readback.

## Acceptance Criteria

- [x] The exact generated function path is linked to
  `docs/planning/google-drive-v2-task-contracts.md`.
- [x] Generated app-completion no longer lists
  `getGoogleDriveClientForWorkspace` as `missing_doc_link`.
- [x] Generated Project Truth no longer lists
  `getGoogleDriveClientForWorkspace` as the first Account access gap.
- [x] Validation evidence is recorded without product code or provider access.

## Definition Of Done

- [x] Documentation relation added through the existing curated relation path.
- [x] Project Truth/app-completion readback proves the dispatched row is gone.
- [x] Source-of-truth state records the evidence and residual next gap.
- [x] Issue can be marked `done`; no follow-up remains for this symbol's
  Documentation Steward lane.

## Result Report

- Added `docs/architecture/relations/documentation-links.csv` row linking
  `src/integrations/google-drive/google-drive.auth.ts#getGoogleDriveClientForWorkspace`
  to `docs/planning/google-drive-v2-task-contracts.md`.
- `npm run architecture:refresh` PASS; graph `454` nodes / `765` relations /
  `35` chains; evidence queue `0`; chain worklist `0`; all gates pass.
- Architecture-awareness refresh PASS generated `2026-07-12T03:23:48.974Z`
  with `2833` entities / `6752` relations / `16451` files and overrides
  `77/113`.
- App-completion refresh PASS generated `1243` items / `5` flows /
  `1156` missing test links / `24` missing doc links /
  `11` implemented-needs-proof / `0` blocked / `1191` known risk items.
- Project Truth apply PASS generated `2026-07-12T03:23:58.329Z` with public
  probe `pass`, critical runtime findings `0`, incomplete event chains `0`,
  operational gate gaps `0`, and total gaps `1191`.
- Target readback PASS: `docs/status/app-completion-index.json` and
  `docs/status/project-truth-index.json` no longer contain
  `src/integrations/google-drive/google-drive.auth.ts#getGoogleDriveClientForWorkspace`.
- New first gap:
  `src/integrations/google-drive/google-drive.auth.ts#getGoogleOAuthClient`
  `missing_test_link`, owned by Test Automation Engineer + QA Regression Lead.
- `npm run architecture:status` PASS (`GREEN`, graph `454/765/35`, evidence
  queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass).
- `git diff --check` PASS with LF-to-CRLF warnings only.
- No product code, test code, live Google provider call, protected smoke,
  deploy, restart, push, production mutation, credential value access, or
  secret disclosure occurred.

