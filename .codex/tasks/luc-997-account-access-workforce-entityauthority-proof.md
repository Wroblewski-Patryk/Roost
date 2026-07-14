# Task

## Header
- ID: LUC-997
- Title: Prove Account access missing-test-link for `src/modules/workforce/workforce.service.ts#entityAuthority`
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-990](/LUC/issues/LUC-990)
- Priority: P1
- Coverage Ledger Rows: Account access `src/modules/workforce/workforce.service.ts#entityAuthority` `missing_test_link`
- Module Confidence Rows: Account access workforce entityAuthority proof
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: Account access proof-link drift for workforce authority readback
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-997-account-access-workforce-entityauthority-proof
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
- Mission objective: clear the dispatched Account access `missing_test_link` gap for `src/modules/workforce/workforce.service.ts#entityAuthority`.
- Release objective advanced: reduce workforce account-access proof debt without changing runtime behavior.
- Included slices: focused workforce API assertions, exact scanner override linkage, generated truth refresh, and source-of-truth updates.
- Explicit exclusions: no workforce service logic changes, no route schema changes, no deploy/push, no protected smoke, no credential or production mutation.
- Checkpoint cadence: inspect -> prove -> refresh -> document.
- Stop conditions: focused proof fails, generated truth keeps the same first gap, or route capability/auth architecture contradicts the current evidence model.
- Handoff expectation: if the gap clears, route the next Project Truth gap to the next owner rather than expanding QA scope.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, `.agents/core/project-memory-index.md`, `.codex/context/*` | Task packet, truth updates, final closeout | Integrated verification packet | Parent validation gate | COMPLETED |
| QA/Test | QA/Test | `docs/status/app-completion-index.*`, `src/modules/workforce/workforce.service.ts`, `src/tests/api.test.ts` | Focused automated proof for `entityAuthority` | Explicit human and agent authority readback evidence | Manual disposable-DB API proof | COMPLETED |
| Architecture | Coordinator | `docs/architecture/scanner-overrides.json`, generated graphs/status | Exact proof relation for the function row | Verified override + refreshed generated evidence | Override JSON parse; architecture/app-completion/project-truth refresh | COMPLETED |
| Documentation/Memory | Coordinator | `.agents/state/*`, `.codex/context/*`, `docs/planning/mvp-next-commits.md` | Durable current-truth updates | Evidence-backed closure and next owner | Generated truth readback | COMPLETED |

## Context
After [LUC-990](/LUC/issues/LUC-990), the first Project Truth gap moved to `src/modules/workforce/workforce.service.ts#entityAuthority` as `missing_test_link`. Existing workforce API coverage created and listed workforce entities, but it did not explicitly assert the computed authority payload that exposes human workspace authority, filtered capability exposure, and agent profile recommendations.

## Goal
Add the smallest explicit automated proof for `entityAuthority`, link it to the exact generated function row, refresh generated truth, and confirm the original `missing_test_link` is cleared.

## Scope
- `src/tests/api.test.ts`
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-997-account-access-workforce-entityauthority-proof.md`
- generated `docs/graphs/*` and `docs/status/*` outputs required by the proof refresh
- relevant source-of-truth state files updated by closeout

Out of scope:
- runtime logic changes in `src/modules/workforce/workforce.service.ts`
- broader workforce UX or workflow changes
- doc-link curation, deploy/push, protected smoke, or production credential use

## Implementation Plan
1. Inspect the current `entityAuthority` helper, existing workforce API tests, and generated proof state for the first gap.
2. Assert the human workforce record exposes workspace-scoped authority and the filtered capability set.
3. Assert a created agent workforce record exposes profile-based recommendations, filtered visible scopes, and blocked-action guardrails through the workforce list response.
4. Link `src/tests/api.test.ts` and this task packet to `src/modules/workforce/workforce.service.ts#entityAuthority` in scanner overrides.
5. Run focused validation and refresh architecture/app-completion/Project Truth outputs.
6. Update source-of-truth files with closure evidence and the next owner/action.

## Acceptance Criteria
- [x] `src/tests/api.test.ts` explicitly proves human and agent `entityAuthority` readback through `/v1/workforce`.
- [x] `docs/architecture/scanner-overrides.json` links the proof to `src/modules/workforce/workforce.service.ts#entityAuthority`.
- [x] Refreshed generated truth no longer reports `src/modules/workforce/workforce.service.ts#entityAuthority` as `missing_test_link`.

## Deliverable For This Stage
A verified local proof packet that closes the dispatched `entityAuthority` `missing_test_link` gap and updates generated truth plus project memory.

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
- Tests: `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` PASS; `npm run prisma:migrate:deploy` PASS against a disposable local `postgres:16-alpine` container on `127.0.0.1:55432`; `npm run seed` PASS against the same disposable database; `node --test dist/tests/api.test.js` PASS (`8/8`).
- Manual checks: disposable local Postgres container `companycore-test-postgres` came ready via `docker run ... postgres:16-alpine`; `docker exec companycore-test-postgres pg_isready -U companycore -d companycore_test` PASS before migration/seed/test execution.
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
- Error state verified: not applicable
- Refresh/restart behavior verified: yes
- Regression check performed: yes; the full compiled API proof suite passed on the same disposable database.
