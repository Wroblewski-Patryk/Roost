# Task

## Header
- ID: LUC-895
- Title: Account access parseGoogleDriveOAuthSecret missing-test-link proof
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-894](/LUC/issues/LUC-894)
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Account access / auth-config
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: Account access app-completion missing-test-link drift
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-895
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the verification-focused iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: Prove `src/integrations/integration-settings.service.ts#parseGoogleDriveOAuthSecret` with focused no-network automated evidence and clear the current app-completion `missing_test_link` gap.
- Release objective advanced: Roost V1 Account access proof-link closure for Google Drive OAuth secret parsing.
- Included slices: focused source inspection, narrow test authoring, exact scanner relation curation, generated proof refresh, and source-of-truth updates.
- Explicit exclusions: runtime feature changes, docs doc-link curation, deploy/push, production/provider calls, unrelated Account access gaps.
- Checkpoint cadence: after test/scanner edit, after local validation, after generated proof refresh, and at issue closeout.
- Stop conditions: focused test or architecture refresh fails with a concrete blocker; generated indexes do not consume the new relation; another owner is required outside QA/Test scope.
- Handoff expectation: close the Paperclip issue as `done` with typed completion evidence after the generated readback confirms the original `missing_test_link` is cleared; route any residual same-symbol doc-link work to the PM/docs owner instead of reopening QA proof.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, `.agents/core/project-memory-index.md`, `.agents/core/mission-control.md`, wake payload | Issue framing, source-of-truth integration, final closeout | Task packet and final evidence | Parent validation gate | IN_PROGRESS |
| QA/Test | QA/Test | `docs/status/app-completion-index.json`, `src/integrations/integration-settings.service.ts`, `src/tests/google-drive-auth.test.ts` | Focused automated proof | Narrow test coverage for the target helper | `npm run build:server`; `node --test dist/tests/google-drive-auth.test.js` | IN_PROGRESS |
| Architecture | Coordinator | `docs/architecture/scanner-overrides.json`, generated graphs/status | Exact proof relation | Scanner override + refreshed generated evidence | Override JSON parse; architecture/app-completion/project-truth refresh | IN_PROGRESS |
| Documentation/Memory | Coordinator | `.codex/context/*`, `.agents/state/*`, `docs/planning/mvp-next-commits.md` | Durable repo truth updates for the proof lane | Updated current state and next-step records | Readback after refresh | PLANNED |

## Context
The current app-completion priority queue moved from [LUC-893](/LUC/issues/LUC-893) to `src/integrations/integration-settings.service.ts#parseGoogleDriveOAuthSecret` as the next Account access `missing_test_link` row. The service-level integration route family is already broadly proven by [LUC-894](/LUC/issues/LUC-894), but the exact helper still lacks a direct proof relation in the generated scanner output.

## Goal
Add exact automated evidence for `parseGoogleDriveOAuthSecret`, link it in the scanner overrides, refresh the generated proof artifacts, and either clear the current gap or surface the exact blocker.

## Scope
Allowed scope:
- `src/tests/google-drive-auth.test.ts`
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-895-account-access-parse-google-drive-oauth-secret-proof.md`
- generated `docs/graphs/*` and `docs/status/*` outputs required by the proof refresh
- relevant source-of-truth state files updated by the closeout

Out of scope:
- runtime logic changes in `src/integrations/integration-settings.service.ts`
- doc-link work for unrelated symbols
- deploy, push, protected smoke, or credential/provider actions

## Implementation Plan
1. Inspect the existing helper, current tests, and scanner proof relations for the exact missing-test-link row.
2. Add the smallest no-network automated proof that covers valid decrypt/parse behavior and fail-open or fail-closed error handling for invalid ciphertext.
3. Link that proof to the exact `path#symbol` in `docs/architecture/scanner-overrides.json`.
4. Run focused validation and refresh the generated architecture/app-completion/Project Truth outputs.
5. Update source-of-truth task/state records and close the issue with exact evidence or a named blocker.

## Acceptance Criteria
- [x] `src/tests/google-drive-auth.test.ts` proves valid and invalid ciphertext behavior for `parseGoogleDriveOAuthSecret` without network or provider access.
- [x] `docs/architecture/scanner-overrides.json` links the focused test artifact to `src/integrations/integration-settings.service.ts#parseGoogleDriveOAuthSecret`.
- [x] Focused validation and generated proof refresh clear the target `missing_test_link` row; the same helper now remains only as `missing_doc_link`.

## Deliverable For This Stage
A verified proof packet with focused test evidence, scanner linkage, refreshed generated outputs, and closeout-ready issue evidence for `parseGoogleDriveOAuthSecret`.

## Result Report
- Task summary: Added focused no-network proof for `parseGoogleDriveOAuthSecret`, linked the exact helper row in `docs/architecture/scanner-overrides.json`, refreshed the generated architecture/app-completion/Project Truth outputs, and confirmed the original `missing_test_link` gap is closed. The same helper now remains only as `missing_doc_link`, which is outside this QA proof scope.
- Files changed: `.codex/tasks/luc-895-account-access-parse-google-drive-oauth-secret-proof.md`, `src/tests/google-drive-auth.test.ts`, `docs/architecture/scanner-overrides.json`, generated `docs/graphs/*`, generated `docs/status/*`, `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, `.agents/state/active-mission.md`, `.agents/state/current-focus.md`, `.agents/state/next-steps.md`, `.agents/state/system-health.md`, `.agents/state/module-confidence-ledger.md`, `.agents/state/known-issues.md`, `docs/planning/mvp-next-commits.md`
- How tested: `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` PASS; `npm run build:server` PASS; `node --test dist/tests/google-drive-auth.test.js` PASS (`12/12`); `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS; `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS with `parseGoogleDriveOAuthSecret` read back `status=verified`, `hasTest=true`, `risk=missing_doc_link`; `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-project-truth-indexes.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost --apply` PASS with the same helper now reported as `missing_doc_link`.
- What is incomplete: same-symbol documentation-link curation, owned by Docs Memory Lead + Project Manager.
- Next steps: do not reopen QA proof work for this helper unless a fresh regression removes `hasTest=true`; the next owner should address the residual `missing_doc_link`.
- Decisions made: close the original missing-test-link issue as complete because the residual doc-link gap is a different owner/scope.

## Notes
Single-lane verification work. No subagent delegation is warranted because the change is bounded to focused test evidence and scanner linkage for one helper row.
