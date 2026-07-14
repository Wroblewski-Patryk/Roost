# LUC-982 Account Access Intake authActor Proof

## Task Contract

- Goal: Prove the Account access `missing_test_link` for `src/modules/intake/intake.routes.ts#authActor`.
- Task Type: Execute
- Current Stage: verification
- Deliverable For This Stage: focused automated proof, exact scanner linkage, refreshed generated truth, and closeout evidence.

## Scope

- In scope:
  - `src/modules/intake/intake.routes.ts`
  - `src/tests/api.test.ts`
  - `docs/architecture/scanner-overrides.json`
  - generated `docs/status/*` and `docs/graphs/*` touched by truth refresh
  - relevant task/state updates for this proof lane
- Out of scope:
  - runtime route behavior changes beyond proof
  - docs-only link curation for the same symbol
  - deploy, push, protected smoke, or production mutation

## Implementation Plan

1. Confirm the first Project Truth gap is `src/modules/intake/intake.routes.ts#authActor` with `missing_test_link`.
2. Extend the existing intake API integration test surface with explicit bearer-owner and API-key actor assertions for route proposals.
3. Link the proof packet to the exact function path in `docs/architecture/scanner-overrides.json`.
4. Run focused verification and refresh architecture-awareness, app-completion, and Project Truth outputs.
5. Record durable task/state evidence and close the issue with exact results.

## Acceptance Criteria

- `src/tests/api.test.ts` proves bearer-owner intake route proposals record `actorType=user` and the workspace owner user id.
- `src/tests/api.test.ts` proves intake API-key route proposals record `actorType=agent` and the intake API key id.
- `docs/architecture/scanner-overrides.json` links the proof to `src/modules/intake/intake.routes.ts#authActor`.
- Refreshed app-completion and Project Truth no longer report `src/modules/intake/intake.routes.ts#authActor` as `missing_test_link`.
- Verification commands and outcomes are captured in this packet and the issue closeout.

## Definition Of Done

- The exact dispatched `missing_test_link` row is replaced by evidence-backed verified status or a narrower residual gap owned by the next routed role.
- The focused automated proof passes locally.
- Generated truth/readback is refreshed.
- Source-of-truth state reflects the new result.

## Result Report

- Status: Complete for the dispatched `missing_test_link` proof lane.
- Files changed:
  - `src/tests/api.test.ts`
  - `docs/architecture/scanner-overrides.json`
  - `.codex/tasks/luc-982-account-access-intake-authactor-proof.md`
  - generated `docs/graphs/*` and `docs/status/*`
  - `.agents/state/active-mission.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- Verification:
  - Focused local disposable-DB proof PASS:
    - `docker run -d --name companycore-luc-982-postgres -e POSTGRES_DB=companycore_test -e POSTGRES_USER=companycore -e POSTGRES_PASSWORD=companycore -p 55482:5432 postgres:16-alpine`
    - `$env:DATABASE_URL='postgresql://companycore:companycore@127.0.0.1:55482/companycore_test?schema=public'; npm run prisma:migrate:deploy`
    - `$env:DATABASE_URL='postgresql://companycore:companycore@127.0.0.1:55482/companycore_test?schema=public'; node_modules\\.bin\\tsx.cmd <temp luc-982 proof script>`
    - Proof output: bearer route proposal recorded `actorType=user` / `actorId=<workspace owner id>` and API-key route proposal recorded `actorType=agent` / `actorId=<api key id>`.
  - Architecture-awareness refresh PASS:
    - `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost`
    - Generated `2026-07-13T23:00:41.419Z` with `2872` entities / `7014` relations / `16464` files.
  - App-completion refresh PASS:
    - `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost`
    - Generated `1243` items / `5` flows / `1141` missing test links / `29` missing doc links / `9` implemented-needs-proof / `0` blocked / `1179` risk items.
  - Project Truth apply PASS:
    - `$env:ROOST_PUBLIC_URL='https://roost.luckysparrow.ch'; $env:ROOST_API_PUBLIC_URL='https://api.roost.luckysparrow.ch'; node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-project-truth-indexes.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost --apply`
    - Generated `2026-07-13T23:01:01.396Z` with public probe `pass`, runtime findings `0`, incomplete event chains `0`, operational gate gaps `0`, and first gap advanced to `src/modules/intake/intake.routes.ts#authActor` `missing_doc_link`.
  - Additional broad-source smoke, not used as closeout proof:
    - `$env:DATABASE_URL='postgresql://companycore:companycore@127.0.0.1:55482/companycore_test?schema=public'; npx tsx --test src/tests/api.test.ts --test-name-pattern "CompanyCore v1 protected API flow"` FAILED after `7/8` subtests on a pre-existing `Prisma P2028` interactive transaction timeout in `src/modules/auth/auth.routes.ts:55` via `src/operating-model/catalog.ts:405`, before the new intake assertions were reached.
- Commit / push / deploy:
  - Local commit: not created in this 09 TAE proof lane.
  - Push status: not needed.
  - Deploy impact: none.
- Residual risk:
  - No residual same-symbol `missing_test_link` work remains for `src/modules/intake/intake.routes.ts#authActor`; generated truth now classifies the same symbol only as `missing_doc_link`.
  - A separate auth bootstrap stability risk exists in `/v1/auth/register` because the broad source-level API smoke hit `Prisma P2028` transaction timeout while `ensureOperatingModelForWorkspace` runs inside the registration transaction. That risk is not introduced by this intake proof change and should be routed separately if broader API-suite stability becomes the next priority.
