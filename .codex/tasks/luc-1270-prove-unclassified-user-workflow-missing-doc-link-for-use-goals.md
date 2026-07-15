# Task

## Header
- ID: LUC-1270
- Title: Unclassified user workflow `USE /goals` doc-link closure
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: [LUC-1266](/LUC/issues/LUC-1266)
- Priority: P1
- Coverage Ledger Rows: Unclassified user workflow `src/app.ts#/goals` `missing_doc_link`
- Module Confidence Rows: `Goals documentation linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: unclassified route documentation-link drift for protected Goals aliases
- Iteration: 2026-07-15-LUC-1270
- Operation Mode: BUILDER
- Mission ID: LUC-1270-USE-GOALS-DOC-LINK
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
  `src/app.ts#/goals` by strengthening the accepted Goals API contract,
  linking the exact route mount to that contract, and refreshing generated
  truth artifacts.
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
`LUC-1266` already proved the exact `src/app.ts#/goals` endpoint family with
existing API tests and moved the same symbol from `missing_test_link` to
`missing_doc_link`. `docs/API.md` only listed the Goals aliases and sample
payload, but did not yet capture the actual protected contract strongly enough
for durable route-mount linkage and
`docs/architecture/relations/documentation-links.csv` had no exact row for the
mount.

## Goal
Document the protected `/v1/goals` and compatibility `/goals` route family
strongly enough for the graph to treat it as source-of-truth documentation,
link `src/app.ts#/goals` to that contract, refresh generated truth, and prove
the `missing_doc_link` row is cleared.

## Scope
- `docs/API.md`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1270-prove-unclassified-user-workflow-missing-doc-link-for-use-goals.md`
- `.codex/tasks/luc-1270-completion-evidence.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Implementation Plan
1. Confirm the generated first docs-owned gap is the exact `src/app.ts#/goals`
   `missing_doc_link` row.
2. Refine `docs/API.md` so the Goals section explicitly covers both `/v1` and
   compatibility aliases plus workspace scoping, newest-first reads, relation
   visibility checks, archive-on-delete semantics, and emitted lifecycle
   events.
3. Link `src/app.ts#/goals` to that contract in
   `docs/architecture/relations/documentation-links.csv`.
4. Refresh generated architecture-awareness, app-completion, and Project Truth
   outputs.
5. Update state files and issue evidence for the new routed gap after the
   exact row clears.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Project Truth routes `src/app.ts#/goals` as the first unclassified
  `missing_doc_link`.
- Gaps: the accepted API docs listed Goals endpoints but did not yet capture
  the actual protected route contract strongly enough for route-mount
  documentation linkage, and the exact route-mount relation was missing.
- Inconsistencies: route behavior and test proof already exist, but the
  generated completion index could not discover accepted docs for the exact
  mount.
- Architecture constraints: stay inside documentation and generated-truth
  artifacts only.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none blocking
- Sources scanned: `src/app.ts`, `src/modules/goals/goals.routes.ts`,
  `src/tests/api.test.ts`, `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`,
  `docs/status/app-completion-index.md`,
  `.agents/state/active-mission.md`, and `.agents/state/next-steps.md`.
- Rows created or corrected: `docs/architecture/relations/documentation-links.csv`
  now includes the exact `src/app.ts#/goals` documentation relation.
- Assumptions recorded: `docs/API.md` is the accepted source-of-truth surface
  for protected route contracts like Clients, Deals, Departments, Events, and
  Goals.
- Blocking unknowns: none
- Why it was safe to continue: the gap is documentation-link drift, not
  missing runtime evidence.

### 2. Select One Priority Mission Objective
- Selected task: `USE /goals` missing-doc-link closure.
- Priority rationale: it is the current routed Project Truth docs-owned gap
  for the unclassified user workflow.
- Why other candidates were deferred: they depend on the post-refresh queue
  and should stay separate if they remain.

### 3. Plan Implementation
- Files or surfaces to modify: `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`, this task packet,
  the sibling completion-evidence packet, generated truth artifacts, and
  narrow source-of-truth state summaries.
- Logic: strengthen the existing Goals API contract and attach the exact
  route-mount entity to that contract.
- Validation shape: refresh architecture-awareness first, then rebuild
  app-completion and Project Truth sequentially so readback uses the refreshed
  graph.
- Failure trigger: if the row persists, inspect whether the contract wording or
  documentation relation is still too weak.

### 4. Execute Implementation
- Implementation notes: `docs/API.md` now documents the protected
  `/v1/goals` routes alongside the compatibility `/goals` aliases,
  workspace-scoped newest-first reads, related `process` hydration,
  workspace-visible `projectId` and `processId` validation, archive-on-delete
  behavior, and emitted goal lifecycle events; the documentation-links
  registry now links the exact `src/app.ts#/goals` mount to that accepted API
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
  `api_endpoint:use-goals:da30547c55` as `missing_doc_link`, and Project Truth
  advances the first routed gap to `src/app.ts#/health`
  `missing_test_link` while leaving only user-configuration
  `src/app.ts#/connection` as the remaining docs-owned gap.

### 6. Self-Review
- Simpler option considered: add only the CSV row without strengthening the
  Goals API contract; rejected because the link would point to a weaker doc
  surface and could regress on the next graph rebuild.
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
  `/v1/goals` behavior plus the compatibility `/goals` alias.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact
  `src/app.ts#/goals` symbol to that doc.
- [x] Refreshed generated truth no longer reports `src/app.ts#/goals` as
  `missing_doc_link`.

## Definition Of Done
- [x] The exact endpoint doc-link closure is recorded in accepted
  documentation.
- [x] Generated truth artifacts are refreshed and inspected.
- [x] Source-of-truth state files are updated with the new routed gap.
- [x] Paperclip issue disposition includes completion evidence.

## Result Report
- Outcome: completed focused documentation-link closure for
  `src/app.ts#/goals`.
- Evidence added:
  - `docs/API.md`
  - `docs/architecture/relations/documentation-links.csv`
- Verification summary:
  - `npm run architecture:refresh` PASS
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`3063` entities / `7933` relations / `16523` files)
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`46` items / `4` flows / `23` missing test links / `1` missing doc link / `0` implemented-needs-proof / `0` blocked)
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` PASS at `2026-07-15T18:38:08.524Z` with public probes `pass`; first routed gap advanced to `src/app.ts#/health` `missing_test_link`
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`)
- Residual risk: the exact `/goals` doc gap is closed. The remaining docs-owned
  gap is user-configuration `src/app.ts#/connection`, while the first routed
  overall gap is `src/app.ts#/health` `missing_test_link`, which belongs to
  Test Automation Engineer + QA Regression Lead rather than this
  documentation lane. Source-control closure completed in
  [LUC-1273](/LUC/issues/LUC-1273).
