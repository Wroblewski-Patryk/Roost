# Task

## Header
- ID: LUC-1252
- Title: Unclassified user workflow `USE /departments` doc-link closure
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: [LUC-1239](/LUC/issues/LUC-1239)
- Priority: P1
- Coverage Ledger Rows: Unclassified user workflow `src/app.ts#/departments` `missing_doc_link`
- Module Confidence Rows: `Departments documentation linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: unclassified route documentation-link drift for protected Departments aliases
- Iteration: 2026-07-15-LUC-1252
- Operation Mode: BUILDER
- Mission ID: LUC-1252-USE-DEPARTMENTS-DOC-LINK
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
- [x] The task improves release confidence without changing product runtime behavior.

## Mission Block
- Mission objective: close the routed Project Truth `missing_doc_link` gap for
  `src/app.ts#/departments` by strengthening the accepted Departments API
  contract, linking the exact route mount to that contract, and refreshing
  generated truth artifacts.
- Release objective advanced: remove the current unclassified documentation
  gap without changing runtime behavior.
- Included slices: one API-contract refinement, one documentation-links
  registry row, generated truth refresh, one completion-evidence packet, and
  narrow source-of-truth state updates.
- Explicit exclusions: no route or middleware logic changes, no protected
  runtime smoke, no deployment, no production mutation, and no new test
  harness.
- Checkpoint cadence: confirm the exact row, patch accepted docs, refresh the
  generated truth stack sequentially, then update state and issue evidence.
- Stop conditions: generated readback keeps the exact row after the doc-link
  patch, or the accepted API contract proves too weak to cover the route
  behavior without runtime changes.
- Handoff expectation: close the issue if the row clears; otherwise route the
  residual exact blocker with evidence.

## Context
`LUC-1239` already proved the exact `src/app.ts#/departments` endpoint family
with existing API tests and moved the same symbol from `missing_test_link` to
`missing_doc_link`. `docs/API.md` did not yet include a Departments contract,
and `docs/architecture/relations/documentation-links.csv` had no exact row for
the mount.

## Goal
Document the protected `/v1/departments` and compatibility `/departments`
route family strongly enough for the graph to treat it as source-of-truth
documentation, link `src/app.ts#/departments` to that contract, refresh
generated truth, and prove the `missing_doc_link` row is cleared.

## Scope
- `docs/API.md`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1252-prove-unclassified-user-workflow-missing-doc-link-for-use-departments.md`
- `.codex/tasks/luc-1252-completion-evidence.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Implementation Plan
1. Confirm the generated first gap is the exact `src/app.ts#/departments`
   `missing_doc_link` row.
2. Refine `docs/API.md` so the Departments section explicitly covers both `/v1`
   and compatibility aliases plus default catalog hydration, workspace scoping,
   approved linked-view validation, and shared response semantics.
3. Link `src/app.ts#/departments` to that contract in
   `docs/architecture/relations/documentation-links.csv`.
4. Refresh generated architecture-awareness, app-completion, and Project Truth
   outputs.
5. Update state files and issue evidence for the new routed gap after the
   exact row clears.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Project Truth routes `src/app.ts#/departments` as the first
  unclassified `missing_doc_link`.
- Gaps: the accepted API docs did not list Departments endpoints, and the exact
  route-mount relation was missing.
- Inconsistencies: route behavior and test proof already exist, but the
  generated completion index could not discover accepted docs for the exact
  mount.
- Architecture constraints: stay inside documentation and generated-truth
  artifacts only.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none blocking
- Sources scanned: `src/app.ts`, `src/modules/departments/departments.routes.ts`,
  `src/tests/api.test.ts`, `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`,
  `docs/status/app-completion-index.json`,
  `docs/status/project-truth-index.json`,
  `.agents/state/active-mission.md`, `.agents/state/current-focus.md`, and
  `.agents/state/next-steps.md`.
- Rows created or corrected: `docs/architecture/relations/documentation-links.csv`
  now includes the exact `src/app.ts#/departments` documentation relation.
- Assumptions recorded: `docs/API.md` is the accepted source-of-truth surface
  for protected route contracts like Clients, Deals, Decisions, and
  Departments.
- Blocking unknowns: none
- Why it was safe to continue: the gap is documentation-link drift, not
  missing runtime evidence.

### 2. Select One Priority Mission Objective
- Selected task: `USE /departments` missing-doc-link closure.
- Priority rationale: it is the current routed Project Truth gap for the
  unclassified user workflow.
- Why other candidates were deferred: they depend on the post-refresh queue
  and should stay separate if they remain.

### 3. Plan Implementation
- Files or surfaces to modify: `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`, this task packet,
  the sibling completion-evidence packet, generated truth artifacts, and
  narrow source-of-truth state summaries.
- Logic: add the missing Departments API contract and attach the exact
  route-mount entity to that contract.
- Validation shape: refresh architecture-awareness first, then rebuild
  app-completion and Project Truth sequentially so readback uses the refreshed
  graph.
- Failure trigger: if the row persists, inspect whether the contract wording or
  documentation relation is still too weak.

### 4. Execute Implementation
- Implementation notes: `docs/API.md` now documents the protected
  `/v1/departments` routes alongside the compatibility `/departments` aliases,
  default catalog hydration, workspace scoping, approved linked-view
  validation, and shared response semantics; the documentation-links registry
  now links the exact `src/app.ts#/departments` mount to that accepted API
  contract.

### 5. Verify and Test
- Validation planned:
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`
- Result: PASS. Refreshed architecture-awareness materialized the exact
  documentation relation, app-completion no longer reports
  `api_endpoint:use-departments:876f72fd71` as `missing_doc_link`, and Project
  Truth advances the first routed gap to `src/app.ts#/events`
  `missing_test_link`.

### 6. Self-Review
- Simpler option considered: add only the CSV row without adding the
  Departments API contract; rejected because the link would point to a weaker
  or missing doc surface and could regress on the next graph rebuild.
- Reuse check: reusing the same accepted API contract surface and
  documentation-links registry already used for nearby route-mount closures.
- Temporary-solution check: no workaround or placeholder wording added.
- Refinements made: none beyond narrowing the doc text to the actual route
  behavior.

### 7. Update Documentation and Knowledge
- Docs updated: `docs/API.md`, documentation-links registry, this task packet,
  the sibling completion-evidence packet, generated outputs, and narrow
  source-of-truth state summaries.
- Context updated: yes
- Learning journal updated: not applicable

## Acceptance Criteria
- [x] An accepted source-of-truth doc explicitly describes protected
  `/v1/departments` behavior plus the compatibility `/departments` aliases.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact
  `src/app.ts#/departments` symbol to that doc.
- [x] Refreshed generated truth no longer reports `src/app.ts#/departments` as
  `missing_doc_link`.

## Definition Of Done
- [x] The exact endpoint doc-link closure is recorded in accepted
  documentation.
- [x] Generated truth artifacts are refreshed and inspected.
- [x] Source-of-truth state files are updated with the new routed gap.
- [x] Paperclip issue disposition includes completion evidence.

## Result Report
- Outcome: completed focused documentation-link closure for
  `src/app.ts#/departments`.
- Evidence added:
  - `docs/API.md`
  - `docs/architecture/relations/documentation-links.csv`
- Verification summary:
  - `npm run architecture:refresh` PASS
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`3054` entities / `7859` relations / `16523` files)
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`46` items / `4` flows / `25` missing test links / `1` missing doc link / `0` implemented-needs-proof / `0` blocked)
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` PASS at `2026-07-15T16:37:35.736Z` with public probes `pass`; first routed gap advanced to `src/app.ts#/events` `missing_test_link`
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`)
- Residual risk: the exact `/departments` doc gap is closed. The remaining
  docs-owned gap is user-configuration `src/app.ts#/connection`, while the
  first routed overall verification gap is `src/app.ts#/events`
  `missing_test_link`, which belongs to Test Automation Engineer + QA
  Regression Lead rather than this documentation lane.
