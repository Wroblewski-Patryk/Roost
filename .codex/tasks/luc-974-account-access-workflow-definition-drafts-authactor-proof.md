# Task

## Header
- ID: LUC-974
- Title: Prove Account access missing-test-link for `src/modules/company-os/workflow-definition-drafts.routes.ts#authActor`
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Coverage Ledger Rows: Account access `src/modules/company-os/workflow-definition-drafts.routes.ts#authActor` `missing_test_link`
- Module Confidence Rows: Account access workflow-definition-drafts authActor proof
- Iteration: 1
- Operation Mode: TESTER

## Goal
Add the smallest explicit automated proof showing the workflow-definition draft route actor resolver records bearer-owner requests as `user` actors and workflow-definition API-key requests as `agent` actors, then link that proof into generated Project Truth.

## Scope
- `src/tests/api.test.ts`
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-974-account-access-workflow-definition-drafts-authactor-proof.md`
- generated `docs/graphs/*` and `docs/status/*` outputs touched by the proof refresh
- relevant source-of-truth state files updated during closeout

## Implementation Plan
1. Read the current gap, existing workflow-definition draft API coverage, and the route-local `authActor` helper.
2. Add explicit bearer-owner actor assertions for an existing workflow-definition draft creation path.
3. Add one narrow workflow-definition API-key creation proof and assert `agent` attribution in audit and event evidence.
4. Link the proof packet to `src/modules/company-os/workflow-definition-drafts.routes.ts#authActor` in scanner overrides.
5. Run the focused local API harness and refresh architecture/app-completion/Project Truth outputs.
6. Update the durable state files with the exact evidence and next routed gap.

## Acceptance Criteria
- `src/tests/api.test.ts` proves bearer-owner workflow-definition draft requests record `actorType=user` and the owner user id.
- `src/tests/api.test.ts` proves workflow-definition API-key draft requests record `actorType=agent` and the API key id.
- `docs/architecture/scanner-overrides.json` links the proof artifact to `src/modules/company-os/workflow-definition-drafts.routes.ts#authActor`.
- Generated architecture/app-completion/Project Truth refresh clears the target `missing_test_link` row.

## Result Report
- `src/tests/api.test.ts` now proves workflow-definition draft actor
  attribution for bearer-owner and API-key request paths by asserting the
  resulting audit entries and emitted event metadata carry `actorType=user`
  plus the owner user id for bearer requests, and `actorType=agent` plus the
  API key id for API-key requests.
- `docs/architecture/scanner-overrides.json` now marks
  `src/modules/company-os/workflow-definition-drafts.routes.ts#authActor`
  `verified`, links `src/tests/api.test.ts`, and links this proof packet as a
  `test` artifact so app-completion consumes the proof relation.
- Validation:
  - `npm run test:api:local` PASS (`8/8`)
  - `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` PASS
  - `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS generated `2026-07-13T18:38:17.797Z` with `2870` entities / `7002` relations / `16465` files
  - `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS generated `1243` items / `5` flows / `1142` missing test links / `29` missing doc links / `9` implemented-needs-proof / `0` blocked
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch; $env:ROOST_API_PUBLIC_URL='https://api.roost.luckysparrow.ch'; node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-project-truth-indexes.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost --apply` PASS generated `2026-07-13T18:38:29.270Z` with public probe `pass`, runtime/event/ops gaps `0`, and first gap advanced to the same symbol as `missing_doc_link`.
