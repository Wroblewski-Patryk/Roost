# Task

## Header
- ID: LUC-1028
- Title: Link or extend local proof for `GET /v1/projects`
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on:
- Priority: P1
- Coverage Ledger Rows: `GET /v1/projects` local proof gap
- Module Confidence Rows: Projects route list proof
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: Projects list proof-link drift
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-1028-projects-route-get-proof
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
- Mission objective: give `GET /v1/projects` a direct local proof packet and exact scanner linkage.
- Release objective advanced: reduce backend CRUD route proof drift without changing runtime behavior.
- Included slices: focused project-list API assertion, exact scanner override linkage, generated truth refresh, and source-of-truth updates.
- Explicit exclusions: no projects route logic changes, no schema changes, no deploy/push, no protected smoke, no credential or production mutation.
- Checkpoint cadence: inspect -> extend proof -> refresh -> document.
- Stop conditions: local API proof fails, generated truth still lacks the route-level proof link, or route behavior contradicts the accepted workspace-scoped projects contract.
- Handoff expectation: after the route is verified, leave the next routed proof/doc gap to the next owner instead of expanding scope into the rest of project CRUD.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, `.agents/core/project-memory-index.md`, `.codex/context/*` | Task packet, truth updates, final closeout | Integrated verification packet | Parent validation gate | COMPLETED |
| Backend proof | Backend Builder | `src/modules/projects/projects.routes.ts`, `src/tests/api.test.ts`, `docs/API.md` | Focused automated proof for `GET /v1/projects` | Explicit same-workspace list visibility plus cross-workspace empty-list evidence | Local API proof | COMPLETED |
| Architecture | Coordinator | `docs/architecture/scanner-overrides.json`, generated graphs/status | Exact proof relation for the route entity | Verified override + refreshed generated evidence | Override JSON parse; architecture/app-completion/Project Truth refresh | COMPLETED |
| Documentation/Memory | Coordinator | `.agents/state/*`, `.codex/context/*` | Durable current-truth updates | Evidence-backed closure and next owner | Generated truth readback | COMPLETED |

## Context
`GET /v1/projects` already existed and the broad API suite exercised project CRUD, but the exact route proof was implicit and weak: the suite only asserted that another workspace saw an empty list. The issue asked for a linked or extended local proof, so the smallest safe repair was to prove that the owning workspace sees its project on `GET /v1/projects`, then link that proof directly to the route entity.

## Goal
Extend the existing API proof so `GET /v1/projects` is explicitly validated for same-workspace visibility, link that evidence to the route in scanner overrides, refresh generated truth, and record the closure durably.

## Scope
- `src/tests/api.test.ts`
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-1028-projects-route-get-proof.md`
- generated `docs/graphs/*` and `docs/status/*` outputs required by the proof refresh
- relevant source-of-truth state files updated by closeout

Out of scope:
- runtime logic changes in `src/modules/projects/projects.routes.ts`
- project CRUD behavior beyond `GET /v1/projects`
- doc-link curation, deploy/push, protected smoke, or production credential use

## Implementation Plan
1. Inspect the current projects route, existing API test coverage, and generated route proof state for `GET /v1/projects`.
2. Extend the existing protected API flow to assert that the owning workspace receives the created project from `GET /v1/projects`.
3. Preserve the existing cross-workspace empty-list assertion for the same endpoint.
4. Link `src/tests/api.test.ts` and this task packet to `docs/architecture/nodes/generated/API-AUTO-0076.md` in scanner overrides.
5. Run local validation and refresh architecture/app-completion/Project Truth outputs.
6. Update source-of-truth files with closure evidence and the next owner/action.

## Acceptance Criteria
- [x] `src/tests/api.test.ts` explicitly proves `GET /v1/projects` returns the created project to the owning workspace.
- [x] `src/tests/api.test.ts` still proves another workspace receives an empty list from `GET /v1/projects`.
- [x] `docs/architecture/scanner-overrides.json` links the proof to `docs/architecture/nodes/generated/API-AUTO-0076.md`.
- [x] Refreshed generated truth materializes the route-level proof linkage for `GET /v1/projects`.

## Deliverable For This Stage
A verified local proof packet that closes the route-level evidence gap for `GET /v1/projects` and updates generated truth plus project memory.

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
- Manual checks: reviewed the route and test readback to confirm the proof now covers both same-workspace visibility and cross-workspace isolation on the real compiled API path.
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
- Error state verified: yes; the protected route still enforces workspace scoping while the owning workspace receives its own records.
- Refresh/restart behavior verified: yes; compiled app/server rebuilt, migrations applied, seed loaded, and the full local API suite passed on a fresh disposable database.
- Regression check performed: yes; `npm run test:api:local` reran the full compiled local API proof suite and passed `8/8`.

## Result Report
- Task summary: Completed the requested `GET /v1/projects` proof extension by adding an explicit owner-workspace list assertion, linking the broad API proof plus this packet to the generated route node, and refreshing the generated truth artifacts.
- Files changed:
  - `src/tests/api.test.ts`
  - `docs/architecture/scanner-overrides.json`
  - `.codex/tasks/luc-1028-projects-route-get-proof.md`
- How tested:
  - `npm run test:api:local` PASS, including build, migrate, seed, and `node --test dist/tests/api.test.js` PASS (`8/8`) on a disposable local PostgreSQL container.
  - `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` PASS.
  - Architecture-awareness refresh PASS with route proof linkage materialized for `GET /v1/projects`.
  - App-completion refresh PASS.
  - Project Truth apply PASS.
  - `npm run architecture:status` PASS.
- What is incomplete: no remaining local proof work is needed for `GET /v1/projects` from this issue scope; unrelated project CRUD route gaps, if any, remain separate work.
- External tracker note: the available GitHub and ClickUp connector surfaces in this session did not expose a writable LUC-1028 record, so the local closure packet remains the only durable completion evidence here. GitHub issue mutation returned `404 Not Found`, and ClickUp search returned no `LUC-1028` task.
- Next steps:
  1. Leave `GET /v1/projects` closed unless a fresh generated regression removes the proof link.
  2. Route the next generated backend proof or doc-link gap to its actual owner instead of expanding this projects scope.
- Decisions made:
  - Reused the existing protected API suite instead of creating a duplicate route-only harness.
  - Extended the proof at the exact route touchpoint rather than rewriting project CRUD coverage.
