# LUC-576 Account Access Google Drive Fresh OAuth Proof

Date: 2026-07-12
Issue: [LUC-576](/LUC/issues/LUC-576)
Task Type: fix
Current Stage: verification
Status: VERIFIED
Owner: QA/Test
Priority: P1
Mission ID: LUC-576-ACCOUNT-ACCESS-GOOGLE-DRIVE-FRESH-OAUTH-PROOF
Mission Status: VERIFIED

## Task Contract

- Goal: prove the Project Truth Account access `missing_test_link` gap for
  `src/integrations/google-drive/google-drive.auth.ts#getFreshGoogleDriveOAuthForWorkspace`.
- Scope: focused automated proof for the Google Drive OAuth freshness and
  refresh helper, exact symbol scanner override relation, architecture
  refresh/status evidence, and source-of-truth state updates.
- Implementation Plan:
  1. Confirm the issue targets the exact symbol-level missing-test-link row.
  2. Add the smallest no-network automated test that proves the helper returns
     fresh OAuth state when still valid and refreshes/persists it when stale.
  3. Link the test to the exact `path#symbol` row in
     `docs/architecture/scanner-overrides.json`.
  4. Run focused validation and architecture readback.
  5. Record evidence and residual risk.
- Acceptance Criteria:
  - The exact helper has a current automated test/proof link.
  - The test covers the fresh-token path and the refresh/update path without a
    live Google provider call.
  - No production mutation, deploy, push, restart, protected smoke, or secret
    value disclosure occurs.
  - Project Truth/app-completion readback is refreshed or a precise refresh
    blocker/follow-up is recorded.
- Definition of Done:
  - Test command and result are recorded.
  - Scanner override links the test to the exact symbol row.
  - Source-of-truth state is updated.
  - Residual Project Truth/app-completion readback status is explicit.

## Diagnosis

The dispatched gap is a function-level proof-link gap, not a fresh runtime
defect. The helper file row is already verified, and the current first gap
points to the exact function row
`src/integrations/google-drive/google-drive.auth.ts#getFreshGoogleDriveOAuthForWorkspace`.

## Mission Block

- Mission objective: add the smallest no-network automated proof for
  `getFreshGoogleDriveOAuthForWorkspace`.
- Release objective advanced: close the current Account access missing-test
  evidence gap without introducing live-provider or protected-runtime work.
- Included slices: unit proof, scanner override, architecture refresh, task
  board/state updates.
- Explicit exclusions: live Google call, DB migration, protected smoke,
  deploy, push, restart, production mutation, credential-value read, and
  unrelated auth surfaces.
- Checkpoint cadence: implement the focused test, validate locally, refresh
  architecture evidence, then update state files.
- Stop conditions: if the helper cannot be proven with a small in-process
  test, record the exact blocker and do not widen scope.
- Handoff expectation: next agent should see either verified proof or a
  precise blocker with the next smallest proof target.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | AGENTS, active mission, task board | Integration, task closure, source-of-truth updates | Mission packet, lane brief, final acceptance | Parent validation gate | IN_PROGRESS |
| Product/Requirements | Coordinator | `docs/status/project-truth-index.md`, `docs/status/app-completion-index.md` | Gap selection and acceptance criteria | Narrow proof target | Gap readback matches exact symbol | IN_PROGRESS |
| Architecture | Coordinator | `docs/architecture/scanner-overrides.json`, `docs/graphs/architecture-awareness.csv` | Exact symbol override relation | Verified proof relation | Architecture refresh/readback | IN_PROGRESS |
| Implementation | QA/Test | `src/tests/google-drive-auth.test.ts` | Focused unit proof | New/updated automated test | `node --test dist/tests/google-drive-auth.test.js` | IN_PROGRESS |
| Documentation/Memory | Coordinator | `.agents/state/*`, `.codex/context/*`, `docs/status/*`, `docs/architecture/*` | State and index updates | Durable proof record | Fresh readback and diff hygiene | IN_PROGRESS |

## Process Self-Audit

- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from
      repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or
      marked not applicable.
- [x] The task or mission improves release confidence, not only local code
      appearance.

## Context

The current Project Truth first gap is the exact
`getFreshGoogleDriveOAuthForWorkspace` row. The existing Google Drive auth test
file already covers the URL and token-exchange helpers, so the smallest safe
slice is to add focused proof for the freshness/refresh helper and then link
that proof back to the symbol row.

## Goal

Prove the current Account access `missing_test_link` gap for
`getFreshGoogleDriveOAuthForWorkspace` with the smallest viable no-network
automated test.

## Scope

Exact allowed surfaces:

- `src/tests/google-drive-auth.test.ts`
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-576-account-access-google-drive-fresh-oauth-proof.md`
- `.agents/state/active-mission.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `docs/status/*` and `docs/graphs/*` only if regenerated by the approved
  architecture/status tooling

## Implementation Plan

1. Inspect the existing Google Drive auth helpers and test style.
2. Add a focused no-network unit test for the freshness path and the refresh
   path of `getFreshGoogleDriveOAuthForWorkspace`.
3. Add the exact scanner override relation to the function row.
4. Run the narrow validation commands and the architecture refresh/readback.
5. Update durable state files with the proof and residual gap.

## Acceptance Criteria

- [x] `getFreshGoogleDriveOAuthForWorkspace` has a direct automated
      test/proof link.
- [x] The test covers fresh-token return behavior and stale-token refresh /
      persistence behavior without live Google access.
- [x] `docs/architecture/scanner-overrides.json` links the proof to the exact
      symbol row.
- [x] Architecture and status readback are refreshed or the exact blocker is
      recorded.
- [x] No protected smoke, deploy, push, restart, or production mutation
      occurs.

## Definition of Done

- [ ] Code builds without errors.
- [ ] Feature works manually through the real UI, API, CLI, or operator path.
- [ ] No mock, placeholder, fake, or temporary data/path remains.
- [ ] Full data flow works across all relevant layers.
- [ ] Backend and UI/client error handling exists where applicable.
- [ ] No existing functionality is broken.
- [ ] Feature works after restart, reload, or navigation refresh where
      applicable.
- [ ] Changes are documented in the relevant source of truth.
- [ ] Behavior is reproducible from the evidence recorded below.
- [ ] Success signal, reliability, security, and rollback evidence are
      recorded when applicable.
- [ ] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence

- Tests: `npm run build:server`; `node --test dist/tests/google-drive-auth.test.js`
- Manual checks: not applicable
- Screenshots/logs: architecture/app-completion/Project Truth generator output captured in this task report
- High-risk checks: architecture refresh and public readback apply passed; no deploy or protected smoke ran
- Coverage ledger updated: not applicable
- Coverage rows closed or changed: not applicable
- Module confidence ledger updated: yes
- Module confidence rows closed or changed: Account access Google Drive freshness and refresh proof
- Requirements matrix updated: no
- Requirement rows closed or changed: not applicable
- Quality scenarios updated: no
- Quality scenario rows closed or changed: not applicable
- Risk register updated: no
- Risk rows closed or changed: not applicable
- Reality status: verified

## Integration Evidence

- `INTEGRATION_CHECKLIST.md` reviewed: no
- Real API/service path used: no
- Endpoint and client contract match: yes
- DB schema and migrations verified: yes
- Loading state verified: no
- Error state verified: no
- Refresh/restart behavior verified: no
- Regression check performed: pending

## Result Report

- Task summary: completed the no-network proof for
  `getFreshGoogleDriveOAuthForWorkspace`, linked it in scanner overrides, and
  refreshed the durable architecture/app-completion/Project Truth readbacks.
- Files changed: `src/tests/google-drive-auth.test.ts`,
  `docs/architecture/scanner-overrides.json`,
  `.codex/tasks/luc-576-account-access-google-drive-fresh-oauth-proof.md`,
  `.agents/state/active-mission.md`, `.agents/state/module-confidence-ledger.md`,
  `.agents/state/next-steps.md`, `.codex/context/TASK_BOARD.md`,
  `.codex/context/PROJECT_STATE.md`, `docs/graphs/architecture-awareness.*`,
  `docs/graphs/architecture-proof-register.csv`, `docs/status/app-completion-index.*`,
  `docs/status/project-truth-index.*`, and related generated status exports.
- How tested: `npm run build:server`; `node --test dist/tests/google-drive-auth.test.js`;
  `npm run architecture:refresh`; `node C:\\Personal\\Projekty\\Aplikacje\\Paperclip_Softwarehouse\\scripts\\build-architecture-awareness-index.mjs --project Roost --root C:\\Personal\\Projekty\\Aplikacje\\Roost`; `node C:\\Personal\\Projekty\\Aplikacje\\Paperclip_Softwarehouse\\scripts\\build-app-completion-index.mjs --project Roost --root C:\\Personal\\Projekty\\Aplikacje\\Roost`; `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:\\Personal\\Projekty\\Aplikacje\\Paperclip_Softwarehouse\\scripts\\build-project-truth-indexes.mjs --project Roost --root C:\\Personal\\Projekty\\Aplikacje\\Roost --apply`.
- What is incomplete: the next Project Truth gap is now
  `src/integrations/google-drive/google-drive.auth.ts#getFreshGoogleDriveOAuthForWorkspace`
  `missing_doc_link`, owned by Docs Memory Lead + Project Manager.
- Next steps: route the remaining exact-symbol doc-link curation to the docs
  lane if it is selected; no further 09 TAE action remains for this issue.
- Decisions made: fresh-token and refresh-path unit proof selected as the
  smallest safe slice for the first gap; the same helper remained the proof
  target even after the generated first gap advanced to doc-link debt.
