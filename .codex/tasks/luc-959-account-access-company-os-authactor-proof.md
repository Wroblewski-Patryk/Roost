# Task

## Header
- ID: LUC-959
- Title: Prove Account access missing-test-link for `src/modules/company-os/company-os.routes.ts#authActor`
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-949](/LUC/issues/LUC-949)
- Priority: P1
- Coverage Ledger Rows: Account access `src/modules/company-os/company-os.routes.ts#authActor` `missing_test_link`
- Module Confidence Rows: Account access Company OS authActor proof
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: Account access proof-link drift for Company OS route actor attribution
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-959-account-access-company-os-authactor-proof
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
- Mission objective: clear the dispatched Account access `missing_test_link` gap for `src/modules/company-os/company-os.routes.ts#authActor`.
- Release objective advanced: reduce Company OS account-access proof debt without changing runtime behavior.
- Included slices: focused Company OS API assertions, exact scanner override linkage, generated truth refresh, and source-of-truth updates.
- Explicit exclusions: no route logic changes, no workflow-definition-drafts proof lane, no deploy/push, no protected smoke, no credential or production mutation.
- Checkpoint cadence: inspect -> prove -> refresh -> document.
- Stop conditions: focused proof fails, generated truth keeps the same first gap, or route capability/auth architecture contradicts the current evidence model.
- Handoff expectation: if the gap clears, route the next Project Truth gap to the next owner rather than expanding QA scope.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, `.agents/core/project-memory-index.md`, `.codex/context/*` | Task packet, truth updates, final closeout | Integrated verification packet | Parent validation gate | COMPLETED |
| QA/Test | QA/Test | `docs/status/app-completion-index.*`, `src/modules/company-os/company-os.routes.ts`, `src/tests/api.test.ts` | Focused automated proof for `authActor` | Explicit bearer and API-key actor attribution evidence | `npm run test:api:local` | COMPLETED |
| Architecture | Coordinator | `docs/architecture/scanner-overrides.json`, generated graphs/status | Exact proof relation for the function row | Verified override + refreshed generated evidence | Override JSON parse; architecture/app-completion/project-truth refresh | COMPLETED |
| Documentation/Memory | Coordinator | `.agents/state/*`, `.codex/context/*`, `docs/planning/mvp-next-commits.md` | Durable current-truth updates | Evidence-backed closure and next owner | Generated truth readback | COMPLETED |

## Context
After [LUC-949](/LUC/issues/LUC-949), the first Project Truth gap moved to `src/modules/company-os/company-os.routes.ts#authActor` as `missing_test_link`. Existing Company OS API coverage exercised the route family heavily, but the exact actor-mapping helper lacked explicit proof linkage and did not clearly show both bearer-user and API-key-agent attribution in one durable packet.

## Goal
Add the smallest explicit automated proof for `authActor`, link it to the exact generated function row, refresh generated truth, and confirm the original `missing_test_link` is cleared.

## Scope
- `src/tests/api.test.ts`
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-959-account-access-company-os-authactor-proof.md`
- generated `docs/graphs/*` and `docs/status/*` outputs required by the proof refresh
- relevant source-of-truth state files updated by closeout

Out of scope:
- runtime logic changes in `src/modules/company-os/company-os.routes.ts`
- proof work for `workflow-definition-drafts.routes.ts#authActor`
- doc-link curation, deploy/push, protected smoke, or production credential use

## Implementation Plan
1. Inspect the current `authActor` helper, existing Company OS API tests, and generated proof state for the first gap.
2. Tighten the existing bearer-auth Company OS approval request assertions so audit/event actor attribution is explicit.
3. Add one narrow API-key Company OS approval request proof that records `agent` actor attribution through the same route family.
4. Link `src/tests/api.test.ts` to `src/modules/company-os/company-os.routes.ts#authActor` in scanner overrides.
5. Run focused validation and refresh architecture/app-completion/Project Truth outputs.
6. Update source-of-truth files with closure evidence and the next owner/action.

## Acceptance Criteria
- [x] `src/tests/api.test.ts` explicitly proves `authActor` maps bearer owner requests to `actorType=user` and `actorId=<owner user id>` through Company OS audit/event evidence.
- [x] `src/tests/api.test.ts` explicitly proves `authActor` maps Company OS API-key approval requests to `actorType=agent` and `actorId=<api key id>`.
- [x] `docs/architecture/scanner-overrides.json` links the focused API proof to `src/modules/company-os/company-os.routes.ts#authActor`.
- [x] Generated architecture/app-completion/Project Truth refresh clears the target `missing_test_link` row.

## Deliverable For This Stage
A verified proof packet with focused API evidence, scanner linkage, refreshed generated outputs, and closeout-ready issue evidence for `company-os.routes.ts#authActor`.

## Result Report
- Task summary: Added explicit Company OS API assertions proving `authActor` records bearer-owner requests as `user` and API-key requests as `agent`, linked `src/tests/api.test.ts` to the exact generated function row, refreshed generated truth, and cleared the dispatched `missing_test_link`.
- Files changed: `.codex/tasks/luc-959-account-access-company-os-authactor-proof.md`, `src/tests/api.test.ts`, `docs/architecture/scanner-overrides.json`, generated `docs/graphs/*`, generated `docs/status/*`, `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, `.agents/state/active-mission.md`, `.agents/state/current-focus.md`, `.agents/state/next-steps.md`, `.agents/state/system-health.md`, `.agents/state/module-confidence-ledger.md`, `.agents/state/known-issues.md`, `docs/planning/mvp-next-commits.md`
- How tested: `npm run test:api:local` PASS; `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` PASS; `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS; `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS; `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-project-truth-indexes.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost --apply` PASS
- What is incomplete: no residual same-symbol proof work remains in QA scope once generated truth moves away from `company-os.routes.ts#authActor`.
- Next steps: route the next Project Truth first gap to the owner selected by refreshed generated truth; do not reopen `authActor` unless a future regression removes the verified proof link.
- Decisions made: treated the gap as a focused proof-link task rather than a route-runtime defect because Company OS behavior already existed and only actor attribution evidence was missing.

## Notes
Single-lane verification work. No subagent delegation was warranted because the change stayed inside one focused API proof file plus metadata linkage for a single function row.
