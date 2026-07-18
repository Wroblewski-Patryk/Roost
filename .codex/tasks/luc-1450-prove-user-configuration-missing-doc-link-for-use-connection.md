# Task

## Header
- ID: LUC-1450
- Title: User configuration `USE /connection` doc-link closure
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Documentation Steward
- Depends on: [LUC-1192](/LUC/issues/LUC-1192)
- Priority: P1
- Coverage Ledger Rows: User configuration `src/app.ts#/connection` `missing_doc_link`
- Module Confidence Rows: `Connection documentation linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: user configuration route documentation-link drift for the protected connection handshake
- Iteration: 2026-07-18-LUC-1450
- Operation Mode: BUILDER
- Mission ID: LUC-1450-USER-CONFIGURATION-USE-CONNECTION-DOC-LINK
- Mission Status: DONE

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task improves release confidence without changing runtime behavior.

## Mission Block
- Mission objective: close the routed Project Truth `missing_doc_link` gap for `src/app.ts#/connection` by linking the exact protected connection handshake mount to the accepted API contract and refreshing generated truth.
- Release objective advanced: remove the remaining docs-owned route gap without changing runtime behavior.
- Included slices: one documentation-links registry row, generated truth refresh, one completion-evidence packet, and narrow source-of-truth updates.
- Explicit exclusions: no route logic changes, no auth changes, no deploy, no production mutation, and no new test harness.
- Checkpoint cadence: confirm the docs-owned gap, patch the route-mount link, refresh the generated truth stack sequentially, then update state and issue evidence.
- Stop conditions: generated readback keeps the exact row after the doc-link patch, or the accepted connection contract proves too weak to cover the route behavior without runtime changes.
- Handoff expectation: close the issue if the row clears; otherwise route the residual exact blocker with evidence.

## Context
`LUC-1192` already proved the exact `src/app.ts#/connection` endpoint family with existing protected API tests and moved the same symbol from `missing_test_link` to `missing_doc_link`. `docs/API.md` already contains the accepted connection handshake contract for `GET /v1/connection` and `GET /connection`, but `docs/architecture/relations/documentation-links.csv` did not yet include the exact route-mount relation for `src/app.ts#/connection`.

## Goal
Link `src/app.ts#/connection` to the accepted connection handshake contract in `docs/API.md`, refresh generated truth, and prove the `missing_doc_link` row is cleared.

## Scope
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1450-prove-user-configuration-missing-doc-link-for-use-connection.md`
- `.codex/tasks/luc-1450-completion-evidence.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Implementation Plan
1. Confirm the generated docs-owned gap is the exact `src/app.ts#/connection` `missing_doc_link` row.
2. Confirm the accepted connection handshake contract already documents the protected `/v1/connection` route family closely enough to cover the mount.
3. Add one documentation-link relation from the exact route-mount path to `docs/API.md`.
4. Refresh generated architecture-awareness, app-completion, and Project Truth outputs.
5. Update state files and issue evidence for the new routed gap after the exact row clears.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Project Truth routes `src/app.ts#/connection` as the current User configuration `missing_doc_link` gap.
- Gaps: the accepted API docs already describe the protected connection handshake route family, but the exact route-mount relation was missing.
- Inconsistencies: route behavior and test proof already exist, but the generated completion index could not discover accepted docs for the exact mount.
- Architecture constraints: stay inside documentation, generated-truth artifacts, and source-of-truth state only.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none blocking
- Sources scanned: `src/app.ts`, `src/modules/connection/connection.routes.ts`, `docs/API.md`, `docs/architecture/relations/documentation-links.csv`, `docs/status/project-truth-index.md`, and `docs/status/app-completion-index.md`.
- Rows created or corrected: `docs/architecture/relations/documentation-links.csv` now includes the exact `src/app.ts#/connection` documentation relation.
- Assumptions recorded: `docs/API.md` is the accepted source-of-truth surface for the protected connection handshake contract and compatibility aliases.
- Blocking unknowns: none
- Why it was safe to continue: the gap is documentation-link drift, not missing runtime evidence.

### 2. Select One Priority Mission Objective
- Selected task: `USE /connection` missing-doc-link closure.
- Priority rationale: it is the current routed Project Truth docs-owned gap for the User configuration workflow.
- Why other candidates were deferred: they depend on the post-refresh queue and should stay separate if they remain.

### 3. Plan Implementation
- Files or surfaces to modify: `docs/architecture/relations/documentation-links.csv`, this task packet, the sibling completion-evidence packet, generated truth artifacts, and narrow source-of-truth state summaries.
- Logic: attach the exact protected route-mount entity to the existing accepted connection handshake API contract.
- Validation shape: refresh architecture-awareness first, then rebuild app-completion and Project Truth sequentially so readback uses the refreshed graph.
- Failure trigger: if the row persists, inspect whether the documentation relation or current connection contract coverage is still too weak.

### 4. Execute Implementation
- Implementation notes: the documentation-links registry now links the exact `src/app.ts#/connection` mount to the accepted `docs/API.md` connection handshake contract that already covers `/v1/connection` and `/connection`.

### 5. Verify and Test
- Validation planned:
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`

### 6. Self-Review
- Simpler option considered: add more prose to `docs/API.md`; rejected because the accepted connection handshake contract already exists and the missing exact route-mount relation was the only identified gap.
- Reuse check: reusing the same accepted API contract surface and documentation-links registry already used for nearby route-mount closures.
- Temporary-solution check: no workaround or placeholder wording added.

### 7. Update Documentation and Knowledge
- Docs updated: documentation-links registry, this task packet, the sibling completion-evidence packet, generated outputs, and narrow source-of-truth state summaries.
- Context updated: yes
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] An accepted source-of-truth doc already explicitly describes the protected `/connection` and `/v1/connection` route family.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact `src/app.ts#/connection` symbol to that doc.
- [x] Refreshed generated truth no longer reports `src/app.ts#/connection` as `missing_doc_link`.

## Definition Of Done
- [x] The exact endpoint doc-link closure is recorded in accepted documentation.
- [x] Generated truth artifacts are refreshed and inspected.
- [x] Source-of-truth state files are updated with the new routed gap.
- [x] Paperclip issue disposition includes completion evidence.

## Result Report
- Outcome: completed focused documentation-link closure for `src/app.ts#/connection`.
- Evidence added:
  - `docs/architecture/relations/documentation-links.csv`
  - `.codex/tasks/luc-1450-completion-evidence.md`
- Verification summary:
  - `npm run architecture:refresh` PASS
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`3112` entities / `8367` relations / `16524` files)
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacije/Roost` PASS (`46` items / `4` flows / `11` missing test links / `0` missing doc links / `0` implemented-needs-proof / `0` blocked)
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` PASS with public probes `pass`; first routed gap advanced to `src/app.ts#/relationships` `missing_test_link`
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`, evidence queue `0`, chain worklist `0`)
- Residual risk: the exact `/connection` doc gap is cleared; the next routed proof gap is the QA-owned `src/app.ts#/relationships` `missing_test_link`.
