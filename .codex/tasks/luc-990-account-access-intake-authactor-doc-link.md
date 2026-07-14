# Task

## Header
- ID: LUC-990
- Title: Prove Account access missing-doc-link for `src/modules/intake/intake.routes.ts#authActor`
- Task Type: documentation/source-of-truth
- Current Stage: verification
- Status: DONE
- Owner: Documentation Steward
- Depends on: [LUC-982](/LUC/issues/LUC-982)
- Priority: P1
- Module Confidence Rows: Account access intake authActor doc-link confidence
- Iteration: 2026-07-14 Project Truth doc-link lane
- Operation Mode: EXECUTE
- Mission ID: LUC-990-ACCOUNT-ACCESS-INTAKE-AUTHACTOR-DOC-LINK
- Mission Status: COMPLETE

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] The task aligns with Project Truth, app-completion, and Account access source-of-truth files.
- [x] `.agents/core/project-memory-index.md` and `.agents/state/module-confidence-ledger.md` were reviewed.
- [x] The task improves release confidence by clearing a concrete missing-doc-link row.

## Mission Block
- Mission objective: prove `src/modules/intake/intake.routes.ts#authActor` with the smallest supported documentation-link evidence and link that proof into Project Truth.
- Release objective advanced: Roost Project Truth / app-completion confidence for Account access.
- Included slices: exact documentation relation, accepted intake API contract readback, generated architecture/app-completion/Project Truth refresh, and state updates.
- Explicit exclusions: product code, test code, schema, migration, protected smoke, deploy, push, restart, production mutation, provider action, credential value access, and secret disclosure.
- Checkpoint cadence: add the exact doc relation, refresh generated evidence, update state, then route the next non-doc gap.
- Stop conditions: protected action needed, architecture mismatch, or inability to clear the exact symbol locally without changing runtime behavior.
- Handoff expectation: close [LUC-990](/LUC/issues/LUC-990) when `missing_doc_link` clears; route any next non-doc follow-up to the proper owner from Project Truth.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, Paperclip wake payload | Task closure and source-of-truth updates | LUC-990 packet and issue disposition | Final issue update | COMPLETE |
| Documentation/Memory | Documentation Steward | Project Truth readback | `docs/API.md`, `docs/architecture/relations/documentation-links.csv`, generated readbacks, source-of-truth state updates | Exact doc-link relation | Architecture/app-completion/Project Truth refresh | COMPLETE |

## Context
[LUC-990](/LUC/issues/LUC-990) was dispatched from Project Truth for:

`Account access: authActor has app-completion risk missing_doc_link.`

The target helper already has focused API proof from [LUC-982](/LUC/issues/LUC-982), which proves bearer-owner and API-key actor attribution through intake route-proposal flows. The missing piece is the exact generated function-path relation to a source-of-truth document that describes actor attribution for intake route proposals and the required audit/event evidence for the same surface.

## Goal
Clear the exact `src/modules/intake/intake.routes.ts#authActor` `missing_doc_link` row without changing runtime behavior.

## Scope
- `docs/API.md`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-990-account-access-intake-authactor-doc-link.md`
- generated architecture/app-completion/Project Truth readback artifacts
- required source-of-truth state updates
- no runtime implementation changes

## Implementation Plan
1. Confirm the generated first gap is the exact `intake.routes.ts#authActor` `missing_doc_link` row.
2. Confirm the accepted intake API contract documents bearer-owner versus API-key actor attribution plus matching audit/event evidence closely enough to cover the helper.
3. Add one documentation-link relation from the exact generated function path to `docs/API.md` and tighten the intake API text if the actor-attribution detail is implicit.
4. Refresh architecture/app-completion/Project Truth evidence.
5. Update source-of-truth state with validation and the next gap.

## Acceptance Criteria
- [x] The exact generated function path is linked to a source-of-truth document.
- [x] The linked intake API contract explicitly documents bearer-owner versus API-key actor attribution for route proposal evidence.
- [x] Architecture refresh applies the new documentation relation.
- [x] App-completion readback no longer reports `intake.routes.ts#authActor` as `missing_doc_link`.
- [x] Project Truth first gap advances away from `intake.routes.ts#authActor` and is explained with exact evidence.
- [x] No runtime, provider, protected, deployment, credential, or secret behavior is changed.

## Definition Of Done
- [x] Local validation commands are recorded with pass/fail evidence.
- [x] Changed files are listed.
- [x] Residual risk and next owner/action are recorded.
- [x] Paperclip issue [LUC-990](/LUC/issues/LUC-990) receives a final disposition.

## Result Report
- Added a new `docs/architecture/relations/documentation-links.csv` row
  linking `src/modules/intake/intake.routes.ts#authActor` to `docs/API.md`.
- Tightened the `POST /v1/intake/actions/propose-route` section in `docs/API.md`
  so the accepted intake API contract explicitly documents bearer-owner
  `actorType=user` / owner-id attribution and API-key `actorType=agent` /
  API-key-id attribution in `intake.route_proposed` audit and event evidence,
  without mutating the source intake item.
- Architecture-awareness refresh PASS generated `2026-07-13T23:08:32.101Z`
  with `2874` entities / `7034` relations / `16464` files after consuming the
  new doc-link source row.
- App-completion refresh PASS generated `2026-07-13T23:08:39.909Z` with
  `1243` items / `5` flows / `1141` missing test links / `28` missing doc
  links / `9` implemented-needs-proof / `0` blocked / `1178` risk items, and
  no longer reports `src/modules/intake/intake.routes.ts#authActor` as
  `missing_doc_link`.
- Project Truth apply PASS generated `2026-07-13T23:08:46.804Z` with public
  probe `pass`, runtime/event/ops gaps `0`, and first gap advanced to
  `src/modules/workforce/workforce.service.ts#entityAuthority`
  `missing_test_link`.
- Validation: `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS; `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS; `$env:ROOST_PUBLIC_URL='https://roost.luckysparrow.ch'; $env:ROOST_API_PUBLIC_URL='https://api.roost.luckysparrow.ch'; node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-project-truth-indexes.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost --apply` PASS; `git diff --check` PASS with LF-to-CRLF warnings only.
- Files changed: `.codex/tasks/luc-990-account-access-intake-authactor-doc-link.md`, `docs/API.md`, `docs/architecture/relations/documentation-links.csv`, generated `docs/graphs/*`, generated `docs/status/*`, and existing source-of-truth state files already tracking the same Project Truth lane.
- Residual risk: no residual same-symbol doc-link work remains for
  `src/modules/intake/intake.routes.ts#authActor`; the next routed gap is
  QA-owned proof debt on `src/modules/workforce/workforce.service.ts#entityAuthority`.
- No product code, test code, live provider call, protected smoke, deploy,
  restart, push, production mutation, credential value access, or secret
  disclosure occurred.
- Pending execution.
