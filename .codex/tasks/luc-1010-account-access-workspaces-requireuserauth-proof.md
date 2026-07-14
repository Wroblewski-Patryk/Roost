# Task

## Header
- ID: LUC-1010
- Title: Prove Account access missing-test-link for `src/modules/workspaces/workspaces.routes.ts#requireUserAuth`
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on:
- Priority: P1
- Coverage Ledger Rows: Account access `src/modules/workspaces/workspaces.routes.ts#requireUserAuth` `missing_test_link`
- Module Confidence Rows: Account access workspace route user-auth proof
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: Account access proof-link drift for workspace user-auth guard
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-1010-account-access-workspaces-requireuserauth-proof
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
- Mission objective: clear the dispatched Account access `missing_test_link` gap for `src/modules/workspaces/workspaces.routes.ts#requireUserAuth`.
- Release objective advanced: reduce workspace account-access proof debt without changing runtime behavior.
- Included slices: focused workspace API auth assertions, exact scanner override linkage, generated truth refresh, and source-of-truth updates.
- Explicit exclusions: no runtime workspace route logic changes beyond proof, no deploy/push, no protected smoke, no credential or production mutation.
- Checkpoint cadence: inspect -> prove -> refresh -> document.
- Stop conditions: focused proof fails, generated truth keeps the same first gap, or the existing workspace auth architecture contradicts the current evidence model.
- Handoff expectation: if the gap clears, route the next Project Truth gap to the next owner rather than expanding QA scope.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, `.agents/core/project-memory-index.md`, `.codex/context/*` | Task packet, truth updates, final closeout | Integrated verification packet | Parent validation gate | COMPLETED |
| QA/Test | QA/Test | `docs/status/app-completion-index.*`, `src/modules/workspaces/workspaces.routes.ts`, `src/tests/api.test.ts` | Focused automated proof for `requireUserAuth` | Explicit owner-allowed and API-key-denied workspace route evidence | Local API proof | COMPLETED |
| Architecture | Coordinator | `docs/architecture/scanner-overrides.json`, generated graphs/status | Exact proof relation for the function row | Verified override + refreshed generated evidence | Override JSON parse; architecture/app-completion/project-truth refresh | COMPLETED |
| Documentation/Memory | Coordinator | `.agents/state/*`, `.codex/context/*`, `docs/planning/mvp-next-commits.md` | Durable current-truth updates | Evidence-backed closure and next owner | Generated truth readback | COMPLETED |

## Context
After [LUC-1007](/LUC/issues/LUC-1007), the first Project Truth gap moved to `src/modules/workspaces/workspaces.routes.ts#requireUserAuth` as `missing_test_link`. Existing API integration coverage already exercised owner workspace list/create/select behavior and API-key denial for workspace listing and selection, but the exact function row still lacked a direct proof packet and scanner linkage.

## Goal
Add the smallest explicit automated proof for `requireUserAuth`, link it to the exact generated function row, refresh generated truth, and confirm the original `missing_test_link` is cleared.

## Scope
- `src/modules/workspaces/workspaces.routes.ts`
- `src/tests/api.test.ts`
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-1010-account-access-workspaces-requireuserauth-proof.md`
- generated `docs/graphs/*` and `docs/status/*` outputs required by the proof refresh
- relevant source-of-truth state files updated by closeout

Out of scope:
- runtime logic changes outside focused proof hardening
- doc-link curation
- deploy/push, protected smoke, or production credential use

## Implementation Plan
1. Inspect the current `requireUserAuth` helper, existing workspace API tests, and generated proof state for the first gap.
2. Confirm owner-authenticated workspace list/create/select behavior remains covered by the existing API proof.
3. Add an explicit service-key denial assertion for workspace creation so the helper is proven across list, create, and select routes.
4. Link `src/tests/api.test.ts` and this task packet to `src/modules/workspaces/workspaces.routes.ts#requireUserAuth` in scanner overrides.
5. Run focused verification and refresh architecture/app-completion/Project Truth outputs.
6. Update source-of-truth files with closure evidence and the next owner/action.

## Acceptance Criteria
- [x] `src/tests/api.test.ts` proves bearer-owner workspace list/create/select behavior remains healthy.
- [x] `src/tests/api.test.ts` explicitly proves API keys are denied for workspace list, create, and select routes.
- [x] `docs/architecture/scanner-overrides.json` links the proof to `src/modules/workspaces/workspaces.routes.ts#requireUserAuth`.
- [x] Refreshed generated truth no longer reports `src/modules/workspaces/workspaces.routes.ts#requireUserAuth` as `missing_test_link`.

## Deliverable For This Stage
A verified local proof packet that closes the dispatched `requireUserAuth` `missing_test_link` gap and updates generated truth plus project memory.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real API/operator path affected by the task.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests: `npm run test:api:local` PASS; `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` PASS; `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS; `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS; `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-project-truth-indexes.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost --apply` PASS; `npm run architecture:status` PASS.
- Manual checks: reviewed the existing workspace route proof slice in `src/tests/api.test.ts` and confirmed it now covers owner workspace list/create/select plus API-key denial for list/create/select on the real compiled API path.
- Screenshots/logs: not applicable
- High-risk checks: not applicable
- Coverage ledger updated: not applicable
- Module confidence ledger updated: yes
- Requirements matrix updated: not applicable
- Quality scenarios updated: not applicable
- Risk register updated: not applicable
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: yes
- Loading state verified: not applicable
- Error state verified: yes; API keys now explicitly return `403 forbidden` on workspace list/create/select.
- Refresh/restart behavior verified: yes; compiled app/server rebuilt, migrations applied, seed loaded, and the full local API suite passed on a fresh disposable database.
- Regression check performed: yes; `npm run test:api:local` reran the full compiled local API proof suite and passed `8/8`.

## Result Report
- Task summary: Completed focused proof-link closure for `src/modules/workspaces/workspaces.routes.ts#requireUserAuth` by extending the existing API proof with explicit API-key create denial, linking the proof packet to the exact function row, and refreshing generated truth until the target moved from `missing_test_link` to the next docs-owned `missing_doc_link`.
- Files changed:
  - `src/tests/api.test.ts`
  - `docs/architecture/scanner-overrides.json`
  - `.codex/tasks/luc-1010-account-access-workspaces-requireuserauth-proof.md`
- How tested:
  - `npm run test:api:local` PASS, including build, migrate, seed, and `node --test dist/tests/api.test.js` PASS (`8/8`) on a disposable local PostgreSQL container.
  - `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` PASS.
  - Architecture-awareness refresh PASS generated `2026-07-14T01:06:38.415Z` with `2896` entities / `7130` relations / `16476` files.
  - App-completion refresh PASS generated `1254` items / `5` flows / `1131` missing test links / `29` missing doc links / `8` implemented-needs-proof / `0` blocked / `1168` risk items.
  - Project Truth apply PASS generated `2026-07-14T01:06:48.833Z` with public probe `pass`, runtime findings `0`, incomplete event chains `0`, operational gate gaps `0`, and first gap advanced to `src/modules/workspaces/workspaces.routes.ts#requireUserAuth` `missing_doc_link`.
  - `npm run architecture:status` PASS (`GREEN`, `454/765/35`, evidence queue `0`, chain worklist `0`).
- What is incomplete: no remaining `missing_test_link` work remains for `src/modules/workspaces/workspaces.routes.ts#requireUserAuth`; the residual same-symbol `missing_doc_link` now belongs to Docs Memory Lead + Project Manager.
- Next steps:
  1. Route the residual `missing_doc_link` on `src/modules/workspaces/workspaces.routes.ts#requireUserAuth` to Docs Memory Lead + Project Manager.
  2. Keep QA scope closed for this symbol unless a future generated regression removes the linked test evidence.
- Decisions made:
  - Reused the existing workspace proof surface instead of creating a duplicate standalone test harness.
  - Added the smallest explicit API-key denial assertion needed to prove `requireUserAuth` across list, create, and select routes on the compiled API path.
