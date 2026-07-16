# Task

## Header
- ID: LUC-1326
- Title: Prove Account access missing-doc-link for `USE /mcp`
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: [LUC-1321](/LUC/issues/LUC-1321)
- Priority: P1
- Coverage Ledger Rows: Account access `src/app.ts#/mcp` `missing_doc_link`
- Module Confidence Rows: `MCP documentation linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: account access MCP route documentation-link drift
- Iteration: 2026-07-16-LUC-1326
- Operation Mode: BUILDER
- Mission ID: LUC-1326-ACCOUNT-ACCESS-USE-MCP-DOC-LINK
- Mission Status: DONE

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] The task aligns with Project Truth, app-completion, and route source-of-truth files.
- [x] `.agents/core/project-memory-index.md` and `.agents/state/module-confidence-ledger.md` were reviewed.
- [x] The task improves release confidence by clearing a concrete missing-doc-link row.

## Mission Block
- Mission objective: prove `src/app.ts#/mcp` with the smallest supported documentation-link evidence and link that proof into Project Truth.
- Release objective advanced: Roost Project Truth / app-completion confidence for the Account access MCP route.
- Included slices: exact documentation relation, accepted MCP API contract readback, generated architecture/app-completion/Project Truth refresh, and state updates.
- Explicit exclusions: runtime code, tests, schema, migration, deploy, push, restart, production mutation, provider action, credential value access, and secret disclosure.
- Checkpoint cadence: add the exact doc relation, refresh generated evidence, update state, then route the next gap.
- Stop conditions: architecture refresh fails, generated readback keeps the exact symbol as `missing_doc_link`, or the accepted MCP API contract proves too weak to cover the mount without runtime changes.
- Handoff expectation: close [LUC-1326](/LUC/issues/LUC-1326) when `missing_doc_link` clears; route any next non-doc follow-up to the proper owner from Project Truth.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | `AGENTS.md`, Paperclip wake payload | Task closure and source-of-truth updates | LUC-1326 packet and issue disposition | Final issue update | COMPLETE |
| Documentation/Memory | Documentation Steward | Project Truth readback | `docs/API.md`, `docs/architecture/relations/documentation-links.csv`, generated readbacks, source-of-truth state updates | Exact doc-link relation | Architecture/app-completion/Project Truth refresh | COMPLETE |

## Context
[LUC-1321](/LUC/issues/LUC-1321) already proved the routed `src/app.ts#/mcp` mount with the existing protected API suite and moved the same symbol from `missing_test_link` to `missing_doc_link`. `docs/API.md` already contains the accepted `/v1/mcp/manifest` and `/mcp/manifest` contract, but `docs/architecture/relations/documentation-links.csv` did not yet include the exact route-mount relation for `src/app.ts#/mcp`.

## Goal
Clear the exact `src/app.ts#/mcp` `missing_doc_link` row without changing runtime behavior.

## Scope
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1326-prove-account-access-missing-doc-link-for-use-mcp.md`
- `.codex/tasks/luc-1326-completion-evidence.md`
- generated architecture/app-completion/Project Truth readback artifacts
- required source-of-truth state updates
- no runtime implementation changes

## Implementation Plan
1. Confirm the generated first gap is the exact `src/app.ts#/mcp` `missing_doc_link` row.
2. Confirm the accepted MCP API contract already documents the protected `/v1/mcp/manifest` route family closely enough to cover the mount.
3. Add one documentation-link relation from the exact route-mount path to `docs/API.md`.
4. Refresh architecture/app-completion/Project Truth evidence.
5. Update source-of-truth state with validation and the next gap.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Project Truth routes `src/app.ts#/mcp` as the current Account access `missing_doc_link` gap.
- Gaps: the accepted MCP API docs already describe the manifest route family, but the exact route-mount relation was missing.
- Inconsistencies: route behavior and proof already exist, but the generated completion index could not discover accepted docs for the exact mount.
- Architecture constraints: stay inside documentation, generated-truth artifacts, and source-of-truth state only.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none blocking
- Sources scanned: `src/app.ts`, `src/modules/mcp/mcp.routes.ts`, `docs/API.md`, `docs/architecture/relations/documentation-links.csv`, `docs/status/project-truth-index.json`, `.agents/state/active-mission.md`, `.agents/state/next-steps.md`, and `.agents/state/module-confidence-ledger.md`.
- Rows created or corrected: `docs/architecture/relations/documentation-links.csv` now includes the exact `src/app.ts#/mcp` documentation relation.
- Assumptions recorded: `docs/API.md` is the accepted source-of-truth surface for protected MCP manifest route contracts and compatibility aliases.
- Blocking unknowns: none
- Why it was safe to continue: the gap is documentation-link drift, not missing runtime evidence.

### 2. Select One Priority Mission Objective
- Selected task: `USE /mcp` missing-doc-link closure.
- Priority rationale: it is the current routed Project Truth docs-owned gap for the Account access workflow.
- Why other candidates were deferred: they depend on the post-refresh queue and should stay separate if they remain.

### 3. Plan Implementation
- Files or surfaces to modify: `docs/architecture/relations/documentation-links.csv`, this task packet, the sibling completion-evidence packet, generated truth artifacts, and narrow source-of-truth state summaries.
- Logic: attach the exact protected route-mount entity to the existing accepted MCP API contract.
- Validation shape: refresh architecture-awareness first, then rebuild app-completion and Project Truth sequentially so readback uses the refreshed graph.
- Failure trigger: if the row persists, inspect whether the documentation relation or current MCP contract coverage is still too weak.

### 4. Execute Implementation
- Implementation notes: the documentation-links registry now links the exact `src/app.ts#/mcp` mount to `docs/API.md`, and the MCP manifest contract in `docs/API.md` was tightened so the accepted source-of-truth text explicitly states that `/v1/mcp/manifest` and `/mcp/manifest` are protected workspace-scoped read routes gated by `mcp:read`, capability-filtered, and bridge-only.

### 5. Verify and Test
- Validation planned:
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`
- Result: PASS. Refreshed architecture-awareness materialized the exact documentation relation, app-completion no longer reports `api_endpoint:use-mcp:3055a10566` as `missing_doc_link`, and Project Truth advances the first routed gap to `src/app.ts#/notes` `missing_test_link` while leaving only `src/app.ts#/connection` as the remaining docs-owned route gap.

### 6. Self-Review
- Simpler option considered: relation-only linkage without touching `docs/API.md`; rejected because the generated classifier still treated `USE /mcp` as `missing_doc_link` until the MCP manifest section explicitly stated the protected route-family contract.
- Reuse check: reusing the same accepted API contract surface and documentation-links registry already used for nearby route-mount closures.
- Temporary-solution check: no workaround or placeholder wording added.
- Refinements made: none

### 7. Update Documentation and Knowledge
- Docs updated: documentation-links registry, this task packet, the sibling completion-evidence packet, generated outputs, and narrow source-of-truth state summaries.
- Context updated: yes
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] The exact generated route-mount path is linked to a source-of-truth document.
- [x] The linked MCP API contract explicitly documents the `/mcp/manifest` and `/v1/mcp/manifest` route family as protected capability-filtered bridge metadata routes.
- [x] Architecture refresh applies the new documentation relation.
- [x] App-completion readback no longer reports `src/app.ts#/mcp` as `missing_doc_link`.
- [x] Project Truth first gap advances away from `src/app.ts#/mcp` and is explained with exact evidence.
- [x] No runtime, provider, deployment, credential, or secret behavior is changed.

## Definition Of Done
- [x] Local validation commands are recorded with pass/fail evidence.
- [x] Changed files are listed.
- [x] Residual risk and next owner/action are recorded.
- [x] Paperclip issue [LUC-1326](/LUC/issues/LUC-1326) receives a final disposition, and the dirty-worktree follow-up is routed to [LUC-1328](/LUC/issues/LUC-1328).

## Deliverable For This Stage
A verified local documentation-link closure packet for the exact `src/app.ts#/mcp` route mount, plus refreshed generated truth and durable state evidence.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Validation Evidence
- Tests: `npm run architecture:refresh` PASS; `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`generatedAt 2026-07-16T15:30:01.227Z`, `3084` entities / `8103` relations / `16524` files); `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`46` items / `4` flows / `19` missing test links / `1` missing doc link / `0` implemented-needs-proof / `0` blocked / `20` risk items); `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` PASS (`generatedAt 2026-07-16T15:30:01.362Z` with public probes `pass`); `npm run architecture:status` PASS (`GREEN`, `455/769/35`, evidence queue `0`, chain worklist `0`).
- Manual checks: reviewed `docs/API.md`, `src/app.ts`, `src/modules/mcp/mcp.routes.ts`, and the refreshed generated readbacks to confirm the exact mount now resolves to accepted MCP contract evidence.
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
- Real API/service path used: yes; generated readback is anchored to the real `src/app.ts#/mcp` mount and accepted MCP manifest route contract.
- Endpoint and client contract match: yes
- DB schema and migrations verified: not applicable
- Loading state verified: not applicable
- Error state verified: yes; no user-facing or provider-facing error behavior changed because the task only closes documentation-link drift.
- Refresh/restart behavior verified: yes; architecture-awareness, app-completion, and Project Truth refreshes all completed successfully after the exact doc-link relation was added.
- Regression check performed: yes; refreshed generated truth advanced the first routed gap away from `src/app.ts#/mcp`.

## Result Report
- Added a new `docs/architecture/relations/documentation-links.csv` row linking `src/app.ts#/mcp` to `docs/API.md`.
- Tightened the existing MCP manifest contract in `docs/API.md` so the source-of-truth text now explicitly states that `/v1/mcp/manifest` and `/mcp/manifest` are protected workspace-scoped read routes gated by `mcp:read`, capability-filtered, and bridge-only.
- Architecture-awareness refresh PASS generated `2026-07-16T15:30:01.227Z` with `3084` entities / `8103` relations / `16524` files and materialized the exact `documents` relation for `src/app.ts#/mcp`.
- App-completion refresh PASS generated `46` items / `4` flows / `19` missing test links / `1` missing doc link / `0` implemented-needs-proof / `0` blocked / `20` risk items, and no longer reports `api_endpoint:use-mcp:3055a10566` as `missing_doc_link`.
- Project Truth apply PASS generated `2026-07-16T15:30:01.362Z` with public probes `pass`, runtime findings `0`, incomplete event chains `0`, operational gate gaps `0`, and advances the first routed gap to `src/app.ts#/notes` `missing_test_link` while leaving `src/app.ts#/connection` as the only remaining docs-owned route gap.
- Validation: `npm run architecture:refresh` PASS; `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS; `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS; `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` PASS; `npm run architecture:status` PASS (`GREEN`, `455/769/35`).
- Files changed: `docs/API.md`, `docs/architecture/relations/documentation-links.csv`, `.codex/tasks/luc-1326-prove-account-access-missing-doc-link-for-use-mcp.md`, `.codex/tasks/luc-1326-completion-evidence.md`, generated `docs/graphs/*`, generated `docs/status/*`, `.agents/state/active-mission.md`, `.agents/state/next-steps.md`, `.agents/state/module-confidence-ledger.md`, `.codex/context/TASK_BOARD.md`, and `.codex/context/PROJECT_STATE.md`.
- Commit status: no commit created in this lane.
- Push status: not pushed; source-control closure delegated to [LUC-1328](/LUC/issues/LUC-1328).
- Deploy impact: none.
- Residual risk: the docs-owned route gap narrows to `src/app.ts#/connection`; broader missing-test-link debt remains for other routed endpoints, starting with `src/app.ts#/notes`.
- Next owner: Test Automation Engineer + QA Regression Lead for `src/app.ts#/notes` `missing_test_link`; Documentation Steward follow-up remains only for `src/app.ts#/connection`; source-control closure for this packet is delegated to [LUC-1328](/LUC/issues/LUC-1328).
