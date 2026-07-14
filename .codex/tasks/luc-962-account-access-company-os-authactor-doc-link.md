# Task

## Header
- ID: LUC-962
- Title: Prove Account access missing-doc-link for `src/modules/company-os/company-os.routes.ts#authActor`
- Task Type: documentation/source-of-truth
- Current Stage: verification
- Status: DONE
- Owner: Documentation Steward
- Depends on: [LUC-959](/LUC/issues/LUC-959)
- Priority: P1
- Module Confidence Rows: Account access Company OS authActor doc-link confidence
- Iteration: 2026-07-13 Project Truth doc-link lane
- Operation Mode: EXECUTE
- Mission ID: LUC-962-ACCOUNT-ACCESS-COMPANY-OS-AUTHACTOR-DOC-LINK
- Mission Status: COMPLETE

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] The task aligns with Project Truth, app-completion, and Account access source-of-truth files.
- [x] `.agents/core/project-memory-index.md` and `.agents/state/module-confidence-ledger.md` were reviewed.
- [x] The task improves release confidence by clearing a concrete missing-doc-link row.

## Mission Block
- Mission objective: prove `src/modules/company-os/company-os.routes.ts#authActor` with the smallest supported documentation-link evidence and link that proof into Project Truth.
- Release objective advanced: Roost Project Truth / app-completion confidence for Account access.
- Included slices: exact documentation relation, accepted Company OS approval-lifecycle doc readback, generated architecture/app-completion/Project Truth refresh, and state updates.
- Explicit exclusions: product code, test code, schema, migration, protected smoke, deploy, push, restart, production mutation, provider action, credential value access, and secret disclosure.
- Checkpoint cadence: add the exact doc relation, refresh generated evidence, update state, then route the next non-doc gap.
- Stop conditions: protected action needed, architecture mismatch, or inability to clear the exact symbol locally without changing runtime behavior.
- Handoff expectation: close [LUC-962](/LUC/issues/LUC-962) when `missing_doc_link` clears; route any next non-doc follow-up to the proper owner from Project Truth.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, Paperclip wake payload | Task closure and source-of-truth updates | LUC-962 packet and issue disposition | Final issue update | COMPLETE |
| Documentation/Memory | Documentation Steward | Project Truth readback | `docs/architecture/relations/documentation-links.csv`, generated readbacks, source-of-truth state updates | Exact doc-link relation | Architecture/app-completion/Project Truth refresh | COMPLETE |

## Context
[LUC-962](/LUC/issues/LUC-962) was dispatched from Project Truth for:

`Account access: authActor has app-completion risk missing_doc_link.`

The target helper already has focused API proof from [LUC-959](/LUC/issues/LUC-959), which proves bearer-owner and API-key actor attribution through Company OS approval-request flows. The missing piece is the exact generated function-path relation to a source-of-truth document that describes authenticated actor attribution and the required audit/event evidence for the same Company OS approval lifecycle surface.

## Goal
Clear the exact `src/modules/company-os/company-os.routes.ts#authActor` `missing_doc_link` row without changing runtime behavior.

## Scope
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-962-account-access-company-os-authactor-doc-link.md`
- generated architecture/app-completion/Project Truth readback artifacts
- required source-of-truth state updates
- no runtime implementation changes

## Implementation Plan
1. Confirm the generated first gap is the exact `company-os.routes.ts#authActor` `missing_doc_link` row.
2. Confirm the accepted Company OS task contract documents approval request and decision command flows, authenticated actor attribution, and audit/event evidence closely enough to cover the helper.
3. Add one documentation-link relation from the exact generated function path to `docs/planning/company-os-stage1-task-contracts.md`.
4. Refresh architecture/app-completion/Project Truth evidence.
5. Update source-of-truth state with validation and the next gap.

## Acceptance Criteria
- [x] The exact generated function path is linked to a source-of-truth document.
- [x] Architecture refresh applies the new documentation relation.
- [x] App-completion readback no longer reports `company-os.routes.ts#authActor` as `missing_doc_link`.
- [x] Project Truth first gap advances away from `company-os.routes.ts#authActor` and is explained with exact evidence.
- [x] No runtime, provider, protected, deployment, credential, or secret behavior is changed.

## Definition Of Done
- [x] Local validation commands are recorded with pass/fail evidence.
- [x] Changed files are listed.
- [x] Residual risk and next owner/action are recorded.
- [x] Paperclip issue [LUC-962](/LUC/issues/LUC-962) receives a final disposition.

## Result Report
- Added `docs/architecture/relations/documentation-links.csv` row linking
  `src/modules/company-os/company-os.routes.ts#authActor` to
  `docs/planning/company-os-stage1-task-contracts.md`.
- Architecture-awareness refresh PASS generated `2026-07-13T18:04:09.254Z`
  with `2867` entities / `6971` relations / `16461` files and materialized the
  exact `document:company-os-stage-1-task-contracts -> function:authActor`
  relation in the generated graph.
- App-completion refresh PASS now reports `1243` items / `5` flows /
  `1144` missing test links / `28` missing doc links /
  `9` implemented-needs-proof / `0` blocked / `1181` known risk items, and
  no longer reports `src/modules/company-os/company-os.routes.ts#authActor` as
  `missing_doc_link`.
- Project Truth apply PASS generated `2026-07-13T18:05:15.282Z` with public
  probe `pass`, runtime/event/ops gaps `0`, and first gap advanced to
  `src/modules/company-os/workflow-definition-drafts.routes.ts#authActor`
  `missing_test_link`.
- Validation: `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-architecture-awareness-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS; `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost` PASS; `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-project-truth-indexes.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost --apply` PASS; `git diff --check` PASS with LF-to-CRLF warning on `docs/architecture/relations/documentation-links.csv`.
- Files changed: `.codex/tasks/luc-962-account-access-company-os-authactor-doc-link.md`, `docs/architecture/relations/documentation-links.csv`, generated `docs/graphs/*`, generated `docs/status/*`, `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, `.agents/state/active-mission.md`, `.agents/state/current-focus.md`, `.agents/state/next-steps.md`, `.agents/state/system-health.md`, `.agents/state/module-confidence-ledger.md`, `docs/planning/mvp-next-commits.md`.
- Residual risk: no residual same-symbol doc-link work remains for `src/modules/company-os/company-os.routes.ts#authActor`; the next routed gap is QA-owned proof debt on `src/modules/company-os/workflow-definition-drafts.routes.ts#authActor`.
- No product code, test code, live provider call, protected smoke, deploy,
  restart, push, production mutation, credential value access, or secret
  disclosure occurred.
